/**
 * Asana API helpers + status mapping.
 *
 * Status mapping (documented):
 * - Inbound: Asana completed=true → ChangeView `done`;
 *   completed=false → `in_progress` (active work under a parent ticket).
 * - Outbound: ChangeView `done` → Asana completed=true; any other status → completed=false.
 *   (Asana has no backlog/ready/blocked equivalent; those stay incomplete on Asana.)
 *
 * Conflict policy: last-write-wins by timestamp (Asana modified_at vs tasks.updated_at).
 * Echo suppression: inbound events within ECHO_WINDOW_MS of last_outbound_at are skipped.
 */

import { decryptIntegrationToken, encryptIntegrationToken } from './_integrationCrypto.js';

export const ASANA_API = 'https://app.asana.com/api/1.0';
export const ASANA_AUTH = 'https://app.asana.com/-/oauth_authorize';
export const ASANA_TOKEN = 'https://app.asana.com/-/oauth_token';
export const ECHO_WINDOW_MS = 8_000;

export function asanaClientId() {
  return process.env.ASANA_CLIENT_ID || '';
}

export function asanaClientSecret() {
  return process.env.ASANA_CLIENT_SECRET || '';
}

export function asanaRedirectUri(origin) {
  if (process.env.ASANA_REDIRECT_URI) return process.env.ASANA_REDIRECT_URI;
  const base = String(origin || process.env.APP_ORIGIN || 'http://localhost:5173').replace(/\/$/, '');
  return `${base}/api/integrations/asana/callback`;
}

export function asanaCompletedToCvStatus(completed) {
  return completed ? 'done' : 'in_progress';
}

export function cvStatusToAsanaCompleted(status) {
  return status === 'done';
}

export function parseAsanaTaskGid(input) {
  const raw = String(input || '').trim();
  if (!raw) return null;
  if (/^\d+$/.test(raw)) return raw;
  try {
    const url = new URL(raw);
    // Modern: .../task/1234567890
    const taskIdx = url.pathname.split('/').indexOf('task');
    if (taskIdx >= 0 && url.pathname.split('/')[taskIdx + 1]) {
      const gid = url.pathname.split('/')[taskIdx + 1].replace(/\D/g, '');
      if (gid) return gid;
    }
    // Legacy: /0/{project}/{task}
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts[0] === '0' && parts.length >= 3 && /^\d+$/.test(parts[2])) {
      return parts[2];
    }
  } catch {
    /* not a URL */
  }
  const digits = raw.match(/(\d{6,})/);
  return digits ? digits[1] : null;
}

export async function asanaFetch(accessToken, path, { method = 'GET', body, headers } = {}) {
  const res = await fetch(`${ASANA_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(headers || {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = json?.errors?.[0]?.message || json?.error || `Asana API ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.asana = json;
    throw err;
  }
  return json;
}

export async function exchangeAsanaCode(code, redirectUri) {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: asanaClientId(),
    client_secret: asanaClientSecret(),
    redirect_uri: redirectUri,
    code,
  });
  const res = await fetch(ASANA_TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error_description || json.error || 'Asana token exchange failed');
  }
  return json;
}

export async function refreshAsanaToken(refreshToken) {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: asanaClientId(),
    client_secret: asanaClientSecret(),
    refresh_token: refreshToken,
  });
  const res = await fetch(ASANA_TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error_description || json.error || 'Asana token refresh failed');
  }
  return json;
}

/** Load integration row for this ChangeView workspace, refresh token if needed. */
export async function getValidAsanaAccess(admin, { accountId, workspaceId }) {
  if (!workspaceId) throw new Error('workspaceId is required for Asana access');

  const { data: integration, error } = await admin
    .from('integrations')
    .select('*')
    .eq('account_id', accountId)
    .eq('workspace_id', workspaceId)
    .eq('provider', 'asana')
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!integration || integration.status !== 'connected') {
    throw new Error('Asana is not connected for this workspace');
  }

  let accessToken = decryptIntegrationToken(integration.access_token_encrypted);
  const refreshToken = decryptIntegrationToken(integration.refresh_token_encrypted);
  const expiresAt = integration.token_expires_at ? new Date(integration.token_expires_at).getTime() : 0;
  const needsRefresh = !accessToken || !expiresAt || expiresAt < Date.now() + 60_000;

  if (needsRefresh) {
    if (!refreshToken) throw new Error('Asana session expired — reconnect');
    const refreshed = await refreshAsanaToken(refreshToken);
    accessToken = refreshed.access_token;
    const encAccess = encryptIntegrationToken(refreshed.access_token);
    const encRefresh = refreshed.refresh_token
      ? encryptIntegrationToken(refreshed.refresh_token)
      : integration.refresh_token_encrypted;
    const tokenExpiresAt = refreshed.expires_in
      ? new Date(Date.now() + refreshed.expires_in * 1000).toISOString()
      : null;
    const { data: updated, error: upErr } = await admin
      .from('integrations')
      .update({
        access_token_encrypted: encAccess,
        refresh_token_encrypted: encRefresh,
        token_expires_at: tokenExpiresAt,
        updated_at: new Date().toISOString(),
        status: 'connected',
      })
      .eq('id', integration.id)
      .select('*')
      .single();
    if (upErr) throw new Error(upErr.message);
    return { integration: updated, accessToken };
  }

  return { integration, accessToken };
}

export function isEchoOfOutbound(lastOutboundAt, windowMs = ECHO_WINDOW_MS) {
  if (!lastOutboundAt) return false;
  const t = new Date(lastOutboundAt).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t < windowMs;
}

export function lastWriteWins({ remoteModifiedAt, localUpdatedAt }) {
  const remote = remoteModifiedAt ? new Date(remoteModifiedAt).getTime() : 0;
  const local = localUpdatedAt ? new Date(localUpdatedAt).getTime() : 0;
  // Prefer remote when equal or newer (inbound path).
  return remote >= local ? 'remote' : 'local';
}

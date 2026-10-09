import crypto from 'crypto';
import { adminClient } from '../../_adminAuth.js';
import {
  asanaRedirectUri,
  exchangeAsanaCode,
  asanaFetch,
} from '../../_asanaClient.js';
import { encryptIntegrationToken, integrationEncryptionKey } from '../../_integrationCrypto.js';

function verifyState(state) {
  const [body, sig] = String(state || '').split('.');
  if (!body || !sig) return null;
  const expected = crypto.createHmac('sha256', integrationEncryptionKey()).update(body).digest('base64url');
  if (sig !== expected) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!payload?.accountId || !payload?.workspaceId || !payload?.exp || payload.exp < Date.now()) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

/**
 * Asana OAuth callback — exchanges code, upserts encrypted tokens on the
 * ChangeView workspace carried in OAuth state (unique per workspace + provider).
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.end('Method not allowed');
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const oauthError = url.searchParams.get('error');

  const payload = verifyState(state);
  const appOrigin = payload?.origin || process.env.APP_ORIGIN || 'http://localhost:5173';
  const fail = (msg) => {
    res.writeHead(302, {
      Location: `${appOrigin}/app?integrations=asana&error=${encodeURIComponent(msg)}`,
    });
    res.end();
  };

  if (oauthError) return fail(oauthError);
  if (!code || !payload) return fail('Invalid or expired OAuth state');

  const admin = adminClient();
  if (!admin) return fail('Service not configured');

  try {
    const { data: ws } = await admin
      .from('workspaces')
      .select('id')
      .eq('id', payload.workspaceId)
      .eq('account_id', payload.accountId)
      .maybeSingle();
    if (!ws) return fail('Workspace from OAuth state not found');

    const redirectUri = asanaRedirectUri(appOrigin);
    const tokens = await exchangeAsanaCode(code, redirectUri);
    const accessToken = tokens.access_token;
    const me = await asanaFetch(accessToken, '/users/me?opt_fields=gid,name,email,workspaces,workspaces.name');
    const user = me.data;
    const asanaWorkspaceGid = user.workspaces?.[0]?.gid || null;

    const encAccess = encryptIntegrationToken(accessToken);
    const encRefresh = tokens.refresh_token
      ? encryptIntegrationToken(tokens.refresh_token)
      : null;
    const tokenExpiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : null;

    const row = {
      account_id: payload.accountId,
      workspace_id: payload.workspaceId,
      provider: 'asana',
      status: 'connected',
      access_token_encrypted: encAccess,
      refresh_token_encrypted: encRefresh,
      token_expires_at: tokenExpiresAt,
      external_workspace_id: asanaWorkspaceGid,
      external_user_id: user.gid || null,
      external_user_name: user.name || user.email || null,
      metadata: {
        workspaces: (user.workspaces || []).map((w) => ({ gid: w.gid, name: w.name })),
      },
      updated_at: new Date().toISOString(),
    };

    // Unique (workspace_id, provider) — reconnect updates the existing row.
    const { error } = await admin
      .from('integrations')
      .upsert(row, { onConflict: 'workspace_id,provider' });

    if (error) return fail(error.message);

    res.writeHead(302, {
      Location: `${appOrigin}/app?integrations=asana&connected=1`,
    });
    res.end();
  } catch (err) {
    console.error('[asana/callback]', err);
    return fail(err.message || 'Asana connect failed');
  }
}

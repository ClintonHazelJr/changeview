/** Client helpers for Asana integration API routes. */

async function authFetch(path, { accessToken, method = 'POST', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const res = await fetch(path, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export function startAsanaConnect(accessToken) {
  return authFetch('/api/integrations/asana/authorize', { accessToken }).then((data) => {
    if (!data.url) throw new Error('No authorize URL returned');
    window.location.href = data.url;
  });
}

export async function fetchAsanaStatus(accessToken) {
  const headers = {};
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const res = await fetch('/api/integrations/asana/status', { method: 'GET', headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export function disconnectAsana(accessToken) {
  return authFetch('/api/integrations/asana/disconnect', { accessToken });
}

export function searchAsanaTasks(accessToken, query) {
  return authFetch('/api/integrations/asana/search-tasks', { accessToken, body: { query } });
}

export function linkAsanaParent(accessToken, { initiativeId, workspaceId, externalId }) {
  return authFetch('/api/integrations/asana/link-parent', {
    accessToken,
    body: { initiativeId, workspaceId, externalId },
  });
}

export function unlinkAsanaParent(accessToken, parentLinkId) {
  return authFetch('/api/integrations/asana/unlink-parent', {
    accessToken,
    body: { parentLinkId },
  });
}

export function importAsanaSubtasks(accessToken, parentLinkId) {
  return authFetch('/api/integrations/asana/import', {
    accessToken,
    body: { parentLinkId },
  });
}

/** Fire-and-forget friendly; returns result or null on skip/failure. */
export async function syncTaskOutbound(accessToken, taskId) {
  try {
    return await authFetch('/api/integrations/asana/sync-outbound', {
      accessToken,
      body: { taskId },
    });
  } catch (err) {
    console.warn('[asana outbound]', err.message);
    return null;
  }
}

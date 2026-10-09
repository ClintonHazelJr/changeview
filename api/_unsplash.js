/**
 * Shared Unsplash server helpers. Access key never leaves this module.
 */

export function unsplashAccessKey() {
  // Server-only. Never use VITE_/NEXT_PUBLIC_ — those would ship to the browser.
  return String(process.env.UNSPLASH_ACCESS_KEY || '').trim();
}

export function unsplashConfigured() {
  return unsplashAccessKey().length > 0;
}

/** Clear JSON payload when the server key is missing. Never includes the key. */
export function missingUnsplashKeyResponse() {
  return {
    status: 503,
    body: {
      error: 'Unsplash is not configured. Set UNSPLASH_ACCESS_KEY in the server environment (local .env.local or Vercel env), then restart/redeploy. Do not use a VITE_ prefix.',
    },
  };
}

export function unsplashAuthHeaders() {
  return {
    Authorization: `Client-ID ${unsplashAccessKey()}`,
    'Accept-Version': 'v1',
  };
}

/** Download tracking URLs must be Unsplash photo download endpoints. */
export function isValidUnsplashDownloadLocation(value) {
  const raw = String(value || '').trim();
  if (!raw.startsWith('https://api.unsplash.com/photos/')) return false;
  try {
    const u = new URL(raw);
    if (u.protocol !== 'https:') return false;
    if (u.hostname !== 'api.unsplash.com') return false;
    return /^\/photos\/[^/]+\/download\/?$/.test(u.pathname);
  } catch {
    return false;
  }
}

/** Safe error message for clients — strips anything that looks like a secret. */
export function safeErrorMessage(err, fallback = 'Unexpected server error.') {
  const raw = String(err?.message || err || fallback);
  if (/Client-ID|UNSPLASH_ACCESS_KEY|sk-|secret/i.test(raw)) return fallback;
  return raw.slice(0, 400) || fallback;
}

/** Parse Unsplash error JSON into a short message. Never includes the access key. */
export async function readUnsplashError(upstream) {
  try {
    const body = await upstream.json();
    if (Array.isArray(body?.errors) && body.errors[0]) return String(body.errors[0]).slice(0, 200);
    if (body?.error) return String(body.error).slice(0, 200);
  } catch {
    /* ignore */
  }
  return `Unsplash request failed (HTTP ${upstream.status}).`;
}

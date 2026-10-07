/**
 * Shared Unsplash server helpers. Access key never leaves this module.
 */

export function unsplashAccessKey() {
  return String(process.env.UNSPLASH_ACCESS_KEY || '').trim();
}

export function unsplashConfigured() {
  return unsplashAccessKey().length > 0;
}

export function unsplashAuthHeaders() {
  return {
    Authorization: `Client-ID ${unsplashAccessKey()}`,
    'Accept-Version': 'v1',
  };
}

/** True only for Unsplash photo download tracking URLs (path ends with /download). */
export function isValidUnsplashDownloadLocation(value) {
  try {
    const u = new URL(String(value || ''));
    if (u.protocol !== 'https:') return false;
    if (u.hostname !== 'api.unsplash.com') return false;
    return /^\/photos\/[^/]+\/download\/?$/.test(u.pathname);
  } catch {
    return false;
  }
}

export function mapUnsplashRateLimit(status) {
  if (status === 403 || status === 429) {
    return { status: 429, error: 'Unsplash rate limit reached. Try again later.' };
  }
  return null;
}

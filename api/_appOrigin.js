/** Build auth callback URL from a known origin (server-side). */
export function authCallbackUrlFromOrigin(origin, nextPath = '/app') {
  const base = String(origin || '').replace(/\/$/, '') || 'https://changeview.app';
  const url = new URL('/auth/callback', `${base}/`);
  if (nextPath && nextPath !== '/app') {
    url.searchParams.set('next', nextPath);
  }
  return url.toString();
}

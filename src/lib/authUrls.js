/** Absolute origin for Auth redirects (browser only). */
export function appOrigin() {
  if (typeof window === 'undefined') return '';
  return window.location.origin;
}

/** Shared callback for signup confirm, recovery, magic links. */
export function authCallbackUrl(nextPath = '/app') {
  const url = new URL('/auth/callback', appOrigin());
  if (nextPath && nextPath !== '/app') {
    url.searchParams.set('next', nextPath);
  }
  return url.toString();
}

export function acceptInviteUrl() {
  return `${appOrigin()}/accept-invite`;
}

/** True when the current URL looks like a Supabase Auth redirect payload. */
export function hasAuthRedirectParams() {
  if (typeof window === 'undefined') return false;
  const q = new URLSearchParams(window.location.search);
  const hash = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : window.location.hash;
  const h = new URLSearchParams(hash);
  return Boolean(
    q.get('code')
    || q.get('token_hash')
    || h.get('access_token')
    || h.get('refresh_token')
    || h.get('type'),
  );
}

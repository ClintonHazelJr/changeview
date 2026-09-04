/**
 * Simple in-memory sliding-window rate limiter for serverless handlers.
 * Per-instance only (Vercel), but enough to blunt abuse on unauthenticated forms.
 */
const buckets = new Map();

export function clientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  const real = req.headers['x-real-ip'];
  if (typeof real === 'string' && real.trim()) return real.trim();
  return req.socket?.remoteAddress || 'unknown';
}

/**
 * @param {string} key
 * @param {{ limit?: number, windowMs?: number }} opts
 * @returns {{ ok: boolean, remaining: number, retryAfterSec: number, limit: number }}
 */
export function consumeRateLimit(key, { limit = 5, windowMs = 60 * 60 * 1000 } = {}) {
  const now = Date.now();
  let entry = buckets.get(key);
  if (!entry || now - entry.windowStart >= windowMs) {
    entry = { windowStart: now, count: 0 };
    buckets.set(key, entry);
  }
  entry.count += 1;
  const retryAfterSec = Math.max(1, Math.ceil((windowMs - (now - entry.windowStart)) / 1000));
  if (entry.count > limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSec,
      limit,
    };
  }
  return {
    ok: true,
    remaining: limit - entry.count,
    retryAfterSec,
    limit,
  };
}

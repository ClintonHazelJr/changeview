import {
  blogAdminConfigured,
  blogAdminPassword,
  createSessionToken,
  readAdminSession,
  sessionCookieHeader,
  clearSessionCookieHeader,
  setBlogAdminCors,
} from '../../_blogAuth.js';
import { clientIp, consumeRateLimit } from '../../_rateLimit.js';
import crypto from 'crypto';

export default async function handler(req, res) {
  setBlogAdminCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    return res.status(200).json({
      configured: blogAdminConfigured(),
      authenticated: readAdminSession(req),
    });
  }

  if (req.method === 'POST') {
    const ip = clientIp(req);
    const limit = consumeRateLimit(`blog-admin-login:${ip}`, {
      limit: 10,
      windowMs: 60 * 60 * 1000,
    });
    if (!limit.ok) {
      res.setHeader('Retry-After', String(limit.retryAfterSec));
      return res.status(429).json({ error: 'Too many attempts. Try again later.' });
    }

    if (!blogAdminConfigured()) {
      return res.status(503).json({ error: 'Blog admin is not configured (BLOG_ADMIN_PASSWORD).' });
    }

    const password = String(req.body?.password || '');
    const expected = blogAdminPassword();
    const a = crypto.createHash('sha256').update(password).digest();
    const b = crypto.createHash('sha256').update(expected).digest();
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return res.status(401).json({ error: 'Incorrect password.' });
    }

    const token = createSessionToken();
    res.setHeader('Set-Cookie', sessionCookieHeader(token));
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'DELETE') {
    res.setHeader('Set-Cookie', clearSessionCookieHeader());
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

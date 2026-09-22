import crypto from 'crypto';

const COOKIE_NAME = 'cv_blog_admin';
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

export function blogAdminPassword() {
  return String(process.env.BLOG_ADMIN_PASSWORD || '').trim();
}

export function blogAdminConfigured() {
  return blogAdminPassword().length >= 16;
}

function signingKey() {
  return crypto.createHash('sha256').update(`blog-admin:${blogAdminPassword()}`).digest();
}

export function createSessionToken() {
  const payload = {
    v: 1,
    exp: Date.now() + SESSION_TTL_MS,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', signingKey()).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifySessionToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return false;
  const [body, sig] = token.split('.');
  if (!body || !sig) return false;
  const expected = crypto.createHmac('sha256', signingKey()).update(body).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!payload?.exp || Date.now() > Number(payload.exp)) return false;
    return true;
  } catch {
    return false;
  }
}

export function parseCookies(req) {
  const header = req.headers?.cookie;
  if (!header) return {};
  const out = {};
  for (const part of String(header).split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    out[key] = decodeURIComponent(val);
  }
  return out;
}

export function readAdminSession(req) {
  if (!blogAdminConfigured()) return false;
  const cookies = parseCookies(req);
  return verifySessionToken(cookies[COOKIE_NAME]);
}

export function sessionCookieHeader(token) {
  const secure = process.env.NODE_ENV === 'production' || process.env.VERCEL ? '; Secure' : '';
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}${secure}`;
}

export function clearSessionCookieHeader() {
  const secure = process.env.NODE_ENV === 'production' || process.env.VERCEL ? '; Secure' : '';
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

export function setBlogAdminCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
}

export function requireBlogAdmin(req, res) {
  if (!blogAdminConfigured()) {
    res.status(503).json({ error: 'Blog admin is not configured (BLOG_ADMIN_PASSWORD).' });
    return false;
  }
  if (!readAdminSession(req)) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  return true;
}

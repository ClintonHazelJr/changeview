import { adminClient } from './_adminAuth.js';
import { clientIp, consumeRateLimit } from './_rateLimit.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Keep in sync with src/content/blogPosts.js */
const ALLOWED_SLUGS = new Set([
  'ocm-vs-dap-vs-itsm',
  'change-compass-alternative',
  'pricing-comparison',
  'servicenow-vs-ocm',
  'ai-and-change-management',
  'state-of-change-management',
  'change-management-systems',
  'change-managers-no-systems',
  'how-to-scope-impact',
]);

const MAX_NAME = 80;
const MAX_EMAIL = 160;
const MAX_COMMENT = 2000;

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function normalizeSlug(value) {
  return String(value || '').trim().toLowerCase();
}

/**
 * Public blog comments: list approved (GET) and submit for moderation (POST).
 * Rate-limited: 5 attempts / hour / IP on POST.
 * Honeypot: filled "website" field → silent fake success.
 */
export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    return listComments(req, res);
  }
  if (req.method === 'POST') {
    return submitComment(req, res);
  }
  return res.status(405).json({ error: 'Method not allowed' });
}

async function listComments(req, res) {
  const slug = normalizeSlug(req.query?.slug);
  if (!slug || !SLUG_RE.test(slug) || !ALLOWED_SLUGS.has(slug)) {
    return res.status(400).json({ error: 'Invalid post.' });
  }

  const admin = adminClient();
  if (!admin) {
    return res.status(500).json({ error: 'Service not configured (SUPABASE_SERVICE_ROLE_KEY)' });
  }

  const { data, error } = await admin
    .from('blog_comments')
    .select('id, author_name, comment_text, created_at')
    .eq('post_slug', slug)
    .eq('approved', true)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[blog-comments] list failed', error.message);
    return res.status(500).json({ error: 'Could not load comments.' });
  }

  return res.status(200).json({ comments: data || [] });
}

async function submitComment(req, res) {
  const ip = clientIp(req);
  const limitResult = consumeRateLimit(`blog-comments:${ip}`, {
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });
  console.log('[blog-comments] rate-limit check', {
    ip,
    ok: limitResult.ok,
    remaining: limitResult.remaining,
    limit: limitResult.limit,
  });
  if (!limitResult.ok) {
    res.setHeader('Retry-After', String(limitResult.retryAfterSec));
    return res.status(429).json({
      error: 'Too many comments. Try again in an hour.',
      rateLimited: true,
    });
  }

  // Honeypot: bots fill this; humans never see it. Silent success.
  const honeypot = String(req.body?.website || '').trim();
  if (honeypot) {
    console.log('[blog-comments] honeypot trip', { ip });
    return res.status(200).json({ ok: true, pending: true });
  }

  const postSlug = normalizeSlug(req.body?.postSlug || req.body?.post_slug);
  const authorName = String(req.body?.authorName || req.body?.author_name || '').trim();
  const authorEmail = String(req.body?.authorEmail || req.body?.author_email || '')
    .trim()
    .toLowerCase();
  const commentText = String(req.body?.commentText || req.body?.comment_text || '').trim();

  if (!postSlug || !SLUG_RE.test(postSlug) || !ALLOWED_SLUGS.has(postSlug)) {
    return res.status(400).json({ error: 'Invalid post.' });
  }
  if (!authorName || authorName.length > MAX_NAME) {
    return res.status(400).json({ error: 'Enter a name (up to 80 characters).' });
  }
  if (!EMAIL_RE.test(authorEmail) || authorEmail.length > MAX_EMAIL) {
    return res.status(400).json({ error: 'Enter a valid email address.' });
  }
  if (!commentText || commentText.length > MAX_COMMENT) {
    return res.status(400).json({ error: 'Enter a comment (up to 2000 characters).' });
  }

  const admin = adminClient();
  if (!admin) {
    return res.status(500).json({ error: 'Service not configured (SUPABASE_SERVICE_ROLE_KEY)' });
  }

  const { error } = await admin.from('blog_comments').insert({
    post_slug: postSlug,
    author_name: authorName,
    author_email: authorEmail,
    comment_text: commentText,
    approved: false,
  });

  if (error) {
    console.error('[blog-comments] insert failed', error.message);
    return res.status(500).json({ error: 'Could not submit comment.' });
  }

  return res.status(200).json({ ok: true, pending: true });
}

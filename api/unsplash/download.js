import { requireBlogAdmin, setBlogAdminCors } from '../_blogAuth.js';
import {
  isValidUnsplashDownloadLocation,
  mapUnsplashRateLimit,
  unsplashAuthHeaders,
  unsplashConfigured,
} from '../_unsplash.js';

/**
 * POST /api/unsplash/download
 * Body: { downloadLocation }
 * Blog-admin only. Triggers Unsplash download tracking; not an open proxy.
 */
export default async function handler(req, res) {
  setBlogAdminCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!requireBlogAdmin(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!unsplashConfigured()) {
    return res.status(503).json({ error: 'Unsplash is not configured (UNSPLASH_ACCESS_KEY).' });
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const downloadLocation = String(body.downloadLocation || '').trim();

  if (!isValidUnsplashDownloadLocation(downloadLocation)) {
    return res.status(400).json({
      error: 'Invalid download location. Expected an Unsplash photos/.../download URL.',
    });
  }

  let upstream;
  try {
    upstream = await fetch(downloadLocation, { headers: unsplashAuthHeaders() });
  } catch (err) {
    console.error('[unsplash/download] network error', err?.message || err);
    return res.status(502).json({ error: 'Could not reach Unsplash.' });
  }

  const rate = mapUnsplashRateLimit(upstream.status);
  if (rate) return res.status(rate.status).json({ error: rate.error });

  if (!upstream.ok) {
    console.error('[unsplash/download] upstream status', upstream.status);
    return res.status(502).json({ error: 'Unsplash download tracking failed.' });
  }

  // Response body intentionally ignored — Unsplash only requires the GET.
  try {
    await upstream.arrayBuffer();
  } catch {
    /* ignore */
  }

  return res.status(200).json({ ok: true });
}

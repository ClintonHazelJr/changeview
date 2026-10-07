import { requireBlogAdmin, setBlogAdminCors } from '../_blogAuth.js';
import {
  mapUnsplashRateLimit,
  unsplashAuthHeaders,
  unsplashConfigured,
} from '../_unsplash.js';

/**
 * GET /api/unsplash/search?query=...&page=1
 * Blog-admin only. Proxies Unsplash search; never exposes the access key.
 */
export default async function handler(req, res) {
  setBlogAdminCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!requireBlogAdmin(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  if (!unsplashConfigured()) {
    return res.status(503).json({ error: 'Unsplash is not configured (UNSPLASH_ACCESS_KEY).' });
  }

  const query = String(req.query?.query || '').trim();
  const page = Math.max(1, Number(req.query?.page) || 1);
  if (!query) {
    return res.status(400).json({ error: 'Enter a search query.' });
  }

  const url = new URL('https://api.unsplash.com/search/photos');
  url.searchParams.set('query', query);
  url.searchParams.set('page', String(page));
  url.searchParams.set('per_page', '12');
  url.searchParams.set('orientation', 'landscape');

  let upstream;
  try {
    upstream = await fetch(url.toString(), { headers: unsplashAuthHeaders() });
  } catch (err) {
    console.error('[unsplash/search] network error', err?.message || err);
    return res.status(502).json({ error: 'Could not reach Unsplash.' });
  }

  const rate = mapUnsplashRateLimit(upstream.status);
  if (rate) return res.status(rate.status).json({ error: rate.error });

  if (!upstream.ok) {
    console.error('[unsplash/search] upstream status', upstream.status);
    return res.status(502).json({ error: 'Unsplash search failed.' });
  }

  let data;
  try {
    data = await upstream.json();
  } catch {
    return res.status(502).json({ error: 'Unsplash returned an invalid response.' });
  }

  const results = Array.isArray(data.results) ? data.results : [];
  const photos = results.map((p) => ({
    id: p.id,
    alt_description: p.alt_description || '',
    urls: {
      small: p.urls?.small || '',
      regular: p.urls?.regular || '',
    },
    width: p.width,
    height: p.height,
    user: {
      name: p.user?.name || 'Unknown',
      links: { html: p.user?.links?.html || 'https://unsplash.com' },
    },
    links: {
      download_location: p.links?.download_location || '',
    },
  }));

  const totalPages = Number(data.total_pages) || 0;
  return res.status(200).json({ photos, total_pages: totalPages, page });
}

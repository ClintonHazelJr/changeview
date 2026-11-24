import { requireBlogAdmin, setBlogAdminCors } from '../_blogAuth.js';
import {
  missingUnsplashKeyResponse,
  readUnsplashError,
  safeErrorMessage,
  unsplashAuthHeaders,
  unsplashConfigured,
} from '../_unsplash.js';

/**
 * POST /api/unsplash/search
 * Body: { query }
 * Blog-admin only. Proxies Unsplash search; never exposes the access key.
 */
export default async function handler(req, res) {
  try {
    setBlogAdminCors(res);
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (!requireBlogAdmin(req, res)) return;
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    if (!unsplashConfigured()) {
      const missing = missingUnsplashKeyResponse();
      return res.status(missing.status).json(missing.body);
    }

    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const query = String(body.query || '').trim();
    if (!query) {
      return res.status(400).json({ error: 'Enter image keywords to search.' });
    }

    const url = new URL('https://api.unsplash.com/search/photos');
    url.searchParams.set('query', query);
    url.searchParams.set('per_page', '6');
    url.searchParams.set('orientation', 'landscape');

    let upstream;
    try {
      upstream = await fetch(url.toString(), { headers: unsplashAuthHeaders() });
    } catch (err) {
      console.error('[unsplash/search] network error', safeErrorMessage(err));
      return res.status(502).json({ error: `Could not reach Unsplash: ${safeErrorMessage(err)}` });
    }

    if (!upstream.ok) {
      const message = await readUnsplashError(upstream);
      console.error('[unsplash/search] upstream status', upstream.status);
      return res.status(upstream.status).json({ error: message });
    }

    let data;
    try {
      data = await upstream.json();
    } catch (err) {
      return res.status(502).json({
        error: `Unsplash returned an invalid response: ${safeErrorMessage(err)}`,
      });
    }

    const results = Array.isArray(data.results) ? data.results : [];
    const photos = results.map((p) => ({
      id: p.id,
      thumb: p.urls?.small || '',
      url: p.urls?.regular || '',
      photographer_name: p.user?.name || 'Unknown',
      photographer_url: p.user?.links?.html || 'https://unsplash.com',
      download_location: p.links?.download_location || '',
    }));

    return res.status(200).json({ photos });
  } catch (err) {
    console.error('[unsplash/search] unhandled', safeErrorMessage(err));
    return res.status(500).json({ error: safeErrorMessage(err, 'Unsplash search failed unexpectedly.') });
  }
}

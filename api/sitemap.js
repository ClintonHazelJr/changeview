import { adminClient } from './_adminAuth.js';

const ORIGIN = 'https://www.changeview.app';
const STATIC_PATHS = ['/', '/about', '/blog', '/privacy'];

function xmlEscape(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function lastmod(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

function urlEntry(loc, modified) {
  const mod = lastmod(modified);
  return [
    '  <url>',
    `    <loc>${xmlEscape(loc)}</loc>`,
    mod ? `    <lastmod>${mod}</lastmod>` : '',
    '  </url>',
  ].filter(Boolean).join('\n');
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).send('Method not allowed');
  }

  const admin = adminClient();
  if (!admin) {
    return res.status(500).send('Service not configured');
  }

  const { data, error } = await admin
    .from('blog_posts')
    .select('slug, updated_at')
    .eq('published', true);

  if (error) {
    console.error('[sitemap] list failed', error.message);
    return res.status(500).send('Could not build sitemap');
  }

  const urls = [
    ...STATIC_PATHS.map((path) => urlEntry(`${ORIGIN}${path === '/' ? '/' : path}`)),
    ...(data || [])
      .filter((post) => post.slug)
      .map((post) => urlEntry(`${ORIGIN}/blog/${encodeURIComponent(post.slug)}`, post.updated_at)),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>
`;

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  return res.status(200).send(xml);
}

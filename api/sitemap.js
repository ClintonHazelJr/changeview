import { createClient } from '@supabase/supabase-js';

const ORIGIN = 'https://www.changeview.app';
const STATIC_PATHS = ['/', '/about', '/blog', '/privacy'];

function anonClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

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

export function buildSitemapXml(posts) {
  const urls = [
    ...STATIC_PATHS.map((path) => urlEntry(`${ORIGIN}${path === '/' ? '/' : path}`)),
    ...(posts || [])
      .filter((post) => post.slug)
      .map((post) => urlEntry(`${ORIGIN}/blog/${post.slug}`, post.updated_at)),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>
`;
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).send('Method not allowed');
  }

  const supabase = anonClient();
  if (!supabase) {
    return res.status(500).send('Service not configured');
  }

  const { data, error } = await supabase
    .from('blog_posts')
    .select('slug, updated_at')
    .eq('published', true);

  if (error) {
    console.error('[sitemap] list failed', error.message);
    return res.status(500).send('Could not build sitemap');
  }

  const xml = buildSitemapXml(data);
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
  return res.status(200).send(xml);
}

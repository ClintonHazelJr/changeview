import { adminClient } from './_adminAuth.js';
import { SITE_URL, STATIC_PAGES, esc } from './_seo.js';

export default async function handler(req, res) {
  const urls = Object.keys(STATIC_PAGES).map((p) => ({ loc: `${SITE_URL}${p === '/' ? '/' : p}` }));
  const admin = adminClient();
  if (admin) {
    const { data } = await admin
      .from('blog_posts')
      .select('slug, published_at, updated_at, created_at')
      .eq('published', true);
    for (const p of data || []) {
      const last = p.updated_at || p.published_at || p.created_at;
      urls.push({ loc: `${SITE_URL}/blog/${p.slug}`, lastmod: last ? new Date(last).toISOString().slice(0, 10) : null });
    }
  }
  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map((u) => `  <url><loc>${esc(u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}</url>`).join('\n') +
    '\n</urlset>\n';
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  res.status(200).send(xml);
}

import { adminClient } from './_adminAuth.js';
import {
  STATIC_PAGES,
  SITE_URL,
  SITE_NAME,
  esc,
  truncate,
  plainText,
  renderMarkdown,
  organizationLd,
  softwareLd,
  loadTemplate,
  injectPage,
} from './_seo.js';

function send(res, status, html, cache = 's-maxage=300, stale-while-revalidate=3600') {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', `public, ${cache}`);
  res.status(status).send(html);
}

function sortPosts(posts) {
  const ms = (p) => (p?.published_at ? new Date(p.published_at).getTime() || 0 : 0);
  return (posts || []).slice().sort((a, b) => {
    if (Boolean(a.featured) !== Boolean(b.featured)) return a.featured ? -1 : 1;
    return ms(b) - ms(a);
  });
}

/**
 * Server-rendered shell for public pages so crawlers get real HTML.
 * The React app still mounts over #root in the browser.
 * GET /api/seo-page?route=static&path=/about | route=blog | route=post&slug=x
 */
export default async function handler(req, res) {
  const template = await loadTemplate(req);
  const route = String(req.query?.route || 'static');
  const staticPath = String(req.query?.path || '/');

  try {
    if (route === 'post') {
      const slug = String(req.query?.slug || '').trim().toLowerCase();
      const admin = adminClient();
      if (!admin) return send(res, 200, template, 'no-store');
      const { data: post } = await admin
        .from('blog_posts')
        .select('*')
        .eq('slug', slug)
        .eq('published', true)
        .maybeSingle();
      if (!post) {
        return send(res, 404, injectPage(template, {
          title: `Page not found | ${SITE_NAME}`,
          description: 'This page does not exist.',
          path: `/blog/${slug}`,
          bodyHtml: '<h1>Page not found</h1>',
        }).replace('</head>', '<meta name="robots" content="noindex" /></head>'), 's-maxage=60');
      }
      const title = post.meta_title || `${post.title} | ${SITE_NAME}`;
      const description = post.meta_description || truncate(post.excerpt || plainText(post.content), 155);
      const url = `${SITE_URL}/blog/${post.slug}`;
      const published = post.published_at || post.created_at;
      const ld = [
        {
          '@context': 'https://schema.org',
          '@type': 'BlogPosting',
          headline: truncate(post.title, 110),
          description,
          mainEntityOfPage: url,
          datePublished: published,
          dateModified: post.updated_at || published,
          ...(post.header_image_url ? { image: post.header_image_url } : {}),
          author: { '@type': 'Person', name: 'Clinton Hazel Jr' },
          publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
        },
        {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
            { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE_URL}/blog` },
            { '@type': 'ListItem', position: 3, name: post.title, item: url },
          ],
        },
      ];
      const hasH1 = /^\s*#\s+/m.test(String(post.content || '').slice(0, 400));
      const bodyHtml = `<main><article>${hasH1 ? '' : `<h1>${esc(post.title)}</h1>`}${renderMarkdown(post.content)}<p><a href="/blog">All articles</a></p></article></main>`;
      return send(res, 200, injectPage(template, {
        title, description, path: `/blog/${post.slug}`, type: 'article',
        image: post.header_image_url || undefined, ld, bodyHtml,
      }));
    }

    if (route === 'blog') {
      const page = STATIC_PAGES['/blog'];
      const admin = adminClient();
      let posts = [];
      if (admin) {
        const { data } = await admin
          .from('blog_posts')
          .select('slug, title, excerpt, featured, published_at')
          .eq('published', true);
        posts = sortPosts(data);
      }
      const list = posts
        .map((p) => `<li><a href="/blog/${esc(p.slug)}">${esc(p.title)}</a>${p.excerpt ? `<p>${esc(p.excerpt)}</p>` : ''}</li>`)
        .join('');
      const bodyHtml = `<main><h1>${esc(page.h1)}</h1><ul>${list}</ul></main>`;
      return send(res, 200, injectPage(template, { ...page, path: '/blog', bodyHtml }));
    }

    const page = STATIC_PAGES[staticPath] || STATIC_PAGES['/'];
    const path = STATIC_PAGES[staticPath] ? staticPath : '/';
    const links = (page.links || []).map(([href, label]) => `<li><a href="${href}">${esc(label)}</a></li>`).join('');
    const bodyHtml = `<main><h1>${esc(page.h1)}</h1>${page.body ? `<p>${esc(page.body)}</p>` : ''}${links ? `<ul>${links}</ul>` : ''}</main>`;
    const ld = path === '/' ? [organizationLd(), softwareLd()] : [];
    return send(res, 200, injectPage(template, { ...page, path, ld, bodyHtml }));
  } catch (err) {
    console.error('[seo-page] failed', err?.message);
    return send(res, 200, template, 'no-store');
  }
}

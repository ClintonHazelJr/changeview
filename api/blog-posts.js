import { adminClient } from './_adminAuth.js';

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function normalizeSlug(value) {
  return String(value || '').trim().toLowerCase();
}

function publishedAtMs(post) {
  if (!post?.published_at) return 0;
  const t = new Date(post.published_at).getTime();
  return Number.isFinite(t) ? t : 0;
}

/** Featured first (by published_at), then non-featured by published_at desc. */
export function sortPublicPosts(posts) {
  return (posts || []).slice().sort((a, b) => {
    const af = Boolean(a.featured);
    const bf = Boolean(b.featured);
    if (af !== bf) return af ? -1 : 1;
    return publishedAtMs(b) - publishedAtMs(a);
  });
}

/**
 * Public blog posts.
 * GET /api/blog-posts — published list
 * GET /api/blog-posts?slug=x — single published post
 */
export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const admin = adminClient();
  if (!admin) {
    return res.status(500).json({ error: 'Service not configured (SUPABASE_SERVICE_ROLE_KEY)' });
  }

  const slug = normalizeSlug(req.query?.slug);

  if (slug) {
    const { data, error } = await admin
      .from('blog_posts')
      .select('id, slug, title, excerpt, content, header_image_url, published, featured, published_at, created_at')
      .eq('slug', slug)
      .eq('published', true)
      .maybeSingle();

    if (error) {
      console.error('[blog-posts] get failed', error.message);
      return res.status(500).json({ error: 'Could not load post.' });
    }
    if (!data) return res.status(404).json({ error: 'Not found' });
    return res.status(200).json({ post: data });
  }

  const { data, error } = await admin
    .from('blog_posts')
    .select('id, slug, title, excerpt, header_image_url, featured, published_at, created_at')
    .eq('published', true);

  if (error) {
    console.error('[blog-posts] list failed', error.message);
    return res.status(500).json({ error: 'Could not load posts.' });
  }

  return res.status(200).json({ posts: sortPublicPosts(data) });
}

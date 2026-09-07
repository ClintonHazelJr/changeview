import { adminClient } from './_adminAuth.js';

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function normalizeSlug(value) {
  return String(value || '').trim().toLowerCase();
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
      .select('id, slug, title, excerpt, content, header_image_url, published, display_order, created_at')
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
    .select('id, slug, title, excerpt, header_image_url, display_order, created_at')
    .eq('published', true)
    .order('display_order', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[blog-posts] list failed', error.message);
    return res.status(500).json({ error: 'Could not load posts.' });
  }

  const posts = (data || []).slice().sort((a, b) => {
    const ao = a.display_order;
    const bo = b.display_order;
    const aHas = ao != null;
    const bHas = bo != null;
    if (aHas && bHas && ao !== bo) return ao - bo;
    if (aHas && !bHas) return -1;
    if (!aHas && bHas) return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return res.status(200).json({ posts });
}

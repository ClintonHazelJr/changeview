import { adminClient } from '../../_adminAuth.js';
import { requireBlogAdmin, setBlogAdminCors } from '../../_blogAuth.js';
import { BLOG_SEED_POSTS } from '../../_blogSeedData.js';

/**
 * Upsert all default articles with published = false (full editorial reset).
 * Idempotent on slug.
 */
export default async function handler(req, res) {
  setBlogAdminCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!requireBlogAdmin(req, res)) return;

  const admin = adminClient();
  if (!admin) {
    return res.status(500).json({ error: 'Service not configured (SUPABASE_SERVICE_ROLE_KEY)' });
  }

  const now = new Date().toISOString();
  const rows = BLOG_SEED_POSTS.map((p) => ({
    ...p,
    published: false,
    updated_at: now,
  }));

  const { data, error } = await admin
    .from('blog_posts')
    .upsert(rows, { onConflict: 'slug' })
    .select('id, slug, published');

  if (error) {
    console.error('[admin/blog/seed] upsert failed', error.message);
    return res.status(500).json({ error: 'Could not import posts.' });
  }

  return res.status(200).json({
    ok: true,
    count: data?.length || 0,
    posts: data || [],
  });
}

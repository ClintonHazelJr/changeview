import { adminClient } from '../../_adminAuth.js';
import { requireBlogAdmin, setBlogAdminCors } from '../../_blogAuth.js';

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_TITLE = 200;
const MAX_EXCERPT = 500;
const MAX_CONTENT = 100_000;
const MAX_IMAGE = 2000;

function normalizeSlug(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function parseBody(req) {
  return req.body && typeof req.body === 'object' ? req.body : {};
}

export default async function handler(req, res) {
  setBlogAdminCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!requireBlogAdmin(req, res)) return;

  const admin = adminClient();
  if (!admin) {
    return res.status(500).json({ error: 'Service not configured (SUPABASE_SERVICE_ROLE_KEY)' });
  }

  if (req.method === 'GET') {
    const { data, error } = await admin
      .from('blog_posts')
      .select('id, slug, title, excerpt, content, header_image_url, published, display_order, created_at, updated_at')
      .order('display_order', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[admin/blog/posts] list failed', error.message);
      return res.status(500).json({ error: 'Could not load posts.' });
    }
    return res.status(200).json({ posts: data || [] });
  }

  if (req.method === 'POST') {
    const body = parseBody(req);
    const slug = normalizeSlug(body.slug);
    const title = String(body.title || '').trim();
    const excerpt = String(body.excerpt || '').trim();
    const content = String(body.content || '').trim();
    const headerImageUrl = String(body.header_image_url || body.headerImageUrl || '').trim() || null;
    const published = Boolean(body.published);
    const displayOrder = body.display_order == null && body.displayOrder == null
      ? null
      : Number(body.display_order ?? body.displayOrder);

    if (!slug || !SLUG_RE.test(slug)) {
      return res.status(400).json({ error: 'Enter a valid slug (lowercase letters, numbers, hyphens).' });
    }
    if (!title || title.length > MAX_TITLE) {
      return res.status(400).json({ error: 'Enter a title (required, max 200 characters).' });
    }
    if (excerpt.length > MAX_EXCERPT) {
      return res.status(400).json({ error: 'Excerpt is too long (max 500 characters).' });
    }
    if (!content || content.length > MAX_CONTENT) {
      return res.status(400).json({ error: 'Enter markdown content (required).' });
    }
    if (headerImageUrl && headerImageUrl.length > MAX_IMAGE) {
      return res.status(400).json({ error: 'Header image URL is too long.' });
    }

    const row = {
      slug,
      title,
      excerpt,
      content,
      header_image_url: headerImageUrl,
      published,
      display_order: Number.isFinite(displayOrder) ? displayOrder : null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await admin.from('blog_posts').insert(row).select('*').single();
    if (error) {
      console.error('[admin/blog/posts] insert failed', error.message);
      if (error.code === '23505') {
        return res.status(409).json({ error: 'A post with that slug already exists.' });
      }
      return res.status(500).json({ error: 'Could not create post.' });
    }
    return res.status(201).json({ post: data });
  }

  if (req.method === 'PATCH') {
    const body = parseBody(req);
    const id = String(body.id || '').trim();
    if (!id) return res.status(400).json({ error: 'Missing post id.' });

    const patch = { updated_at: new Date().toISOString() };

    if (Object.prototype.hasOwnProperty.call(body, 'published')) {
      patch.published = Boolean(body.published);
    }
    if (Object.prototype.hasOwnProperty.call(body, 'title')) {
      const title = String(body.title || '').trim();
      if (!title || title.length > MAX_TITLE) {
        return res.status(400).json({ error: 'Enter a title (required, max 200 characters).' });
      }
      patch.title = title;
    }
    if (Object.prototype.hasOwnProperty.call(body, 'slug')) {
      const slug = normalizeSlug(body.slug);
      if (!slug || !SLUG_RE.test(slug)) {
        return res.status(400).json({ error: 'Enter a valid slug.' });
      }
      patch.slug = slug;
    }
    if (Object.prototype.hasOwnProperty.call(body, 'excerpt')) {
      const excerpt = String(body.excerpt || '').trim();
      if (excerpt.length > MAX_EXCERPT) {
        return res.status(400).json({ error: 'Excerpt is too long.' });
      }
      patch.excerpt = excerpt;
    }
    if (Object.prototype.hasOwnProperty.call(body, 'content')) {
      const content = String(body.content || '').trim();
      if (!content || content.length > MAX_CONTENT) {
        return res.status(400).json({ error: 'Enter markdown content.' });
      }
      patch.content = content;
    }
    if (
      Object.prototype.hasOwnProperty.call(body, 'header_image_url')
      || Object.prototype.hasOwnProperty.call(body, 'headerImageUrl')
    ) {
      const headerImageUrl = String(body.header_image_url ?? body.headerImageUrl ?? '').trim() || null;
      if (headerImageUrl && headerImageUrl.length > MAX_IMAGE) {
        return res.status(400).json({ error: 'Header image URL is too long.' });
      }
      patch.header_image_url = headerImageUrl;
    }
    if (
      Object.prototype.hasOwnProperty.call(body, 'display_order')
      || Object.prototype.hasOwnProperty.call(body, 'displayOrder')
    ) {
      const displayOrder = body.display_order ?? body.displayOrder;
      patch.display_order = displayOrder == null || displayOrder === ''
        ? null
        : Number(displayOrder);
      if (patch.display_order != null && !Number.isFinite(patch.display_order)) {
        return res.status(400).json({ error: 'display_order must be a number.' });
      }
    }

    const { data, error } = await admin
      .from('blog_posts')
      .update(patch)
      .eq('id', id)
      .select('*')
      .maybeSingle();

    if (error) {
      console.error('[admin/blog/posts] update failed', error.message);
      if (error.code === '23505') {
        return res.status(409).json({ error: 'A post with that slug already exists.' });
      }
      return res.status(500).json({ error: 'Could not update post.' });
    }
    if (!data) return res.status(404).json({ error: 'Post not found.' });
    return res.status(200).json({ post: data });
  }

  if (req.method === 'DELETE') {
    const id = String(req.query?.id || parseBody(req).id || '').trim();
    if (!id) return res.status(400).json({ error: 'Missing post id.' });

    const { data, error } = await admin
      .from('blog_posts')
      .delete()
      .eq('id', id)
      .select('id')
      .maybeSingle();

    if (error) {
      console.error('[admin/blog/posts] delete failed', error.message);
      return res.status(500).json({ error: 'Could not delete post.' });
    }
    if (!data) return res.status(404).json({ error: 'Post not found.' });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

-- Attribution fields for Unsplash (and other) header images on blog posts.
-- Reuses existing header_image_url; does not modify existing rows.

alter table public.blog_posts
  add column if not exists image_credit_name text,
  add column if not exists image_credit_url text;

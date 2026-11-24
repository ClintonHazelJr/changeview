-- Attribution fields for Unsplash (and other) header images on blog posts.
-- Reuses existing header_image_url; does not modify existing rows.
-- Apply this in the Supabase SQL editor (or via migration) before using the Unsplash picker save path.

alter table public.blog_posts
  add column if not exists image_credit_name text;

alter table public.blog_posts
  add column if not exists image_credit_url text;

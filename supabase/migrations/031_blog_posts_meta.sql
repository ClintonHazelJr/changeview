-- Public blog SEO fields. Empty values fall back to title and excerpt.

alter table public.blog_posts
  add column if not exists meta_title text,
  add column if not exists meta_description text;

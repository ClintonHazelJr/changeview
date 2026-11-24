-- Keywords used to search Unsplash for a post header image.

alter table public.blog_posts
  add column if not exists image_keywords text;

notify pgrst, 'reload schema';

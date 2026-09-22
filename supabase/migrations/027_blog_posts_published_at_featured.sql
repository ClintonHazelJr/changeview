-- Publish timestamp + featured pin for marketing blog index.

alter table public.blog_posts
  add column if not exists published_at timestamptz;

alter table public.blog_posts
  add column if not exists featured boolean not null default false;

create index if not exists blog_posts_public_list_idx
  on public.blog_posts (published, featured desc, published_at desc nulls last);

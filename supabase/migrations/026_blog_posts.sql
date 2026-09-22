-- Database-backed marketing blog posts (CMS). Public site reads published rows only.

create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  excerpt text not null default '',
  content text not null default '',
  header_image_url text,
  published boolean not null default false,
  display_order integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists blog_posts_published_order_idx
  on public.blog_posts (published, display_order nulls last, created_at desc);

alter table public.blog_posts enable row level security;

-- No direct client access; all reads/writes go through service-role API handlers.
drop policy if exists blog_posts_no_direct_access on public.blog_posts;

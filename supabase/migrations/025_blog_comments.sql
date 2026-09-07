-- Public moderated blog comments (unauthenticated submit via /api/blog-comments).
-- Comments are hidden until approved = true (moderate in Supabase table editor).

create table if not exists public.blog_comments (
  id uuid primary key default gen_random_uuid(),
  post_slug text not null,
  author_name text not null,
  author_email text not null,
  comment_text text not null,
  approved boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists blog_comments_post_approved_idx
  on public.blog_comments (post_slug, approved, created_at);

alter table public.blog_comments enable row level security;

-- No direct anon/authenticated access — all reads/writes go through the service-role API.
drop policy if exists blog_comments_no_direct_access on public.blog_comments;

-- Topic queue for the weekly auto-drafted blog article (api/cron-draft-article.js).
-- Also makes sure the SEO columns exist.
alter table public.blog_posts add column if not exists meta_title text;
alter table public.blog_posts add column if not exists meta_description text;
alter table public.blog_posts add column if not exists image_keywords text;

create table if not exists public.blog_topics (
  id uuid primary key default gen_random_uuid(),
  topic text not null,
  keyword text not null default '',
  angle text not null default '',
  status text not null default 'queued' check (status in ('queued','drafted','skipped')),
  post_id uuid references public.blog_posts(id) on delete set null,
  created_at timestamptz not null default now(),
  used_at timestamptz
);

create index if not exists blog_topics_queue_idx on public.blog_topics (status, created_at);

alter table public.blog_topics enable row level security;
-- No policies: only the service role (API handlers) can read or write.

insert into public.blog_topics (topic, keyword, angle) values
('ChangePlan Alternative: What to Check Before You Switch', 'changeplan alternative', 'Comparison guide for consultants. Focus on what to evaluate, not claims about the competitor.'),
('OCM Solution Alternative for Independent Change Consultants', 'ocm solution alternative', 'Buyer guide. Criteria checklist for independent consultants.'),
('AlignHQ Alternative: Change Management Software Compared', 'alignhq alternative', 'Buyer guide. Criteria checklist, price and setup effort.'),
('Praxie Alternative: Change Management Software for Small Teams', 'praxie alternative', 'Buyer guide for small teams and solo consultants.'),
('Change Impact Assessment Template (Free, Step by Step)', 'change impact assessment template', 'Practical template with columns, scoring and a worked example.'),
('Change Management Software: What to Look For in 2026', 'change management software', 'Buyer checklist covering impact, stakeholders, comms, training, reporting.'),
('Change Readiness Assessment: Questions to Ask Before Go-Live', 'change readiness assessment', 'Question list grouped by leadership, managers, end users.'),
('Change Management Communication Plan Template', 'change communication plan template', 'Template table plus tips on messenger and timing.'),
('Stakeholder Register Template for Change Projects', 'stakeholder register template', 'Template columns and how to keep it current.'),
('How to Run a Change Impact Workshop', 'change impact workshop', 'Agenda, questions, outputs.'),
('Change Management Training Plan: How to Match Training to Impact', 'change management training plan', 'Tiering training by impact level.'),
('Resistance to Change: How to Spot It Early and What to Do', 'resistance to change', 'Signals, conversations, practical responses.'),
('Change Champions Network: How to Build One', 'change champions network', 'Selecting, supporting and measuring champions.'),
('Change Management for Small Businesses', 'change management small business', 'Lightweight approach with limited time and budget.'),
('Change Management Consultant Toolkit: What to Keep in One Place', 'change management consultant tools', 'Tools and artefacts a consultant needs per client.'),
('Change Management Dashboard: What to Show Your Sponsor', 'change management dashboard', 'Metrics and one page reporting for sponsors.'),
('Prosci ADKAR Template: Using the Model Without Spreadsheet Chaos', 'adkar template', 'Practical ADKAR tracking by group.'),
('Change Management Plan for ERP Implementation', 'erp change management plan', 'Plan outline specific to ERP rollouts.'),
('Change Management for Software Rollouts', 'software rollout change management', 'Checklist from pilot to go-live to reinforcement.'),
('Lewin Change Model Explained With Examples', 'lewin change model', 'Unfreeze, change, refreeze in plain language.')
on conflict do nothing;

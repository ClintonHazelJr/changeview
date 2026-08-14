-- Incremental migration: adds Requirements only.
-- Run after schema tables already exist. Safe if tables are missing.

create table if not exists requirements (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  initiative_id uuid not null references initiatives(id) on delete cascade,
  reference_number text,
  description text not null,
  status text not null default 'draft' check (status in ('draft', 'approved', 'rejected')),
  priority text check (priority in ('low', 'medium', 'high')),
  author_id uuid references people(id),
  business_approver_id uuid references people(id),
  created_at timestamptz not null default now()
);

create table if not exists requirement_impacts (
  account_id uuid not null references accounts(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  requirement_id uuid not null references requirements(id) on delete cascade,
  impact_id uuid not null references impacts(id) on delete cascade,
  primary key (requirement_id, impact_id)
);

create index if not exists idx_requirements_initiative on requirements(initiative_id);
create index if not exists idx_requirement_impacts_requirement on requirement_impacts(requirement_id);
create index if not exists idx_requirement_impacts_impact on requirement_impacts(impact_id);

alter table requirements enable row level security;
alter table requirement_impacts enable row level security;

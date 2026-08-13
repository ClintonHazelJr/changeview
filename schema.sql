-- ============================================================
-- OneView (Change View) — v1 Database Schema
-- Postgres / Supabase
-- ============================================================
-- Hierarchy: Account -> (Program) -> Initiative -> Impact -> Learning Needs / Comms
-- Program exists in schema but is hidden in v1 UI. Every Initiative
-- can be assigned a program later with zero migration needed.
-- account_id is denormalized onto every table on purpose, to keep
-- Row Level Security policies simple: one check, no joins.
-- ============================================================

-- ---------- Tenancy ----------

create table accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  -- Soft-delete: blocks access; row kept for a recovery window before hard purge.
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create table users (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  email text not null unique,
  full_name text not null,
  -- owner: the paying account holder, full access to every Workspace on the account.
  -- member: no access to anything until explicitly granted via workspace_members below.
  role text not null default 'member' check (role in ('owner', 'member')),
  -- Soft deactivate: frees a seat; login blocked via Auth ban in /api/deactivate-user.
  -- Do not hard-delete users — their id is referenced as owners/assignees/authors.
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Billing: 2 tiers.
-- Tier 1: single org, month-to-month only.
-- Tier 2: unlimited orgs, unlocks Reports + Schedule, monthly or annual (discounted).
create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null unique references accounts(id) on delete cascade,
  -- Solo=tier_1, Small=small, Enterprise=tier_2
  plan_tier text not null check (plan_tier in ('tier_1', 'small', 'tier_2')),
  billing_cycle text not null default 'monthly' check (billing_cycle in ('monthly', 'annual')),
  status text not null default 'incomplete' check (status in ('incomplete', 'trialing', 'active', 'cancelled', 'past_due')),
  trial_ends_at timestamptz,
  current_period_end date,
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Tier 1 can only ever be monthly, enforce it in the schema, not just app logic
  constraint tier_1_must_be_monthly check (plan_tier != 'tier_1' or billing_cycle = 'monthly')
);

-- ---------- Reference numbering ----------
-- One counter per account per record type, so Program/Initiative/Impact
-- each get their own clean sequential number (00001, 00002...) that's
-- unique within that account and safe to reference in emails.

create table reference_counters (
  account_id uuid not null references accounts(id) on delete cascade,
  entity_type text not null check (entity_type in ('program', 'initiative', 'impact')),
  next_number int not null default 1,
  primary key (account_id, entity_type)
);

-- Call this to atomically get the next number for a given account + type,
-- e.g. select next_reference_number('...account-id...', 'initiative');
-- Format as zero-padded text in the app layer (or in a trigger), e.g. '00001'.
create or replace function next_reference_number(p_account_id uuid, p_entity_type text)
returns int as $$
declare
  v_number int;
begin
  insert into reference_counters (account_id, entity_type, next_number)
  values (p_account_id, p_entity_type, 2)
  on conflict (account_id, entity_type)
  do update set next_number = reference_counters.next_number + 1
  returning next_number - 1 into v_number;
  return v_number;
end;
$$ language plpgsql;

-- ---------- Workspace (tier-gated container) ----------
-- Tier 1 accounts get exactly one Workspace. Tier 2 accounts can create
-- unlimited Workspaces. Enforced below via trigger, not just app logic,
-- so a bug in the UI can't silently let a Tier 1 account create a second one.
-- This sits between Account and Company/Org: a consultant on Tier 2 might
-- run one Workspace per client relationship, each holding several Companies.

create table workspaces (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create or replace function enforce_workspace_tier_limit()
returns trigger as $$
declare
  v_plan_tier text;
  v_existing_count int;
begin
  select plan_tier into v_plan_tier from subscriptions where account_id = new.account_id;

  if v_plan_tier = 'tier_1' then
    select count(*) into v_existing_count from workspaces where account_id = new.account_id;
    if v_existing_count >= 1 then
      raise exception 'Tier 1 accounts are limited to a single Workspace. Upgrade to Tier 2 to add more.';
    end if;
  end if;

  return new;
end;
$$ language plpgsql;

create trigger check_workspace_tier_limit
  before insert on workspaces
  for each row execute function enforce_workspace_tier_limit();

-- Now that workspaces exists, add the column on users that couldn't be
-- declared inline back when users was first created above.
alter table users add column default_workspace_id uuid references workspaces(id) on delete set null;
-- Reopens here on next login, set whenever the user switches workspace.

-- Grants a member access to one specific Workspace. Owners don't need rows
-- here, they see every Workspace on the account by definition. This is how
-- "account holder adds a user, that user only sees the one Workspace
-- they were added to" gets enforced, not just followed by convention.
create table workspace_members (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member')), -- role within this workspace
  created_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

-- ---------- Org structure (System Admin: Org / Department / People) ----------
-- "Org" here is the Company level (e.g. "Software Co", "NBN") — the tab
-- your System Admin screens already show. It now nests under Workspace.
-- This is the account's own company directory. Every Department and
-- People dropdown across Impacts, Stakeholders, and Comms pulls from here,
-- instead of free-typed text. Supports CSV bulk upload in the UI later,
-- schema doesn't care how rows got created.

create table organizations (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table departments (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  location text,
  created_at timestamptz not null default now()
);

create table people (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  department_id uuid references departments(id) on delete set null,
  name text not null,
  title text,
  email text,
  created_at timestamptz not null default now()
);

create table project_teams (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null, -- e.g. "Autobots", "Agile Avengers" — user-named, AI Name Generator is a v2 nice-to-have
  created_at timestamptz not null default now()
);

create table project_team_members (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  team_id uuid not null references project_teams(id) on delete cascade,
  person_id uuid not null references people(id),
  role text, -- e.g. Change Manager, Project Manager — role on this team, distinct from their job title
  created_at timestamptz not null default now()
);

-- ---------- Program (schema only, hidden in v1 UI) ----------

create table programs (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  reference_number text,
  name text not null,
  description text,
  status text check (status in ('planning', 'delivery', 'closed')),
  organization_id uuid not null references organizations(id),
  start_date date,
  proposed_go_live_date date,
  program_manager_id uuid references users(id),
  sponsor_id uuid references users(id),
  budget numeric(12,2),
  goal text,
  benefits text,
  created_at timestamptz not null default now()
);

-- ---------- Initiative (core object) ----------

create table initiatives (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  program_id uuid not null references programs(id),
  -- Company is reached via program_id -> programs.organization_id, not linked directly here.
  -- v1 UI hides the Program screens, but every Initiative still needs a real Program row:
  -- auto-create one default "General" Program per Company behind the scenes when a
  -- Company is created, so Initiative creation always has somewhere to attach.
  reference_number text,
  name text not null,
  description text,
  status text not null default 'planning'
    check (status in ('planning', 'delivery', 'hypercare', 'closed')),
  start_date date,
  proposed_go_live_date date,
  project_team_id uuid references project_teams(id),
  use_case text,
  expected_benefits text,
  budget numeric(12,2),
  change_owner_id uuid references users(id),
  product_owner_id uuid references users(id),
  business_owner_id uuid references users(id),
  project_manager_id uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- Cost tracking (rolls up Initiative -> Program -> Company for billing) ----------
-- Line-item entries at the Initiative level. Program cost = sum of its
-- Initiatives' entries. Company cost = sum across all its Programs.
-- No stored rollup columns on purpose: budget can change, entries can be
-- added or corrected, so cost should always be computed live from here,
-- never cached, or Program/Company totals will drift out of sync with reality.
-- Schema-ready now; UI for this (rate cards, invoice export) is v2 scope.
-- PROVISIONAL: "Ticket" and "Task" are the same thing (confirmed), and Task
-- (inside the v3 Planning/Kanban module) is meant to be the real home for
-- line-item work in the long run. This table exists so cost tracking works
-- before Task/Planning gets built. Once Task exists, give it a rate field
-- and fold billing into it there, retire this table rather than running two
-- competing places to log billable work.

create table cost_entries (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  initiative_id uuid not null references initiatives(id) on delete cascade,
  person_id uuid references people(id), -- who did the work, optional
  description text,
  entry_date date not null default current_date,
  hours numeric(6,2),
  rate numeric(10,2),
  amount numeric(12,2) generated always as (coalesce(hours, 0) * coalesce(rate, 0)) stored,
  billable boolean not null default true,
  created_at timestamptz not null default now()
);

-- Example rollup queries (for reference, not stored):
-- Program cost:  select sum(ce.amount) from cost_entries ce
--                 join initiatives i on i.id = ce.initiative_id
--                 where i.program_id = '...' and ce.billable = true;
-- Company cost:  select sum(ce.amount) from cost_entries ce
--                 join initiatives i on i.id = ce.initiative_id
--                 join programs p on p.id = i.program_id
--                 where p.organization_id = '...' and ce.billable = true;

-- ---------- Requirements (belongs to Initiative) ----------
-- Added when Requirements moved from "out of scope" to a real nav item.
-- Deliberately does NOT link to a Tasks table, Planning/Tasks/Kanban stays
-- out of scope. requirement_impacts is a simple many-to-many so a
-- Requirement can reference the Impacts it relates to.

create table requirements (
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

create table requirement_impacts (
  account_id uuid not null references accounts(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  requirement_id uuid not null references requirements(id) on delete cascade,
  impact_id uuid not null references impacts(id) on delete cascade,
  primary key (requirement_id, impact_id)
);

-- ---------- Impact (belongs to Initiative) ----------

create table impacts (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  initiative_id uuid not null references initiatives(id) on delete cascade,
  reference_number text,
  department_id uuid references departments(id),
  headcount_impacted int default 0,
  current_state_system text,
  current_state_process text,
  future_state_system text,
  future_state_process text,
  impact_description text,
  severity_org text check (severity_org in ('none', 'low', 'medium', 'high')),
  severity_people text check (severity_people in ('none', 'low', 'medium', 'high')),
  severity_process text check (severity_process in ('none', 'low', 'medium', 'high')),
  severity_system text check (severity_system in ('none', 'low', 'medium', 'high')),
  severity_environment text check (severity_environment in ('none', 'low', 'medium', 'high')),
  intervention_tags text[] default '{}', -- e.g. {training, huddle}
  status text not null default 'draft' check (status in ('draft', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Files attached to Impact current/future process fields (Supabase Storage paths)
create table impact_attachments (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  impact_id uuid not null references impacts(id) on delete cascade,
  field text not null check (field in ('current_process', 'future_process')),
  file_name text not null,
  file_path text not null,
  content_type text,
  file_size bigint,
  uploaded_at timestamptz not null default now()
);

-- ---------- Stakeholders (belongs to Initiative) ----------

create table stakeholders (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  initiative_id uuid not null references initiatives(id) on delete cascade,
  person_id uuid not null references people(id), -- name/department/title live on the person record
  project_role text, -- e.g. SME, Team Lead (this initiative-specific role can differ from their job title)
  raci_responsible boolean default false,
  raci_accountable boolean default false,
  raci_consulted boolean default false,
  raci_informed boolean default false,
  created_at timestamptz not null default now()
);

-- ---------- Learning Needs (belongs to Impact) ----------

create table learning_needs (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  impact_id uuid not null references impacts(id) on delete cascade,
  team text,
  goal text,
  headcount int default 0,
  type text, -- training, huddle
  session_count int default 1,
  time_hours numeric(5,2) default 0,
  status text not null default 'draft' check (status in ('draft', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

create table learning_need_attachments (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  learning_need_id uuid not null references learning_needs(id) on delete cascade,
  file_name text not null,
  file_path text not null,
  content_type text,
  file_size bigint,
  uploaded_at timestamptz not null default now()
);

-- ---------- Comms (belongs to Impact, optionally rolls up to Initiative-wide) ----------

create table comms (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  initiative_id uuid not null references initiatives(id) on delete cascade,
  impact_id uuid references impacts(id) on delete set null, -- nullable: some comms are initiative-wide
  delivery_date date,
  department_id uuid references departments(id),
  key_message text,
  audience text[] default '{}', -- internal, customer, leadership
  tone text check (tone in ('professional', 'playful', 'caring')),
  channel text[] default '{}', -- email, external, newsletter
  resp_delivery_id uuid references users(id),
  resp_documentation_id uuid references users(id),
  ai_prompt_used text,
  ai_generated_content text,
  final_content text, -- edited/approved version, separate from raw AI output
  status text not null default 'draft' check (status in ('draft', 'approved', 'sent')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- Hypercare (v2 — reserved now, not built in week 1) ----------

create table hypercare (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  initiative_id uuid not null unique references initiatives(id) on delete cascade, -- 1:1 with Initiative
  pilot boolean default false,
  pilot_success_criteria text,
  assumptions text,
  duration text,
  created_at timestamptz not null default now()
);

-- ---------- Tasks (belongs to Initiative; Kanban / Planning) ----------

create table tasks (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  initiative_id uuid not null references initiatives(id) on delete cascade,
  name text not null,
  description text,
  assignee_id uuid references people(id),
  project_team_id uuid references project_teams(id),
  status text not null default 'backlog'
    check (status in ('backlog', 'ready', 'in_progress', 'blocked', 'done')),
  priority text check (priority in ('low', 'medium', 'high')),
  effort_estimate text,
  start_date date,
  finish_date date,
  sprint text,
  pi text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table task_requirements (
  account_id uuid not null references accounts(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  task_id uuid not null references tasks(id) on delete cascade,
  requirement_id uuid not null references requirements(id) on delete cascade,
  primary key (task_id, requirement_id)
);

-- ============================================================
-- Indexes (query patterns: always filtered by account_id first,
-- then usually by initiative_id or impact_id)
-- ============================================================

create index idx_initiatives_account on initiatives(account_id);
create index idx_initiatives_program on initiatives(program_id);
create index idx_requirements_initiative on requirements(initiative_id);
create index idx_requirement_impacts_requirement on requirement_impacts(requirement_id);
create index idx_requirement_impacts_impact on requirement_impacts(impact_id);
create index idx_cost_entries_initiative on cost_entries(initiative_id);
create index idx_cost_entries_account on cost_entries(account_id);
create index idx_workspaces_account on workspaces(account_id);
create index idx_organizations_workspace on organizations(workspace_id);
create index idx_programs_organization on programs(organization_id);
create index idx_impacts_account on impacts(account_id);
create index idx_impacts_initiative on impacts(initiative_id);
create index idx_impacts_department on impacts(department_id);
create index idx_stakeholders_initiative on stakeholders(initiative_id);
create index idx_stakeholders_person on stakeholders(person_id);
create index idx_learning_needs_impact on learning_needs(impact_id);
create index idx_comms_initiative on comms(initiative_id);
create index idx_comms_impact on comms(impact_id);
create index idx_departments_org on departments(org_id);
create index idx_people_department on people(department_id);
create index idx_people_account on people(account_id);
create index idx_team_members_team on project_team_members(team_id);
create index idx_team_members_person on project_team_members(person_id);
create index idx_initiatives_team on initiatives(project_team_id);
create index idx_workspace_members_workspace on workspace_members(workspace_id);
create index idx_workspace_members_user on workspace_members(user_id);
create index idx_departments_workspace on departments(workspace_id);
create index idx_people_workspace on people(workspace_id);
create index idx_project_teams_workspace on project_teams(workspace_id);
create index idx_programs_workspace on programs(workspace_id);
create index idx_initiatives_workspace on initiatives(workspace_id);
create index idx_impacts_workspace on impacts(workspace_id);
create index idx_comms_workspace on comms(workspace_id);
create index idx_tasks_workspace on tasks(workspace_id);
create index idx_tasks_initiative on tasks(initiative_id);
create index idx_tasks_status on tasks(status);
create index idx_task_requirements_task on task_requirements(task_id);
create index idx_task_requirements_requirement on task_requirements(requirement_id);

-- ============================================================
-- Row Level Security (Supabase)
-- Two-tier access, both checks are flat lookups, no deep joins,
-- because account_id AND workspace_id are denormalized onto every table:
--   1. Owners (users.role = 'owner') see every row where account_id matches.
--   2. Members see only rows where workspace_id is one they were granted
--      via workspace_members. A member added to Workspace A never sees
--      Workspace B's data, even though both sit under the same account.
-- ============================================================

alter table initiatives enable row level security;
alter table impacts enable row level security;
alter table stakeholders enable row level security;
alter table learning_needs enable row level security;
alter table comms enable row level security;
alter table hypercare enable row level security;
alter table requirements enable row level security;
alter table requirement_impacts enable row level security;
alter table tasks enable row level security;
alter table task_requirements enable row level security;
alter table cost_entries enable row level security;
alter table programs enable row level security;
alter table organizations enable row level security;
alter table workspaces enable row level security;
alter table departments enable row level security;
alter table people enable row level security;
alter table project_teams enable row level security;
alter table project_team_members enable row level security;
alter table workspace_members enable row level security;

-- Example policy pattern (repeat per table, swap table name and account_id/workspace_id columns):
-- create policy "owner_or_workspace_member" on initiatives
--   for all
--   using (
--     account_id = (select account_id from users where id = auth.uid())
--     and (
--       (select role from users where id = auth.uid()) = 'owner'
--       or workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
--     )
--   )
--   with check (
--     account_id = (select account_id from users where id = auth.uid())
--     and (
--       (select role from users where id = auth.uid()) = 'owner'
--       or workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
--     )
--   );

-- Severity: allow "none" (No Impact) on all five Impact severity columns.
-- Attachments: impact process fields + learning need training materials.

alter table impacts drop constraint if exists impacts_severity_org_check;
alter table impacts drop constraint if exists impacts_severity_people_check;
alter table impacts drop constraint if exists impacts_severity_process_check;
alter table impacts drop constraint if exists impacts_severity_system_check;
alter table impacts drop constraint if exists impacts_severity_environment_check;

alter table impacts
  add constraint impacts_severity_org_check
    check (severity_org is null or severity_org in ('none', 'low', 'medium', 'high')),
  add constraint impacts_severity_people_check
    check (severity_people is null or severity_people in ('none', 'low', 'medium', 'high')),
  add constraint impacts_severity_process_check
    check (severity_process is null or severity_process in ('none', 'low', 'medium', 'high')),
  add constraint impacts_severity_system_check
    check (severity_system is null or severity_system in ('none', 'low', 'medium', 'high')),
  add constraint impacts_severity_environment_check
    check (severity_environment is null or severity_environment in ('none', 'low', 'medium', 'high'));

create table if not exists impact_attachments (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  impact_id uuid not null references impacts(id) on delete cascade,
  field text not null check (field in ('current_process', 'future_process')),
  file_name text not null,
  storage_path text not null,
  content_type text,
  file_size bigint,
  created_at timestamptz not null default now()
);

create table if not exists learning_need_attachments (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  learning_need_id uuid not null references learning_needs(id) on delete cascade,
  file_name text not null,
  storage_path text not null,
  content_type text,
  file_size bigint,
  created_at timestamptz not null default now()
);

create index if not exists idx_impact_attachments_impact on impact_attachments(impact_id);
create index if not exists idx_learning_need_attachments_ln on learning_need_attachments(learning_need_id);

alter table impact_attachments enable row level security;
alter table learning_need_attachments enable row level security;

-- Tasks + task↔ requirement linking (Kanban / Planning).

create table if not exists tasks (
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

create table if not exists task_requirements (
  account_id uuid not null references accounts(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  task_id uuid not null references tasks(id) on delete cascade,
  requirement_id uuid not null references requirements(id) on delete cascade,
  primary key (task_id, requirement_id)
);

create index if not exists idx_tasks_workspace on tasks(workspace_id);
create index if not exists idx_tasks_initiative on tasks(initiative_id);
create index if not exists idx_tasks_status on tasks(status);
create index if not exists idx_task_requirements_task on task_requirements(task_id);
create index if not exists idx_task_requirements_requirement on task_requirements(requirement_id);

alter table tasks enable row level security;
alter table task_requirements enable row level security;

do $$
declare
  tbl text;
begin
  foreach tbl in array array['tasks', 'task_requirements']
  loop
    execute format('drop policy if exists "owner_or_workspace_member_select" on %I', tbl);
    execute format('drop policy if exists "owner_or_workspace_member_insert" on %I', tbl);
    execute format('drop policy if exists "owner_or_workspace_member_update" on %I', tbl);
    execute format('drop policy if exists "owner_or_workspace_member_delete" on %I', tbl);

    execute format('
      create policy "owner_or_workspace_member_select" on %I for select using (
        account_id = current_user_account_id()
        and user_has_workspace_access(workspace_id)
      )', tbl);
    execute format('
      create policy "owner_or_workspace_member_insert" on %I for insert with check (
        account_id = current_user_account_id()
        and user_has_workspace_access(workspace_id)
      )', tbl);
    execute format('
      create policy "owner_or_workspace_member_update" on %I for update using (
        account_id = current_user_account_id()
        and user_has_workspace_access(workspace_id)
      ) with check (
        account_id = current_user_account_id()
        and user_has_workspace_access(workspace_id)
      )', tbl);
    execute format('
      create policy "owner_or_workspace_member_delete" on %I for delete using (
        account_id = current_user_account_id()
        and user_has_workspace_access(workspace_id)
      )', tbl);
  end loop;
end $$;

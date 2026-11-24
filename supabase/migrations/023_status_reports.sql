-- Change Status Report snapshots (weekly SteerCo).
-- Safe if the table already exists from a remote migration.

create table if not exists status_reports (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  initiative_id uuid references initiatives(id) on delete cascade,
  program_id uuid references programs(id) on delete cascade,
  rag_status text not null check (rag_status in ('green', 'amber', 'red')),
  highlights text,
  risks_blockers text,
  requirements_completion_pct numeric(5,2) not null default 0,
  task_completion_pct numeric(5,2) not null default 0,
  blocked_task_count integer not null default 0,
  change_readiness_pct numeric(5,2) not null default 0,
  high_severity_impact_count integer not null default 0,
  budget_actual numeric(12,2) not null default 0,
  budget_planned numeric(12,2),
  created_by uuid references users(id),
  created_at timestamptz not null default now(),
  constraint status_reports_scope_check check (
    (initiative_id is not null and program_id is null)
    or (initiative_id is null and program_id is not null)
  )
);

create index if not exists idx_status_reports_workspace on status_reports(workspace_id);
create index if not exists idx_status_reports_initiative on status_reports(initiative_id);
create index if not exists idx_status_reports_program on status_reports(program_id);
create index if not exists idx_status_reports_created_at on status_reports(created_at desc);

alter table status_reports enable row level security;

do $$
declare
  tbl text := 'status_reports';
begin
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
end $$;

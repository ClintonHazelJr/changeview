-- Task ↔ Learning Need join (mirrors task_requirements).
-- Also allow learning_needs.status = completed (DB triggers handle auto flip).

create table if not exists task_learning_needs (
  account_id uuid not null references accounts(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  task_id uuid not null references tasks(id) on delete cascade,
  learning_need_id uuid not null references learning_needs(id) on delete cascade,
  primary key (task_id, learning_need_id)
);

create index if not exists idx_task_learning_needs_task on task_learning_needs(task_id);
create index if not exists idx_task_learning_needs_learning_need on task_learning_needs(learning_need_id);

alter table task_learning_needs enable row level security;

do $$
declare
  tbl text := 'task_learning_needs';
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

alter table public.learning_needs drop constraint if exists learning_needs_status_check;

alter table public.learning_needs
  add constraint learning_needs_status_check
  check (status in ('draft', 'approved', 'rejected', 'completed'));

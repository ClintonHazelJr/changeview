-- Soft-delete accounts (recovery window) without dropping the row.
alter table accounts
  add column if not exists deleted_at timestamptz;

create index if not exists idx_accounts_deleted_at
  on accounts (deleted_at)
  where deleted_at is not null;

-- Allow wiping workspaces without failing on users.default_workspace_id.
alter table users
  drop constraint if exists users_default_workspace_id_fkey;

alter table users
  add constraint users_default_workspace_id_fkey
  foreign key (default_workspace_id)
  references workspaces(id)
  on delete set null;

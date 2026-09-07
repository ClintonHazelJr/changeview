-- Generic integrations schema (Asana first; Jira / Monday reuse the same tables).
-- Token encryption key lives in process.env.INTEGRATION_TOKEN_ENCRYPTION_KEY — never in the DB.

create extension if not exists pgcrypto;

create or replace function encrypt_integration_token(p_plaintext text, p_key text)
returns text
language sql
security definer
set search_path = public
as $$
  select case
    when p_plaintext is null or p_key is null or length(p_key) < 16 then null
    else encode(pgp_sym_encrypt(p_plaintext, p_key), 'base64')
  end;
$$;

create or replace function decrypt_integration_token(p_ciphertext text, p_key text)
returns text
language sql
security definer
set search_path = public
as $$
  select case
    when p_ciphertext is null or p_key is null or length(p_key) < 16 then null
    else pgp_sym_decrypt(decode(p_ciphertext, 'base64'), p_key)
  end;
$$;

revoke all on function encrypt_integration_token(text, text) from public;
revoke all on function decrypt_integration_token(text, text) from public;
grant execute on function encrypt_integration_token(text, text) to service_role;
grant execute on function decrypt_integration_token(text, text) to service_role;

create table if not exists integrations (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  provider text not null check (provider in ('asana', 'jira', 'monday')),
  status text not null default 'connected'
    check (status in ('connected', 'disconnected', 'error')),
  access_token_encrypted text,
  refresh_token_encrypted text,
  token_expires_at timestamptz,
  external_workspace_id text,
  external_user_id text,
  external_user_name text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- One connection per provider per ChangeView workspace (not per account).
  unique (workspace_id, provider)
);

create table if not exists integration_parent_links (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  integration_id uuid not null references integrations(id) on delete cascade,
  initiative_id uuid not null references initiatives(id) on delete cascade,
  external_id text not null,
  external_url text,
  external_name text,
  webhook_gid text,
  webhook_secret text,
  last_synced_at timestamptz,
  last_sync_direction text check (last_sync_direction in ('inbound', 'outbound', 'import')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (integration_id, initiative_id),
  unique (integration_id, external_id)
);

create table if not exists integration_task_links (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  integration_id uuid not null references integrations(id) on delete cascade,
  parent_link_id uuid not null references integration_parent_links(id) on delete cascade,
  task_id uuid not null references tasks(id) on delete cascade,
  external_id text not null,
  external_url text,
  last_synced_at timestamptz,
  last_sync_direction text check (last_sync_direction in ('inbound', 'outbound', 'import')),
  -- Echo suppression: skip inbound webhooks within a few seconds of our own push.
  last_outbound_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (integration_id, task_id),
  unique (integration_id, external_id)
);

create index if not exists idx_integrations_account on integrations(account_id);
create index if not exists idx_integrations_workspace on integrations(workspace_id);
create index if not exists idx_integration_parent_links_initiative on integration_parent_links(initiative_id);
create index if not exists idx_integration_parent_links_external on integration_parent_links(external_id);
create index if not exists idx_integration_task_links_task on integration_task_links(task_id);
create index if not exists idx_integration_task_links_external on integration_task_links(external_id);
create index if not exists idx_integration_task_links_parent on integration_task_links(parent_link_id);

alter table integrations enable row level security;
alter table integration_parent_links enable row level security;
alter table integration_task_links enable row level security;

-- Owners manage connections; members can read links in their workspaces.
do $$
begin
  drop policy if exists "integrations_owner_select" on integrations;
  drop policy if exists "integrations_owner_write" on integrations;
  -- Prefer current_user_account_id() (001); fall back helpers may exist as current_account_id().
  create policy "integrations_owner_select" on integrations for select using (
    account_id = current_user_account_id()
    and user_has_workspace_access(workspace_id)
  );
  create policy "integrations_owner_write" on integrations for all using (
    account_id = current_user_account_id()
    and current_user_role() = 'owner'
    and user_has_workspace_access(workspace_id)
  ) with check (
    account_id = current_user_account_id()
    and current_user_role() = 'owner'
    and user_has_workspace_access(workspace_id)
  );

  drop policy if exists "integration_parent_links_select" on integration_parent_links;
  drop policy if exists "integration_parent_links_owner_write" on integration_parent_links;
  create policy "integration_parent_links_select" on integration_parent_links for select using (
    account_id = current_user_account_id()
    and user_has_workspace_access(workspace_id)
  );
  create policy "integration_parent_links_owner_write" on integration_parent_links for all using (
    account_id = current_user_account_id()
    and current_user_role() = 'owner'
  ) with check (
    account_id = current_user_account_id()
    and current_user_role() = 'owner'
  );

  drop policy if exists "integration_task_links_select" on integration_task_links;
  drop policy if exists "integration_task_links_owner_write" on integration_task_links;
  create policy "integration_task_links_select" on integration_task_links for select using (
    account_id = current_user_account_id()
    and user_has_workspace_access(workspace_id)
  );
  create policy "integration_task_links_owner_write" on integration_task_links for all using (
    account_id = current_user_account_id()
    and current_user_role() = 'owner'
  ) with check (
    account_id = current_user_account_id()
    and current_user_role() = 'owner'
  );
end $$;

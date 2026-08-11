-- Run AFTER schema.sql in your Supabase SQL editor.
-- Links auth.users to app users and sets up signup + RLS policies.

-- ============================================================
-- Auth integration: users.id = auth.uid()
-- ============================================================

alter table accounts enable row level security;
alter table users enable row level security;
alter table subscriptions enable row level security;

-- Signup: creates account, user profile, default workspace, tier_1 subscription.
-- Keep in sync with 002_signup_provisioning.sql (idempotent re-apply).
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account_id uuid;
  v_workspace_id uuid;
  v_full_name text;
  v_account_name text;
begin
  if exists (select 1 from public.users where id = new.id) then
    return new;
  end if;

  v_full_name := coalesce(
    nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
    split_part(new.email, '@', 1)
  );
  v_account_name := coalesce(
    nullif(trim(new.raw_user_meta_data->>'account_name'), ''),
    v_full_name || '''s Account'
  );

  insert into accounts (name) values (v_account_name) returning id into v_account_id;

  insert into subscriptions (account_id, plan_tier, billing_cycle, status)
  values (v_account_id, 'tier_1', 'monthly', 'active');

  insert into workspaces (account_id, name)
  values (v_account_id, 'Default Workspace')
  returning id into v_workspace_id;

  insert into users (id, account_id, email, full_name, role, default_workspace_id)
  values (new.id, v_account_id, new.email, v_full_name, 'owner', v_workspace_id);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- App can call this if a session exists without a public.users row
create or replace function ensure_account_for_user()
returns public.users
language plpgsql
security definer
set search_path = public
as $$
declare
  v_auth auth.users%rowtype;
  v_profile public.users%rowtype;
  v_account_id uuid;
  v_workspace_id uuid;
  v_full_name text;
  v_account_name text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_profile from public.users where id = auth.uid();
  if found then
    return v_profile;
  end if;

  select * into v_auth from auth.users where id = auth.uid();
  if not found then
    raise exception 'Auth user not found';
  end if;

  v_full_name := coalesce(
    nullif(trim(v_auth.raw_user_meta_data->>'full_name'), ''),
    split_part(v_auth.email, '@', 1)
  );
  v_account_name := coalesce(
    nullif(trim(v_auth.raw_user_meta_data->>'account_name'), ''),
    v_full_name || '''s Account'
  );

  insert into accounts (name) values (v_account_name) returning id into v_account_id;

  insert into subscriptions (account_id, plan_tier, billing_cycle, status)
  values (v_account_id, 'tier_1', 'monthly', 'active');

  insert into workspaces (account_id, name)
  values (v_account_id, 'Default Workspace')
  returning id into v_workspace_id;

  insert into users (id, account_id, email, full_name, role, default_workspace_id)
  values (v_auth.id, v_account_id, v_auth.email, v_full_name, 'owner', v_workspace_id)
  returning * into v_profile;

  return v_profile;
end;
$$;

revoke all on function ensure_account_for_user() from public;
grant execute on function ensure_account_for_user() to authenticated;

-- Auto-create default Program when Organization is created
create or replace function create_default_program_for_org()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ref int;
begin
  v_ref := next_reference_number(new.account_id, 'program');
  insert into programs (account_id, workspace_id, organization_id, reference_number, name, status)
  values (new.account_id, new.workspace_id, new.id, lpad(v_ref::text, 5, '0'), 'General', 'planning');
  return new;
end;
$$;

drop trigger if exists on_organization_created on organizations;
create trigger on_organization_created
  after insert on organizations
  for each row execute function create_default_program_for_org();

-- Auto-set reference numbers on initiative/impact insert
create or replace function set_initiative_reference()
returns trigger language plpgsql as $$
declare v_ref int;
begin
  if new.reference_number is null then
    v_ref := next_reference_number(new.account_id, 'initiative');
    new.reference_number := lpad(v_ref::text, 5, '0');
  end if;
  return new;
end;
$$;

create trigger trg_initiative_reference
  before insert on initiatives
  for each row execute function set_initiative_reference();

create or replace function set_impact_reference()
returns trigger language plpgsql as $$
declare v_ref int;
begin
  if new.reference_number is null then
    v_ref := next_reference_number(new.account_id, 'impact');
    new.reference_number := lpad(v_ref::text, 5, '0');
  end if;
  return new;
end;
$$;

create trigger trg_impact_reference
  before insert on impacts
  for each row execute function set_impact_reference();

-- Helper for RLS
create or replace function current_user_account_id()
returns uuid language sql stable security definer set search_path = public as $$
  select account_id from users where id = auth.uid()
$$;

create or replace function current_user_role()
returns text language sql stable security definer set search_path = public as $$
  select role from users where id = auth.uid()
$$;

create or replace function user_has_workspace_access(p_workspace_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select
    (select role from users where id = auth.uid()) = 'owner'
    or exists (
      select 1 from workspace_members
      where user_id = auth.uid() and workspace_id = p_workspace_id
    )
$$;

-- ============================================================
-- RLS Policies
-- ============================================================

-- accounts: owners see their account
create policy "owners_read_own_account" on accounts for select using (
  id = current_user_account_id()
);

-- users: see users on same account
create policy "users_same_account" on users for select using (
  account_id = current_user_account_id()
);
create policy "users_update_self" on users for update using (
  id = auth.uid()
);

-- subscriptions: account owners
create policy "subscriptions_owner" on subscriptions for select using (
  account_id = current_user_account_id()
);

-- Macro for workspace-scoped tables
-- workspaces
create policy "workspaces_access" on workspaces for all using (
  account_id = current_user_account_id()
  and user_has_workspace_access(id)
) with check (
  account_id = current_user_account_id()
  and (
    current_user_role() = 'owner'
    or user_has_workspace_access(id)
  )
);

create policy "workspace_members_access" on workspace_members for all using (
  account_id = current_user_account_id()
  and user_has_workspace_access(workspace_id)
) with check (
  account_id = current_user_account_id()
);

-- Repeat owner_or_workspace_member pattern for all data tables
do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'organizations', 'departments', 'people', 'project_teams', 'project_team_members',
    'programs', 'initiatives', 'impacts', 'stakeholders', 'learning_needs', 'comms',
    'cost_entries', 'hypercare'
  ]
  loop
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

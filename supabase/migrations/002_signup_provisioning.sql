-- Apply in the Supabase SQL editor (safe to re-run).
-- Ensures every auth.users insert provisions:
--   accounts + subscriptions (tier_1) + workspaces + users (owner)
-- Also exposes ensure_account_for_user() so the app can recover if a
-- user was created before this trigger existed.

create or replace function public.handle_new_user()
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
  -- Idempotent: auth retry / re-fire must not create duplicates
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

  insert into public.accounts (name)
  values (v_account_name)
  returning id into v_account_id;

  insert into public.subscriptions (account_id, plan_tier, billing_cycle, status)
  values (v_account_id, 'tier_1', 'monthly', 'active');

  insert into public.workspaces (account_id, name)
  values (v_account_id, 'Default Workspace')
  returning id into v_workspace_id;

  insert into public.users (id, account_id, email, full_name, role, default_workspace_id)
  values (new.id, v_account_id, new.email, v_full_name, 'owner', v_workspace_id);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Recovery path for users who already exist in auth.users without app rows
create or replace function public.ensure_account_for_user()
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

  insert into public.accounts (name)
  values (v_account_name)
  returning id into v_account_id;

  insert into public.subscriptions (account_id, plan_tier, billing_cycle, status)
  values (v_account_id, 'tier_1', 'monthly', 'active');

  insert into public.workspaces (account_id, name)
  values (v_account_id, 'Default Workspace')
  returning id into v_workspace_id;

  insert into public.users (id, account_id, email, full_name, role, default_workspace_id)
  values (v_auth.id, v_account_id, v_auth.email, v_full_name, 'owner', v_workspace_id)
  returning * into v_profile;

  return v_profile;
end;
$$;

revoke all on function public.ensure_account_for_user() from public;
grant execute on function public.ensure_account_for_user() to authenticated;

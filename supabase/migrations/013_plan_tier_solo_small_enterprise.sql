-- Canonical plan_tier IDs: solo | small | enterprise (no tier_1 / tier_2).
-- Migrates existing rows, updates constraints, signup mapper, and workspace limit trigger.

alter table public.subscriptions drop constraint if exists subscriptions_plan_tier_check;
alter table public.subscriptions drop constraint if exists tier_1_must_be_monthly;
alter table public.subscriptions drop constraint if exists solo_must_be_monthly;

update public.subscriptions set plan_tier = 'solo' where plan_tier = 'tier_1';
update public.subscriptions set plan_tier = 'enterprise' where plan_tier = 'tier_2';

alter table public.subscriptions
  add constraint subscriptions_plan_tier_check
  check (plan_tier in ('solo', 'small', 'enterprise'));

alter table public.subscriptions
  add constraint solo_must_be_monthly
  check (plan_tier <> 'solo' or billing_cycle = 'monthly');

-- Accept legacy metadata (tier_1/tier_2) once, but always store the new IDs.
create or replace function public.map_signup_plan_tier(p_raw text)
returns text
language sql
immutable
as $$
  select case lower(coalesce(nullif(trim(p_raw), ''), 'solo'))
    when 'solo' then 'solo'
    when 'tier_1' then 'solo'
    when 'small' then 'small'
    when 'enterprise' then 'enterprise'
    when 'tier_2' then 'enterprise'
    else 'solo'
  end;
$$;

create or replace function public.enforce_workspace_tier_limit()
returns trigger
language plpgsql
as $$
declare
  v_plan_tier text;
  v_existing_count int;
begin
  select plan_tier into v_plan_tier from public.subscriptions where account_id = new.account_id;

  if v_plan_tier = 'solo' then
    select count(*) into v_existing_count from public.workspaces where account_id = new.account_id;
    if v_existing_count >= 1 then
      raise exception 'Sole Proprietor plans are limited to a single Workspace. Upgrade to Business or Enterprise to add more.';
    end if;
  end if;

  return new;
end;
$$;

-- Keep signup provisioning on incomplete + Stripe-managed trials, but gate billing on 'solo'.
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
  v_invited_account uuid;
  v_plan_tier text;
  v_billing text;
begin
  if exists (select 1 from public.users where id = new.id) then
    return new;
  end if;

  v_full_name := coalesce(
    nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
    split_part(new.email, '@', 1)
  );

  v_invited_account := nullif(trim(new.raw_user_meta_data->>'invited_to_account_id'), '')::uuid;

  if v_invited_account is not null then
    if not exists (select 1 from public.accounts where id = v_invited_account) then
      raise exception 'Invited account does not exist';
    end if;

    v_workspace_id := nullif(trim(new.raw_user_meta_data->>'default_workspace_id'), '')::uuid;

    insert into public.users (id, account_id, email, full_name, role, default_workspace_id)
    values (new.id, v_invited_account, new.email, v_full_name, 'member', v_workspace_id);

    return new;
  end if;

  v_account_name := coalesce(
    nullif(trim(new.raw_user_meta_data->>'account_name'), ''),
    v_full_name || '''s Account'
  );

  v_plan_tier := public.map_signup_plan_tier(new.raw_user_meta_data->>'plan_tier');
  v_billing := case
    when v_plan_tier = 'solo' then 'monthly'
    when lower(coalesce(new.raw_user_meta_data->>'billing_cycle', 'monthly')) = 'annual' then 'annual'
    else 'monthly'
  end;

  insert into public.accounts (name)
  values (v_account_name)
  returning id into v_account_id;

  insert into public.subscriptions (account_id, plan_tier, billing_cycle, status, trial_ends_at)
  values (v_account_id, v_plan_tier, v_billing, 'incomplete', null);

  insert into public.workspaces (account_id, name)
  values (v_account_id, 'Default Workspace')
  returning id into v_workspace_id;

  insert into public.users (id, account_id, email, full_name, role, default_workspace_id)
  values (new.id, v_account_id, new.email, v_full_name, 'owner', v_workspace_id);

  return new;
end;
$$;

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
  v_plan_tier text;
  v_billing text;
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

  if nullif(trim(v_auth.raw_user_meta_data->>'invited_to_account_id'), '') is not null then
    raise exception 'Invite profile missing; contact your account owner';
  end if;

  v_full_name := coalesce(
    nullif(trim(v_auth.raw_user_meta_data->>'full_name'), ''),
    split_part(v_auth.email, '@', 1)
  );
  v_account_name := coalesce(
    nullif(trim(v_auth.raw_user_meta_data->>'account_name'), ''),
    v_full_name || '''s Account'
  );

  v_plan_tier := public.map_signup_plan_tier(v_auth.raw_user_meta_data->>'plan_tier');
  v_billing := case
    when v_plan_tier = 'solo' then 'monthly'
    when lower(coalesce(v_auth.raw_user_meta_data->>'billing_cycle', 'monthly')) = 'annual' then 'annual'
    else 'monthly'
  end;

  insert into public.accounts (name)
  values (v_account_name)
  returning id into v_account_id;

  insert into public.subscriptions (account_id, plan_tier, billing_cycle, status, trial_ends_at)
  values (v_account_id, v_plan_tier, v_billing, 'incomplete', null);

  insert into public.workspaces (account_id, name)
  values (v_account_id, 'Default Workspace')
  returning id into v_workspace_id;

  insert into public.users (id, account_id, email, full_name, role, default_workspace_id)
  values (v_auth.id, v_account_id, v_auth.email, v_full_name, 'owner', v_workspace_id)
  returning * into v_profile;

  return v_profile;
end;
$$;

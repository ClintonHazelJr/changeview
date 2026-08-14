-- 7-day free trial support on subscriptions.
-- Safe to re-run where constraints/columns already match.

alter table subscriptions
  add column if not exists trial_ends_at timestamptz;

alter table subscriptions alter column status set default 'trialing';

alter table subscriptions drop constraint if exists subscriptions_status_check;
alter table subscriptions
  add constraint subscriptions_status_check
  check (status in ('trialing', 'active', 'cancelled', 'past_due'));

-- Allow Small as a first-class plan_tier (Solo=tier_1, Enterprise=tier_2).
alter table subscriptions drop constraint if exists subscriptions_plan_tier_check;
alter table subscriptions
  add constraint subscriptions_plan_tier_check
  check (plan_tier in ('tier_1', 'small', 'tier_2'));

-- Map marketing plan keys from auth signup metadata → DB plan_tier.
create or replace function public.map_signup_plan_tier(p_raw text)
returns text
language sql
immutable
as $$
  select case lower(coalesce(nullif(trim(p_raw), ''), 'tier_1'))
    when 'solo' then 'tier_1'
    when 'tier_1' then 'tier_1'
    when 'small' then 'small'
    when 'enterprise' then 'tier_2'
    when 'tier_2' then 'tier_2'
    else 'tier_1'
  end;
$$;

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
    when v_plan_tier = 'tier_1' then 'monthly'
    when lower(coalesce(new.raw_user_meta_data->>'billing_cycle', 'monthly')) = 'annual' then 'annual'
    else 'monthly'
  end;

  insert into public.accounts (name)
  values (v_account_name)
  returning id into v_account_id;

  insert into public.subscriptions (account_id, plan_tier, billing_cycle, status, trial_ends_at)
  values (v_account_id, v_plan_tier, v_billing, 'trialing', now() + interval '7 days');

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

  -- Invited members should already have a users row from the trigger.
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
    when v_plan_tier = 'tier_1' then 'monthly'
    when lower(coalesce(v_auth.raw_user_meta_data->>'billing_cycle', 'monthly')) = 'annual' then 'annual'
    else 'monthly'
  end;

  insert into public.accounts (name)
  values (v_account_name)
  returning id into v_account_id;

  insert into public.subscriptions (account_id, plan_tier, billing_cycle, status, trial_ends_at)
  values (v_account_id, v_plan_tier, v_billing, 'trialing', now() + interval '7 days');

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

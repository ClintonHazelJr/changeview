-- Consent + onboarding timestamps on public.users (idempotent if already applied).
alter table public.users
  add column if not exists terms_accepted_at timestamptz;

alter table public.users
  add column if not exists onboarding_completed_at timestamptz;

comment on column public.users.terms_accepted_at is
  'When the user accepted Terms of Service and Privacy Policy at signup.';
comment on column public.users.onboarding_completed_at is
  'When the user finished or dismissed the in-app onboarding tour. Null = show tour.';

-- Persist terms acceptance from signup metadata (terms_accepted = true).
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
  v_terms_at timestamptz;
begin
  if exists (select 1 from public.users where id = new.id) then
    return new;
  end if;

  v_full_name := coalesce(
    nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
    split_part(new.email, '@', 1)
  );

  v_terms_at := case
    when lower(coalesce(new.raw_user_meta_data->>'terms_accepted', '')) in ('true', '1', 'yes')
      then now()
    else null
  end;

  v_invited_account := nullif(trim(new.raw_user_meta_data->>'invited_to_account_id'), '')::uuid;

  if v_invited_account is not null then
    if not exists (select 1 from public.accounts where id = v_invited_account) then
      raise exception 'Invited account does not exist';
    end if;

    v_workspace_id := nullif(trim(new.raw_user_meta_data->>'default_workspace_id'), '')::uuid;

    insert into public.users (id, account_id, email, full_name, role, default_workspace_id, terms_accepted_at)
    values (new.id, v_invited_account, new.email, v_full_name, 'member', v_workspace_id, v_terms_at);

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

  insert into public.users (id, account_id, email, full_name, role, default_workspace_id, terms_accepted_at)
  values (new.id, v_account_id, new.email, v_full_name, 'owner', v_workspace_id, v_terms_at);

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
  v_terms_at timestamptz;
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

  v_terms_at := case
    when lower(coalesce(v_auth.raw_user_meta_data->>'terms_accepted', '')) in ('true', '1', 'yes')
      then now()
    else null
  end;

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

  insert into public.users (id, account_id, email, full_name, role, default_workspace_id, terms_accepted_at)
  values (v_auth.id, v_account_id, v_auth.email, v_full_name, 'owner', v_workspace_id, v_terms_at)
  returning * into v_profile;

  return v_profile;
end;
$$;

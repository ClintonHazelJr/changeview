-- Invited members must join the inviter's account, not get a brand-new tenancy.
-- Auth invite metadata keys:
--   invited_to_account_id (uuid, required for invite path)
--   default_workspace_id (uuid, optional)
--   full_name (text, optional)

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

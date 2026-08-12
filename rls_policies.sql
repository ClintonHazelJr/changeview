-- ============================================================
-- RLS Policies for ChangeView (v2 — fixes infinite recursion)
--
-- Run this whole file. It first drops the policies from the previous
-- version (which caused "infinite recursion detected in policy for
-- relation users"), then rebuilds everything using two small helper
-- functions instead of direct subqueries on users. The helper functions
-- are SECURITY DEFINER, which lets that one internal lookup skip RLS,
-- breaking the self-reference loop. This is Supabase's documented fix
-- for this exact error.
-- ============================================================

-- ---------- Drop the old, recursive policies ----------

drop policy if exists "owner_or_member_workspaces" on workspaces;
drop policy if exists "read_users_same_account" on users;
drop policy if exists "update_own_user_row" on users;
drop policy if exists "owner_manages_workspace_members" on workspace_members;
drop policy if exists "member_reads_own_membership" on workspace_members;
drop policy if exists "owner_or_member_organizations" on organizations;
drop policy if exists "owner_or_member_departments" on departments;
drop policy if exists "owner_or_member_people" on people;
drop policy if exists "owner_or_member_project_teams" on project_teams;
drop policy if exists "owner_or_member_project_team_members" on project_team_members;
drop policy if exists "owner_or_member_programs" on programs;
drop policy if exists "owner_or_member_initiatives" on initiatives;
drop policy if exists "owner_or_member_impacts" on impacts;
drop policy if exists "owner_or_member_stakeholders" on stakeholders;
drop policy if exists "owner_or_member_learning_needs" on learning_needs;
drop policy if exists "owner_or_member_comms" on comms;
drop policy if exists "owner_or_member_hypercare" on hypercare;
drop policy if exists "owner_or_member_cost_entries" on cost_entries;
drop policy if exists "owner_or_member_requirements" on requirements;
drop policy if exists "owner_or_member_requirement_impacts" on requirement_impacts;
drop policy if exists "owner_or_member_impact_attachments" on impact_attachments;
drop policy if exists "owner_or_member_learning_need_attachments" on learning_need_attachments;
drop policy if exists "owners_read_own_account" on accounts;
drop policy if exists "subscriptions_owner" on subscriptions;

-- ---------- Helper functions (bypass RLS internally, break the loop) ----------

create or replace function public.current_account_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select account_id from users where id = auth.uid()
$$;

create or replace function public.current_user_role()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select role from users where id = auth.uid()
$$;

create or replace function public.current_workspace_ids()
returns setof uuid
language sql
security definer
stable
set search_path = public
as $$
  select workspace_id from workspace_members where user_id = auth.uid()
$$;

-- ---------- Users (special case: policy on the table the helpers read from) ----------

create policy "read_users_same_account" on users
  for select
  using (account_id = public.current_account_id());

create policy "update_own_user_row" on users
  for update
  using (id = auth.uid());

-- ---------- Workspaces ----------

create policy "owner_or_member_workspaces" on workspaces
  for all
  using (
    account_id = public.current_account_id()
    and (public.current_user_role() = 'owner' or id in (select public.current_workspace_ids()))
  )
  with check (
    account_id = public.current_account_id()
    and (public.current_user_role() = 'owner' or id in (select public.current_workspace_ids()))
  );

-- ---------- workspace_members ----------

create policy "owner_manages_workspace_members" on workspace_members
  for all
  using (account_id = public.current_account_id() and public.current_user_role() = 'owner')
  with check (account_id = public.current_account_id() and public.current_user_role() = 'owner');

create policy "member_reads_own_membership" on workspace_members
  for select
  using (user_id = auth.uid());

create policy "owner_or_member_organizations" on organizations
  for all
  using (
    account_id = public.current_account_id()
    and (public.current_user_role() = 'owner' or workspace_id in (select public.current_workspace_ids()))
  )
  with check (
    account_id = public.current_account_id()
    and (public.current_user_role() = 'owner' or workspace_id in (select public.current_workspace_ids()))
  );

create policy "owner_or_member_departments" on departments
  for all
  using (
    account_id = public.current_account_id()
    and (public.current_user_role() = 'owner' or workspace_id in (select public.current_workspace_ids()))
  )
  with check (
    account_id = public.current_account_id()
    and (public.current_user_role() = 'owner' or workspace_id in (select public.current_workspace_ids()))
  );

create policy "owner_or_member_people" on people
  for all
  using (
    account_id = public.current_account_id()
    and (public.current_user_role() = 'owner' or workspace_id in (select public.current_workspace_ids()))
  )
  with check (
    account_id = public.current_account_id()
    and (public.current_user_role() = 'owner' or workspace_id in (select public.current_workspace_ids()))
  );

create policy "owner_or_member_project_teams" on project_teams
  for all
  using (
    account_id = public.current_account_id()
    and (public.current_user_role() = 'owner' or workspace_id in (select public.current_workspace_ids()))
  )
  with check (
    account_id = public.current_account_id()
    and (public.current_user_role() = 'owner' or workspace_id in (select public.current_workspace_ids()))
  );

create policy "owner_or_member_project_team_members" on project_team_members
  for all
  using (
    account_id = public.current_account_id()
    and (public.current_user_role() = 'owner' or workspace_id in (select public.current_workspace_ids()))
  )
  with check (
    account_id = public.current_account_id()
    and (public.current_user_role() = 'owner' or workspace_id in (select public.current_workspace_ids()))
  );

create policy "owner_or_member_programs" on programs
  for all
  using (
    account_id = public.current_account_id()
    and (public.current_user_role() = 'owner' or workspace_id in (select public.current_workspace_ids()))
  )
  with check (
    account_id = public.current_account_id()
    and (public.current_user_role() = 'owner' or workspace_id in (select public.current_workspace_ids()))
  );

create policy "owner_or_member_initiatives" on initiatives
  for all
  using (
    account_id = public.current_account_id()
    and (public.current_user_role() = 'owner' or workspace_id in (select public.current_workspace_ids()))
  )
  with check (
    account_id = public.current_account_id()
    and (public.current_user_role() = 'owner' or workspace_id in (select public.current_workspace_ids()))
  );

create policy "owner_or_member_impacts" on impacts
  for all
  using (
    account_id = public.current_account_id()
    and (public.current_user_role() = 'owner' or workspace_id in (select public.current_workspace_ids()))
  )
  with check (
    account_id = public.current_account_id()
    and (public.current_user_role() = 'owner' or workspace_id in (select public.current_workspace_ids()))
  );

create policy "owner_or_member_stakeholders" on stakeholders
  for all
  using (
    account_id = public.current_account_id()
    and (public.current_user_role() = 'owner' or workspace_id in (select public.current_workspace_ids()))
  )
  with check (
    account_id = public.current_account_id()
    and (public.current_user_role() = 'owner' or workspace_id in (select public.current_workspace_ids()))
  );

create policy "owner_or_member_learning_needs" on learning_needs
  for all
  using (
    account_id = public.current_account_id()
    and (public.current_user_role() = 'owner' or workspace_id in (select public.current_workspace_ids()))
  )
  with check (
    account_id = public.current_account_id()
    and (public.current_user_role() = 'owner' or workspace_id in (select public.current_workspace_ids()))
  );

create policy "owner_or_member_comms" on comms
  for all
  using (
    account_id = public.current_account_id()
    and (public.current_user_role() = 'owner' or workspace_id in (select public.current_workspace_ids()))
  )
  with check (
    account_id = public.current_account_id()
    and (public.current_user_role() = 'owner' or workspace_id in (select public.current_workspace_ids()))
  );

create policy "owner_or_member_hypercare" on hypercare
  for all
  using (
    account_id = public.current_account_id()
    and (public.current_user_role() = 'owner' or workspace_id in (select public.current_workspace_ids()))
  )
  with check (
    account_id = public.current_account_id()
    and (public.current_user_role() = 'owner' or workspace_id in (select public.current_workspace_ids()))
  );

create policy "owner_or_member_cost_entries" on cost_entries
  for all
  using (
    account_id = public.current_account_id()
    and (public.current_user_role() = 'owner' or workspace_id in (select public.current_workspace_ids()))
  )
  with check (
    account_id = public.current_account_id()
    and (public.current_user_role() = 'owner' or workspace_id in (select public.current_workspace_ids()))
  );

create policy "owner_or_member_requirements" on requirements
  for all
  using (
    account_id = public.current_account_id()
    and (public.current_user_role() = 'owner' or workspace_id in (select public.current_workspace_ids()))
  )
  with check (
    account_id = public.current_account_id()
    and (public.current_user_role() = 'owner' or workspace_id in (select public.current_workspace_ids()))
  );

create policy "owner_or_member_requirement_impacts" on requirement_impacts
  for all
  using (
    account_id = public.current_account_id()
    and (public.current_user_role() = 'owner' or workspace_id in (select public.current_workspace_ids()))
  )
  with check (
    account_id = public.current_account_id()
    and (public.current_user_role() = 'owner' or workspace_id in (select public.current_workspace_ids()))
  );

create policy "owner_or_member_impact_attachments" on impact_attachments
  for all
  using (
    account_id = public.current_account_id()
    and (public.current_user_role() = 'owner' or workspace_id in (select public.current_workspace_ids()))
  )
  with check (
    account_id = public.current_account_id()
    and (public.current_user_role() = 'owner' or workspace_id in (select public.current_workspace_ids()))
  );

create policy "owner_or_member_learning_need_attachments" on learning_need_attachments
  for all
  using (
    account_id = public.current_account_id()
    and (public.current_user_role() = 'owner' or workspace_id in (select public.current_workspace_ids()))
  )
  with check (
    account_id = public.current_account_id()
    and (public.current_user_role() = 'owner' or workspace_id in (select public.current_workspace_ids()))
  );

alter table accounts enable row level security;
alter table subscriptions enable row level security;

create policy "owners_read_own_account" on accounts
  for select
  using (id = public.current_account_id());

create policy "subscriptions_owner" on subscriptions
  for select
  using (account_id = public.current_account_id());

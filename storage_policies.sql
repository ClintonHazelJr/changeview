-- Run AFTER creating a private Storage bucket named "attachments"
-- in the Supabase dashboard. Uses the same helper functions as rls_policies.sql.

-- Object path format:
--   {account_id}/{workspace_id}/impacts/{impact_id}/{filename}
--   {account_id}/{workspace_id}/learning-needs/{learning_need_id}/{filename}

drop policy if exists "attachments_select" on storage.objects;
drop policy if exists "attachments_insert" on storage.objects;
drop policy if exists "attachments_update" on storage.objects;
drop policy if exists "attachments_delete" on storage.objects;

create policy "attachments_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] = public.current_account_id()::text
    and (
      public.current_user_role() = 'owner'
      or (storage.foldername(name))[2]::uuid in (select public.current_workspace_ids())
    )
  );

create policy "attachments_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] = public.current_account_id()::text
    and (
      public.current_user_role() = 'owner'
      or (storage.foldername(name))[2]::uuid in (select public.current_workspace_ids())
    )
  );

create policy "attachments_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] = public.current_account_id()::text
    and (
      public.current_user_role() = 'owner'
      or (storage.foldername(name))[2]::uuid in (select public.current_workspace_ids())
    )
  )
  with check (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] = public.current_account_id()::text
    and (
      public.current_user_role() = 'owner'
      or (storage.foldername(name))[2]::uuid in (select public.current_workspace_ids())
    )
  );

create policy "attachments_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] = public.current_account_id()::text
    and (
      public.current_user_role() = 'owner'
      or (storage.foldername(name))[2]::uuid in (select public.current_workspace_ids())
    )
  );

-- Table RLS for attachment metadata also lives in rls_policies.sql
-- (owner_or_member_impact_attachments / owner_or_member_learning_need_attachments).
-- Re-run rls_policies.sql after creating the tables if those policies are missing.

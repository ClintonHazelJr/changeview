-- Allow requirements.status = completed (auto-set by DB triggers when all
-- linked tasks are done; also selectable manually in the app).

alter table public.requirements drop constraint if exists requirements_status_check;

alter table public.requirements
  add constraint requirements_status_check
  check (status in ('draft', 'approved', 'rejected', 'completed'));

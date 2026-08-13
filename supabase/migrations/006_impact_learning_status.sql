-- Status on Impacts and Learning Needs (draft / approved / rejected).
-- Safe to re-run if columns already exist.

alter table impacts
  add column if not exists status text not null default 'draft';

alter table learning_needs
  add column if not exists status text not null default 'draft';

alter table impacts drop constraint if exists impacts_status_check;
alter table impacts
  add constraint impacts_status_check
  check (status in ('draft', 'approved', 'rejected'));

alter table learning_needs drop constraint if exists learning_needs_status_check;
alter table learning_needs
  add constraint learning_needs_status_check
  check (status in ('draft', 'approved', 'rejected'));

-- Soft-deactivate departments. Safe if column already exists.

alter table departments
  add column if not exists is_active boolean not null default true;

comment on column departments.is_active is
  'false = deactivated; hidden from assign-to pickers by default. Historical references keep showing the name.';

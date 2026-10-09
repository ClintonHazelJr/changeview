-- Soft-deactivate people (directory). Safe if column already exists.

alter table people
  add column if not exists is_active boolean not null default true;

comment on column people.is_active is
  'false = deactivated; hidden from assign-to pickers. Historical references keep showing the name.';

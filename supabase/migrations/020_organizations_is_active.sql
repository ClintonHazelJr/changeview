-- Soft-deactivate organizations with one-way cascade.
-- Safe if column / trigger already exists (user may have applied remotely).

alter table organizations
  add column if not exists is_active boolean not null default true;

comment on column organizations.is_active is
  'false = deactivated; cascades to departments, people under them, and archives programs. Reactivation does not cascade.';

create or replace function cascade_organization_deactivate()
returns trigger as $$
begin
  if old.is_active is distinct from false and new.is_active = false then
    update departments
    set is_active = false
    where org_id = new.id
      and is_active is distinct from false;

    update people
    set is_active = false
    where department_id in (select id from departments where org_id = new.id)
      and is_active is distinct from false;

    -- Archive programs; initiatives cascade via trigger_cascade_program_archive.
    update programs
    set archived_at = coalesce(archived_at, now())
    where organization_id = new.id
      and archived_at is null;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trigger_cascade_organization_deactivate on organizations;
create trigger trigger_cascade_organization_deactivate
  after update on organizations
  for each row execute function cascade_organization_deactivate();

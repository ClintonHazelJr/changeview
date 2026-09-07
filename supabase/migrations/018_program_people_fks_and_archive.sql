-- Fix Program.program_manager_id / sponsor_id to reference People, same bug
-- as the Initiative owner fields. Clear unusable user-id values first.
-- Also: initiative.program_id ON DELETE CASCADE, archived_at + cascade archive.

alter table programs drop constraint if exists programs_program_manager_id_fkey;
alter table programs drop constraint if exists programs_sponsor_id_fkey;

update programs set program_manager_id = null, sponsor_id = null;

alter table programs add constraint programs_program_manager_id_fkey
  foreign key (program_manager_id) references people(id);

alter table programs add constraint programs_sponsor_id_fkey
  foreign key (sponsor_id) references people(id);

-- Fix Initiative.program_id to cascade on delete.
alter table initiatives drop constraint if exists initiatives_program_id_fkey;
alter table initiatives add constraint initiatives_program_id_fkey
  foreign key (program_id) references programs(id) on delete cascade;

-- Soft-archive columns.
alter table programs add column if not exists archived_at timestamptz;
alter table initiatives add column if not exists archived_at timestamptz;

comment on column programs.archived_at is
  'When set, program is archived (hidden by default). Cascades to child initiatives via trigger.';
comment on column initiatives.archived_at is
  'When set, initiative is archived (hidden by default).';

-- Cascade archive from Program down to its Initiatives.
create or replace function cascade_program_archive()
returns trigger as $$
begin
  if old.archived_at is null and new.archived_at is not null then
    update initiatives
    set archived_at = new.archived_at
    where program_id = new.id and archived_at is null;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trigger_cascade_program_archive on programs;
create trigger trigger_cascade_program_archive
  after update on programs
  for each row execute function cascade_program_archive();

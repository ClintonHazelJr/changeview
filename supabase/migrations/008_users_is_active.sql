-- Soft-deactivate users (seat-aware). Safe if column / triggers already exist.

alter table users
  add column if not exists is_active boolean not null default true;

-- Optional: document-only comment for operators.
comment on column users.is_active is
  'false = deactivated; frees a seat. Auth ban is enforced in /api/deactivate-user.';

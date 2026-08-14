-- Hypercare schedule dates (duration text remains for free-form notes).
alter table public.hypercare
  add column if not exists start_date date,
  add column if not exists end_date date;

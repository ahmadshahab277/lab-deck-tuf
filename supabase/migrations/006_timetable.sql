-- Paste into the Supabase SQL editor and click Run.
-- Stores the instructor timetable read from an uploaded picture.

create table public.timetable_slots (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  start_time text not null check (start_time ~ '^\d{2}:\d{2}$'),
  end_time text not null check (end_time ~ '^\d{2}:\d{2}$'),
  title text not null,
  course_code text not null default '',
  room text not null default '',
  section text not null default '',
  class_id uuid references public.classes (id) on delete set null,
  created_at timestamptz not null default now()
);

create index timetable_slots_owner_day_idx
  on public.timetable_slots (owner_id, day_of_week, start_time);

create table public.timetable_sources (
  owner_id uuid primary key references public.profiles (id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  slot_count integer not null default 0 check (slot_count >= 0),
  updated_at timestamptz not null default now()
);

alter table public.timetable_slots enable row level security;
alter table public.timetable_sources enable row level security;

grant select, insert, update, delete on public.timetable_slots to authenticated;
grant select, insert, update, delete on public.timetable_sources to authenticated;

create policy timetable_slots_owner
  on public.timetable_slots for all
  to authenticated
  using (owner_id = auth.uid() and public.is_admin())
  with check (owner_id = auth.uid() and public.is_admin());

create policy timetable_sources_owner
  on public.timetable_sources for all
  to authenticated
  using (owner_id = auth.uid() and public.is_admin())
  with check (owner_id = auth.uid() and public.is_admin());

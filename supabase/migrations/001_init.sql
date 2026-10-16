-- TUF LabDesk schema, RLS, and student class-access functions.
-- Run in the Supabase SQL editor (or via supabase db push).

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.admin_allowlist (
  email text primary key,
  full_name text not null,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  full_name text not null,
  role text not null check (role = 'admin'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  course_code text not null,
  semester text not null,
  section text not null,
  academic_year text not null,
  timezone text not null default 'Asia/Karachi',
  outline text not null default '',
  submission_guidelines text not null default '',
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.class_access_settings (
  class_id uuid primary key references public.classes (id) on delete cascade,
  password_hash text not null,
  password_updated_at timestamptz not null default now(),
  access_enabled boolean not null default true
);

create table public.access_attempts (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  fingerprint text not null,
  success boolean not null default false,
  attempted_at timestamptz not null default now()
);

create table public.class_sessions (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  last_seen_at timestamptz not null default now()
);

create table public.lab_tasks (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  lab_number integer not null check (lab_number > 0),
  title text not null,
  objectives text not null default '',
  instructions text not null default '',
  exercises text not null default '',
  required_concepts text not null default '',
  sample_input text not null default '',
  sample_output text not null default '',
  deadline timestamptz,
  printing_requirements text not null default '',
  submission_guidelines text not null default '',
  assessment_criteria text not null default '',
  manual_resource_id uuid,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (class_id, lab_number)
);

create table public.resources (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  title text not null,
  description text not null default '',
  resource_type text not null check (resource_type in (
    'outline', 'lecture', 'lab_manual', 'slides', 'code', 'handout', 'other'
  )),
  topic text not null default '',
  week_number integer,
  lecture_number integer,
  related_lab_id uuid references public.lab_tasks (id) on delete set null,
  file_name text not null,
  file_mime text not null,
  file_size bigint not null default 0 check (file_size >= 0),
  storage_path text not null,
  version integer not null default 1 check (version > 0),
  is_current boolean not null default true,
  replaces_id uuid references public.resources (id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.lab_tasks
  add constraint lab_tasks_manual_resource_fk
  foreign key (manual_resource_id) references public.resources (id) on delete set null;

create table public.task_assignments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  title text not null,
  description text not null default '',
  instructions text not null default '',
  assignee_type text not null check (assignee_type in ('individual', 'group', 'class')),
  assignee_name text not null default '',
  deadline timestamptz,
  status text not null default 'upcoming' check (status in (
    'upcoming', 'in_progress', 'completed', 'overdue', 'cancelled'
  )),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high')),
  related_lab_id uuid references public.lab_tasks (id) on delete set null,
  related_resource_id uuid references public.resources (id) on delete set null,
  why_it_matters text not null default '',
  admin_notes text not null default '',
  is_published boolean not null default false,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  completed_by uuid references public.profiles (id)
);

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  title text not null,
  body text not null,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  pinned boolean not null default false,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

create table public.class_guidelines (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  template_key text not null,
  title text not null,
  body text not null,
  is_override boolean not null default false,
  status text not null default 'published' check (status in ('draft', 'published', 'archived')),
  updated_by uuid references public.profiles (id),
  updated_at timestamptz not null default now(),
  unique (class_id, template_key)
);

create table public.class_progress (
  class_id uuid primary key references public.classes (id) on delete cascade,
  last_week integer,
  last_lecture_number integer,
  last_lab_number integer,
  last_topic text not null default '',
  notes text not null default '',
  updated_by uuid references public.profiles (id),
  updated_at timestamptz not null default now()
);

create table public.taught_topics (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  title text not null,
  week_number integer,
  taught_on date,
  notes text not null default '',
  resource_id uuid references public.resources (id) on delete set null,
  lab_id uuid references public.lab_tasks (id) on delete set null,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index classes_status_idx on public.classes (status);
create index classes_created_by_idx on public.classes (created_by);
create index resources_class_idx on public.resources (class_id, status, is_current);
create index resources_type_idx on public.resources (class_id, resource_type);
create index lab_tasks_class_idx on public.lab_tasks (class_id, status, lab_number);
create index task_assignments_class_idx on public.task_assignments (class_id, is_published, deadline);
create index announcements_class_idx on public.announcements (class_id, status, pinned, published_at desc);
create index guidelines_class_idx on public.class_guidelines (class_id, status);
create index taught_topics_class_idx on public.taught_topics (class_id, taught_on desc);
create index access_attempts_lookup_idx on public.access_attempts (class_id, fingerprint, attempted_at desc);
create index access_attempts_class_time_idx on public.access_attempts (class_id, attempted_at desc);
create index class_sessions_active_idx on public.class_sessions (class_id) where revoked_at is null;

-- ---------------------------------------------------------------------------
-- Utility triggers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger classes_updated_at before update on public.classes
  for each row execute function public.set_updated_at();
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger resources_updated_at before update on public.resources
  for each row execute function public.set_updated_at();
create trigger lab_tasks_updated_at before update on public.lab_tasks
  for each row execute function public.set_updated_at();
create trigger task_assignments_updated_at before update on public.task_assignments
  for each row execute function public.set_updated_at();
create trigger announcements_updated_at before update on public.announcements
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  allowed public.admin_allowlist%rowtype;
begin
  select * into allowed
  from public.admin_allowlist
  where lower(email) = lower(new.email);

  if found then
    insert into public.profiles (id, email, full_name, role)
    values (new.id, new.email, allowed.full_name, 'admin')
    on conflict (id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Auth helpers
-- ---------------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

create or replace function public.provision_admins()
returns table (email text, provisioned boolean)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  insert into public.profiles (id, email, full_name, role)
  select u.id, u.email, a.full_name, 'admin'
  from auth.users u
  join public.admin_allowlist a on lower(a.email) = lower(u.email)
  on conflict (id) do update
    set email = excluded.email,
        full_name = excluded.full_name,
        role = 'admin'
  returning profiles.email, true;
end;
$$;

create or replace function public.student_session_class_id(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_class_id uuid;
begin
  if p_token is null or length(p_token) < 16 then
    return null;
  end if;

  select s.class_id into v_class_id
  from public.class_sessions s
  join public.classes c on c.id = s.class_id
  join public.class_access_settings a on a.class_id = c.id
  where s.token_hash = encode(digest(p_token, 'sha256'), 'hex')
    and s.revoked_at is null
    and s.expires_at > now()
    and c.status = 'published'
    and a.access_enabled = true;

  if v_class_id is not null then
    update public.class_sessions
    set last_seen_at = now()
    where token_hash = encode(digest(p_token, 'sha256'), 'hex')
      and revoked_at is null;
  end if;

  return v_class_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Class password verification (hashed, rate limited, generic errors)
-- ---------------------------------------------------------------------------

create or replace function public.verify_class_password(
  p_slug text,
  p_password text,
  p_fingerprint text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_class public.classes%rowtype;
  v_settings public.class_access_settings%rowtype;
  v_fail_fp integer := 0;
  v_fail_class integer := 0;
  v_token text;
  v_hash text;
  v_dummy text := crypt('timing-balance', gen_salt('bf', 8));
  v_ok boolean := false;
begin
  if p_slug is null or length(trim(p_slug)) = 0
     or p_password is null
     or p_fingerprint is null or length(p_fingerprint) < 8 then
    return jsonb_build_object('ok', false, 'error', 'Unable to verify class access.');
  end if;

  select * into v_class
  from public.classes
  where slug = lower(trim(p_slug));

  if found then
    select count(*) into v_fail_fp
    from public.access_attempts
    where class_id = v_class.id
      and fingerprint = p_fingerprint
      and success = false
      and attempted_at > now() - interval '15 minutes';

    select count(*) into v_fail_class
    from public.access_attempts
    where class_id = v_class.id
      and success = false
      and attempted_at > now() - interval '15 minutes';

    if v_fail_fp >= 8 or v_fail_class >= 40 then
      return jsonb_build_object(
        'ok', false,
        'error', 'Unable to verify class access. Please wait and try again.'
      );
    end if;

    select * into v_settings
    from public.class_access_settings
    where class_id = v_class.id;
  end if;

  if v_settings.password_hash is not null then
    v_ok := (
      v_class.status = 'published'
      and v_settings.access_enabled
      and v_settings.password_hash = crypt(p_password, v_settings.password_hash)
    );

    insert into public.access_attempts (class_id, fingerprint, success)
    values (v_class.id, p_fingerprint, v_ok);

    if v_ok then
      v_token := encode(gen_random_bytes(32), 'hex');
      v_hash := encode(digest(v_token, 'sha256'), 'hex');
      insert into public.class_sessions (class_id, token_hash, expires_at)
      values (v_class.id, v_hash, now() + interval '8 hours');

      return jsonb_build_object(
        'ok', true,
        'token', v_token,
        'expires_at', (now() + interval '8 hours')
      );
    end if;
  else
    perform crypt(coalesce(p_password, 'x'), v_dummy);
  end if;

  return jsonb_build_object('ok', false, 'error', 'Unable to verify class access.');
end;
$$;

create or replace function public.student_revoke_session(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  update public.class_sessions
  set revoked_at = now()
  where token_hash = encode(digest(p_token, 'sha256'), 'hex')
    and revoked_at is null;
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.admin_set_class_password(p_class_id uuid, p_password text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  if not exists (select 1 from public.classes where id = p_class_id) then
    return jsonb_build_object('ok', false, 'error', 'Class not found.');
  end if;

  if p_password is null or length(p_password) < 8 then
    return jsonb_build_object('ok', false, 'error', 'Password must be at least 8 characters.');
  end if;

  insert into public.class_access_settings (class_id, password_hash, password_updated_at, access_enabled)
  values (p_class_id, crypt(p_password, gen_salt('bf', 10)), now(), true)
  on conflict (class_id) do update
    set password_hash = excluded.password_hash,
        password_updated_at = now();

  update public.class_sessions
  set revoked_at = now()
  where class_id = p_class_id
    and revoked_at is null;

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.admin_revoke_class_access(p_class_id uuid, p_disable boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  update public.class_access_settings
  set access_enabled = not coalesce(p_disable, true)
  where class_id = p_class_id;

  update public.class_sessions
  set revoked_at = now()
  where class_id = p_class_id
    and revoked_at is null;

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.admin_revoke_sessions(p_class_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  update public.class_sessions
  set revoked_at = now()
  where class_id = p_class_id
    and revoked_at is null;

  return jsonb_build_object('ok', true);
end;
$$;

-- ---------------------------------------------------------------------------
-- Student read functions — published content only, no secrets or admin notes
-- ---------------------------------------------------------------------------

create or replace function public.student_get_class(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_class_id uuid;
begin
  v_class_id := public.student_session_class_id(p_token);
  if v_class_id is null then
    return jsonb_build_object('ok', false, 'error', 'Session expired.');
  end if;

  return jsonb_build_object(
    'ok', true,
    'class', (
      select jsonb_build_object(
        'id', c.id,
        'slug', c.slug,
        'title', c.title,
        'course_code', c.course_code,
        'semester', c.semester,
        'section', c.section,
        'academic_year', c.academic_year,
        'timezone', c.timezone,
        'outline', c.outline,
        'submission_guidelines', c.submission_guidelines
      )
      from public.classes c
      where c.id = v_class_id
    )
  );
end;
$$;

create or replace function public.student_get_resources(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_class_id uuid;
begin
  v_class_id := public.student_session_class_id(p_token);
  if v_class_id is null then
    return jsonb_build_object('ok', false, 'error', 'Session expired.');
  end if;

  return jsonb_build_object(
    'ok', true,
    'resources', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', r.id,
        'title', r.title,
        'description', r.description,
        'resource_type', r.resource_type,
        'topic', r.topic,
        'week_number', r.week_number,
        'lecture_number', r.lecture_number,
        'related_lab_id', r.related_lab_id,
        'file_name', r.file_name,
        'file_mime', r.file_mime,
        'file_size', r.file_size,
        'version', r.version,
        'created_at', r.created_at
      ) order by r.week_number nulls last, r.lecture_number nulls last, r.created_at desc)
      from public.resources r
      where r.class_id = v_class_id
        and r.status = 'published'
        and r.is_current = true
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.student_get_labs(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_class_id uuid;
begin
  v_class_id := public.student_session_class_id(p_token);
  if v_class_id is null then
    return jsonb_build_object('ok', false, 'error', 'Session expired.');
  end if;

  return jsonb_build_object(
    'ok', true,
    'labs', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', l.id,
        'lab_number', l.lab_number,
        'title', l.title,
        'objectives', l.objectives,
        'instructions', l.instructions,
        'exercises', l.exercises,
        'required_concepts', l.required_concepts,
        'sample_input', l.sample_input,
        'sample_output', l.sample_output,
        'deadline', l.deadline,
        'printing_requirements', l.printing_requirements,
        'submission_guidelines', l.submission_guidelines,
        'assessment_criteria', l.assessment_criteria,
        'manual_resource_id', l.manual_resource_id
      ) order by l.lab_number)
      from public.lab_tasks l
      where l.class_id = v_class_id
        and l.status = 'published'
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.student_get_assignments(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_class_id uuid;
begin
  v_class_id := public.student_session_class_id(p_token);
  if v_class_id is null then
    return jsonb_build_object('ok', false, 'error', 'Session expired.');
  end if;

  return jsonb_build_object(
    'ok', true,
    'assignments', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', t.id,
        'title', t.title,
        'description', t.description,
        'instructions', t.instructions,
        'assignee_type', t.assignee_type,
        'assignee_name', t.assignee_name,
        'deadline', t.deadline,
        'status', t.status,
        'priority', t.priority,
        'related_lab_id', t.related_lab_id,
        'related_resource_id', t.related_resource_id,
        'why_it_matters', t.why_it_matters,
        'created_at', t.created_at
      ) order by t.deadline nulls last, t.created_at desc)
      from public.task_assignments t
      where t.class_id = v_class_id
        and t.is_published = true
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.student_get_announcements(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_class_id uuid;
begin
  v_class_id := public.student_session_class_id(p_token);
  if v_class_id is null then
    return jsonb_build_object('ok', false, 'error', 'Session expired.');
  end if;

  return jsonb_build_object(
    'ok', true,
    'announcements', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', a.id,
        'title', a.title,
        'body', a.body,
        'pinned', a.pinned,
        'published_at', a.published_at,
        'created_at', a.created_at
      ) order by a.pinned desc, a.published_at desc nulls last)
      from public.announcements a
      where a.class_id = v_class_id
        and a.status = 'published'
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.student_get_guidelines(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_class_id uuid;
begin
  v_class_id := public.student_session_class_id(p_token);
  if v_class_id is null then
    return jsonb_build_object('ok', false, 'error', 'Session expired.');
  end if;

  return jsonb_build_object(
    'ok', true,
    'guidelines', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', g.id,
        'template_key', g.template_key,
        'title', g.title,
        'body', g.body
      ) order by g.title)
      from public.class_guidelines g
      where g.class_id = v_class_id
        and g.status = 'published'
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.student_authorized_resource_path(
  p_token text,
  p_resource_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_class_id uuid;
  v_path text;
begin
  v_class_id := public.student_session_class_id(p_token);
  if v_class_id is null then
    return jsonb_build_object('ok', false, 'error', 'Session expired.');
  end if;

  select r.storage_path into v_path
  from public.resources r
  where r.id = p_resource_id
    and r.class_id = v_class_id
    and r.status = 'published'
    and r.is_current = true;

  if v_path is null then
    return jsonb_build_object('ok', false, 'error', 'Resource is not available.');
  end if;

  return jsonb_build_object('ok', true, 'storage_path', v_path);
end;
$$;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.admin_allowlist enable row level security;
alter table public.profiles enable row level security;
alter table public.classes enable row level security;
alter table public.class_access_settings enable row level security;
alter table public.access_attempts enable row level security;
alter table public.class_sessions enable row level security;
alter table public.resources enable row level security;
alter table public.lab_tasks enable row level security;
alter table public.task_assignments enable row level security;
alter table public.announcements enable row level security;
alter table public.class_guidelines enable row level security;
alter table public.class_progress enable row level security;
alter table public.taught_topics enable row level security;

revoke all on public.admin_allowlist from anon, authenticated, public;
revoke all on public.access_attempts from anon, authenticated, public;
revoke all on public.class_sessions from anon, authenticated, public;
revoke all on public.class_access_settings from anon, authenticated, public;

grant select on public.profiles to authenticated;
grant select, insert, update, delete on public.classes to authenticated;
grant select, insert, update, delete on public.resources to authenticated;
grant select, insert, update, delete on public.lab_tasks to authenticated;
grant select, insert, update, delete on public.task_assignments to authenticated;
grant select, insert, update, delete on public.announcements to authenticated;
grant select, insert, update, delete on public.class_guidelines to authenticated;
grant select, insert, update, delete on public.class_progress to authenticated;
grant select, insert, update, delete on public.taught_topics to authenticated;

create policy profiles_select_own_or_admin
  on public.profiles for select
  to authenticated
  using (id = auth.uid() or public.is_admin());

create policy classes_admin_all
  on public.classes for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy resources_admin_all
  on public.resources for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy lab_tasks_admin_all
  on public.lab_tasks for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy task_assignments_admin_all
  on public.task_assignments for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy announcements_admin_all
  on public.announcements for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy guidelines_admin_all
  on public.class_guidelines for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy progress_admin_all
  on public.class_progress for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy taught_topics_admin_all
  on public.taught_topics for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- No policies on allowlist, access_attempts, sessions, or password hashes.
-- Those tables are reachable only through SECURITY DEFINER functions.

-- ---------------------------------------------------------------------------
-- Storage
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit)
values ('class-files', 'class-files', false, 26214400)
on conflict (id) do update
  set public = false,
      file_size_limit = 26214400;

drop policy if exists class_files_admin_select on storage.objects;
drop policy if exists class_files_admin_insert on storage.objects;
drop policy if exists class_files_admin_update on storage.objects;
drop policy if exists class_files_admin_delete on storage.objects;

create policy class_files_admin_select
  on storage.objects for select
  to authenticated
  using (bucket_id = 'class-files' and public.is_admin());

create policy class_files_admin_insert
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'class-files' and public.is_admin());

create policy class_files_admin_update
  on storage.objects for update
  to authenticated
  using (bucket_id = 'class-files' and public.is_admin())
  with check (bucket_id = 'class-files' and public.is_admin());

create policy class_files_admin_delete
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'class-files' and public.is_admin());

-- ---------------------------------------------------------------------------
-- Grants for RPCs
-- ---------------------------------------------------------------------------

grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.verify_class_password(text, text, text) to anon, authenticated;
grant execute on function public.student_session_class_id(text) to anon, authenticated;
grant execute on function public.student_revoke_session(text) to anon, authenticated;
grant execute on function public.student_get_class(text) to anon, authenticated;
grant execute on function public.student_get_resources(text) to anon, authenticated;
grant execute on function public.student_get_labs(text) to anon, authenticated;
grant execute on function public.student_get_assignments(text) to anon, authenticated;
grant execute on function public.student_get_announcements(text) to anon, authenticated;
grant execute on function public.student_get_guidelines(text) to anon, authenticated;
grant execute on function public.student_authorized_resource_path(text, uuid) to anon, authenticated;
grant execute on function public.admin_set_class_password(uuid, text) to authenticated;
grant execute on function public.admin_revoke_class_access(uuid, boolean) to authenticated;
grant execute on function public.admin_revoke_sessions(uuid) to authenticated;

revoke execute on function public.provision_admins() from anon, authenticated, public;
revoke execute on function public.handle_new_user() from anon, authenticated, public;

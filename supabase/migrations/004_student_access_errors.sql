-- Paste into Supabase SQL Editor and click Run.
-- Students enter with the class link + one shared password. No registration.

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

  if not found then
    perform crypt(coalesce(p_password, 'x'), v_dummy);
    return jsonb_build_object('ok', false, 'error', 'Unable to verify class access.');
  end if;

  if v_class.status = 'archived' then
    return jsonb_build_object('ok', false, 'error', 'This class is closed.');
  end if;

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
    return jsonb_build_object('ok', false, 'error', 'Unable to verify class access. Please wait and try again.');
  end if;

  select * into v_settings
  from public.class_access_settings
  where class_id = v_class.id;

  if v_settings.class_id is null then
    return jsonb_build_object('ok', false, 'error', 'This class has no student password yet.');
  end if;

  if v_settings.access_enabled is distinct from true then
    return jsonb_build_object('ok', false, 'error', 'Student access is disabled for this class.');
  end if;

  v_ok := v_settings.password_hash = crypt(p_password, v_settings.password_hash);

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

  return jsonb_build_object('ok', false, 'error', 'Unable to verify class access.');
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
    and c.status is distinct from 'archived'
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

grant execute on function public.verify_class_password(text, text, text) to anon, authenticated;
grant execute on function public.student_session_class_id(text) to anon, authenticated;
grant execute on function public.student_get_class(text) to anon, authenticated;
grant execute on function public.student_get_resources(text) to anon, authenticated;
grant execute on function public.student_get_labs(text) to anon, authenticated;
grant execute on function public.student_get_assignments(text) to anon, authenticated;
grant execute on function public.student_get_announcements(text) to anon, authenticated;
grant execute on function public.student_get_guidelines(text) to anon, authenticated;
grant execute on function public.student_authorized_resource_path(text, uuid) to anon, authenticated;
grant execute on function public.student_revoke_session(text) to anon, authenticated;

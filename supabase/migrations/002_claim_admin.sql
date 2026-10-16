-- Run this in the Supabase SQL editor if login fails after creating Auth users.
-- It lets a signed-in instructor claim an admin profile when their email is allowlisted,
-- even if they were created in Authentication before being added to the allowlist.

create or replace function public.claim_admin_profile()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_name text;
  v_profile public.profiles%rowtype;
begin
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'error', 'not authenticated');
  end if;

  select u.email into v_email
  from auth.users u
  where u.id = v_user_id;

  if v_email is null then
    return jsonb_build_object('ok', false, 'error', 'not authenticated');
  end if;

  select full_name into v_name
  from public.admin_allowlist
  where lower(email) = lower(v_email);

  if v_name is null then
    return jsonb_build_object('ok', false, 'error', 'not allowlisted');
  end if;

  insert into public.profiles (id, email, full_name, role)
  values (v_user_id, v_email, v_name, 'admin')
  on conflict (id) do update
    set email = excluded.email,
        full_name = excluded.full_name,
        role = 'admin'
  returning * into v_profile;

  return jsonb_build_object(
    'ok', true,
    'profile', jsonb_build_object(
      'id', v_profile.id,
      'email', v_profile.email,
      'full_name', v_profile.full_name,
      'role', v_profile.role
    )
  );
end;
$$;

grant execute on function public.claim_admin_profile() to authenticated;
revoke execute on function public.claim_admin_profile() from anon, public;

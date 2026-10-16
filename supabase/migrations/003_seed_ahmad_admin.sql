-- Paste this entire file into the Supabase SQL editor and click Run.
-- It allowlists Ahmad's real Auth email and creates the admin profile.

insert into public.admin_allowlist (email, full_name) values
  ('ahmedshahab.cs@tuf.edu.pk', 'Ahmad Shahab')
on conflict (email) do update
  set full_name = excluded.full_name;

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
  v_profile_count integer;
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
    select count(*) into v_profile_count from public.profiles where role = 'admin';
    if v_profile_count = 0 then
      v_name := split_part(v_email, '@', 1);
      insert into public.admin_allowlist (email, full_name)
      values (v_email, v_name)
      on conflict (email) do update set full_name = excluded.full_name;
    else
      return jsonb_build_object('ok', false, 'error', 'not allowlisted');
    end if;
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

select * from public.provision_admins();

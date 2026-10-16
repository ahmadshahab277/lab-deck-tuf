-- Paste into the Supabase SQL editor and click Run.
-- Creates the private file bucket (if missing) and lets students download
-- published files after they enter the class password.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'class-files',
  'class-files',
  false,
  26214400,
  null
)
on conflict (id) do update
  set public = false,
      file_size_limit = 26214400;

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
  v_row public.resources%rowtype;
begin
  v_class_id := public.student_session_class_id(p_token);
  if v_class_id is null then
    return jsonb_build_object('ok', false, 'error', 'Session expired.');
  end if;

  select * into v_row
  from public.resources r
  where r.id = p_resource_id
    and r.class_id = v_class_id
    and r.status = 'published'
    and r.is_current = true;

  if v_row.storage_path is null then
    return jsonb_build_object('ok', false, 'error', 'Resource is not available.');
  end if;

  return jsonb_build_object(
    'ok', true,
    'storage_path', v_row.storage_path,
    'file_name', v_row.file_name,
    'file_mime', v_row.file_mime
  );
end;
$$;

grant execute on function public.student_authorized_resource_path(text, uuid) to anon, authenticated;

drop policy if exists class_files_admin_select on storage.objects;
drop policy if exists class_files_admin_insert on storage.objects;
drop policy if exists class_files_admin_update on storage.objects;
drop policy if exists class_files_admin_delete on storage.objects;
drop policy if exists class_files_published_read on storage.objects;

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

-- Published current files can be downloaded by anyone who already knows the
-- unguessable storage path. Students receive that path only after class-password
-- verification through student_authorized_resource_path.
create policy class_files_published_read
  on storage.objects for select
  to anon, authenticated
  using (
    bucket_id = 'class-files'
    and exists (
      select 1
      from public.resources r
      where r.storage_path = name
        and r.status = 'published'
        and r.is_current = true
    )
  );

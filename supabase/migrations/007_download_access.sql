-- Paste into the Supabase SQL editor and click Run.
-- Lets students download published files. The previous storage rule looked
-- at the resources table under student permissions, so the check always failed.

create or replace function public.class_file_is_downloadable(object_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.resources r
    where r.storage_path = object_name
      and r.status = 'published'
      and r.is_current = true
  );
$$;

revoke all on function public.class_file_is_downloadable(text) from public, anon, authenticated;
grant execute on function public.class_file_is_downloadable(text) to anon, authenticated;

drop policy if exists class_files_published_read on storage.objects;

create policy class_files_published_read
  on storage.objects for select
  to anon, authenticated
  using (
    bucket_id = 'class-files'
    and public.class_file_is_downloadable(name)
  );

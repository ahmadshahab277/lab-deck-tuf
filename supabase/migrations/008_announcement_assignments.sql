-- Paste into the Supabase SQL editor and click Run.
-- Announcements can name who they are for, and can include a file or a link.

alter table public.announcements
  add column if not exists assignee_name text not null default '',
  add column if not exists link_url text not null default '',
  add column if not exists attachment_path text not null default '',
  add column if not exists attachment_name text not null default '',
  add column if not exists attachment_mime text not null default '';

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
  )
  or exists (
    select 1
    from public.announcements a
    where a.attachment_path = object_name
      and a.attachment_path <> ''
      and a.status = 'published'
  );
$$;

revoke all on function public.class_file_is_downloadable(text) from public, anon, authenticated;
grant execute on function public.class_file_is_downloadable(text) to anon, authenticated;

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
        'assignee_name', a.assignee_name,
        'link_url', a.link_url,
        'attachment_path', a.attachment_path,
        'attachment_name', a.attachment_name,
        'attachment_mime', a.attachment_mime,
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

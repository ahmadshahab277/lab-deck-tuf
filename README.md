# TUF LabDesk

Installable PWA for course outlines, lab manuals, class tasks, and announcements. Students read and download published materials. They do not register or upload files.

## Setup

1. Copy `.env.example` to `.env` and add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
2. In the Supabase SQL editor, run `supabase/migrations/001_init.sql`, then `005_storage_downloads.sql`, `006_timetable.sql`, `007_download_access.sql`, and `008_announcement_assignments.sql`.
3. Insert Ahmad’s and Tayyab’s emails into `admin_allowlist`, create their Auth users, then run `select * from public.provision_admins();`.
4. Deploy Edge Functions `verify-class-password`, `create-signed-url`, and `revoke-class-access`.
5. `npm install` and `npm run dev`.

Never put the service-role key in frontend environment variables.

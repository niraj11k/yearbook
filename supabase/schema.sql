-- ============================================================
-- School Friends Yearbook — Supabase schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- Safe to re-run: uses IF NOT EXISTS / OR REPLACE where possible.
-- ============================================================

-- ------------------------------------------------------------
-- 1. PROFILES TABLE
--    One row per signed-in user. id references auth.users so
--    ownership is guaranteed by the auth system itself.
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id               uuid primary key references auth.users (id) on delete cascade,
  display_name     text not null default '',
  nickname         text default '',
  school_year      text default '',
  years_at_school  text default '',
  current_city     text default '',
  occupation       text default '',
  fav_teacher      text default '',
  fav_school_lunch text default '',
  best_mate        text default '',
  iconic_trend     text default '',
  embarrassing_moment text default '',
  secret_talent    text default '',
  message_younger_self text default '',
  school_song      text default '',
  photo_path       text,  -- optional; file lives in Storage bucket profile-photos

  -- optional social links (profile URL or handle)
  linkedin         text default '',
  facebook         text default '',
  x                text default '',
  instagram        text default '',

  -- privacy / moderation flags
  is_hidden        boolean not null default false,  -- admin can hide a profile
  is_admin         boolean not null default false,  -- set manually for moderators

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

comment on table public.profiles is
  'Yearbook profiles. One per auth user. City and social links are optional.';

-- Add years_at_school for existing deployments (safe to re-run)
alter table public.profiles add column if not exists years_at_school text default '';

-- Yearbook story fields (safe to re-run on existing deployments)
alter table public.profiles add column if not exists fav_school_lunch text default '';
alter table public.profiles add column if not exists best_mate text default '';
alter table public.profiles add column if not exists iconic_trend text default '';
alter table public.profiles add column if not exists embarrassing_moment text default '';
alter table public.profiles add column if not exists secret_talent text default '';
alter table public.profiles add column if not exists message_younger_self text default '';
alter table public.profiles add column if not exists school_song text default '';

-- Optional profile photo (path in Storage, not the image bytes)
alter table public.profiles add column if not exists photo_path text;

-- Remove DOB fields (no longer collected in the yearbook form)
alter table public.profiles drop column if exists show_dob;
alter table public.profiles drop column if exists dob;

-- Location and social (safe to re-run on existing deployments)
alter table public.profiles add column if not exists current_city text default '';
alter table public.profiles add column if not exists linkedin text default '';
alter table public.profiles add column if not exists facebook text default '';
alter table public.profiles add column if not exists x text default '';
alter table public.profiles add column if not exists instagram text default '';

-- Replace full street address with city-only field
alter table public.profiles drop column if exists show_address;
alter table public.profiles drop column if exists current_address;

-- ------------------------------------------------------------
-- 2. PROFILES ON FIRST SAVE (not on sign-up)
--    Rows are created when the user clicks Save my details in the app.
--    Safe to re-run: drops the legacy auto-create trigger if present.
-- ------------------------------------------------------------
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

-- ------------------------------------------------------------
-- 3. KEEP updated_at FRESH
-- ------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ------------------------------------------------------------
-- 4. ROW LEVEL SECURITY
--    The anon key is public, so RLS is the real security layer.
-- ------------------------------------------------------------
alter table public.profiles enable row level security;

-- Helper: is the current user an admin?
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select coalesce(
    (select p.is_admin from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

-- READ: signed-in users can see completed profiles that are not hidden.
-- Empty rows (no display name yet) stay private until first save.
-- Admins can see everything. Owners can always see their own row
-- (so a hidden user can still edit their profile).
drop policy if exists "read visible profiles" on public.profiles;
create policy "read visible profiles"
  on public.profiles
  for select
  to authenticated
  using (
    (is_hidden = false and trim(display_name) <> '')
    or id = auth.uid()
    or public.is_admin()
  );

-- INSERT: a user may only insert their own row.
drop policy if exists "insert own profile" on public.profiles;
create policy "insert own profile"
  on public.profiles
  for insert
  to authenticated
  with check (id = auth.uid());

-- UPDATE: owners can update their own row. Admins can update any row
-- (needed for moderation: hiding / unhiding profiles).
drop policy if exists "update own profile" on public.profiles;
create policy "update own profile"
  on public.profiles
  for update
  to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- No DELETE policy on purpose: rows are removed when the auth user
-- is deleted (on delete cascade). Nobody deletes rows via the API.

-- NOTE: anonymous (signed-out) access is intentionally not granted.
-- The yearbook is group-only, matching the PRD.

-- ------------------------------------------------------------
-- 5. REALTIME
--    Broadcast inserts/updates so open browsers refresh live.
-- ------------------------------------------------------------
do $$
begin
  alter publication supabase_realtime add table public.profiles;
exception
  when duplicate_object then null;
end;
$$;

-- Realtime respects RLS for postgres_changes when
-- "Enable RLS on realtime" is on (default for new projects).

-- ------------------------------------------------------------
-- 6. MAKE YOURSELF AN ADMIN (run after your first sign-in)
-- ------------------------------------------------------------
-- update public.profiles set is_admin = true
-- where id = (select id from auth.users where email = 'you@example.com');

-- ------------------------------------------------------------
-- 7. PROFILE PHOTOS (Supabase Storage — free tier)
--    Images live in the bucket; profiles.photo_path stores the
--    object key only (e.g. "<user-uuid>/avatar.jpg").
--    Uploads are restricted to each user's own folder; any
--    signed-in classmate can view photos in the yearbook.
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-photos',
  'profile-photos',
  true,  -- public read so <img src> works without signed URLs
  2097152,  -- 2 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- READ: any signed-in user can load classmates' photos
drop policy if exists "read profile photos" on storage.objects;
create policy "read profile photos"
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'profile-photos');

-- INSERT: users may only upload into their own folder
drop policy if exists "upload own profile photo" on storage.objects;
create policy "upload own profile photo"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- UPDATE: replace own photo (upsert)
drop policy if exists "update own profile photo" on storage.objects;
create policy "update own profile photo"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- DELETE: remove own photo
drop policy if exists "delete own profile photo" on storage.objects;
create policy "delete own profile photo"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
-- RLS + Supabase Auth wiring for the self-serve platform.
--
-- Apply AFTER the Drizzle migrations (>= 0009) and after Supabase Auth is
-- enabled. NOT part of the Drizzle journal (triggers + RLS can't be generated).
-- Idempotent: safe to re-run.
--
-- NOTE: auth.users.id is `uuid`; our profiles.id / brands.owner_user_id are
-- `text` (app-generated ids). So we DON'T add a cross-type FK to auth.users —
-- the on-signup trigger maintains profiles — and we compare against
-- `auth.uid()::text` everywhere.
--
-- WORKER + ADMIN use the service_role key, which BYPASSES RLS by design.
-- Existing lead-gen tables (leads, brand_profiles, ...) stay without RLS:
-- customers never query them directly; only the service role does.

-- 1. profiles auto-provisioning ------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id::text, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helper: is the current request an admin?
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()::text and p.role = 'admin'
  );
$$;

-- 2. enable RLS ----------------------------------------------------------------
alter table public.profiles          enable row level security;
alter table public.brands            enable row level security;
alter table public.brand_kit_files   enable row level security;
alter table public.brand_kit_assets  enable row level security;
alter table public.operate_projects  enable row level security;
alter table public.ad_assets         enable row level security;

-- 3. profiles ------------------------------------------------------------------
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin" on public.profiles
  for select using (id = auth.uid()::text or public.is_admin());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid()::text) with check (id = auth.uid()::text);

-- 4. brands (owner_user_id = auth.uid()) ---------------------------------------
drop policy if exists "brands_rw_own" on public.brands;
create policy "brands_rw_own" on public.brands
  for all using (owner_user_id = auth.uid()::text)
  with check (owner_user_id = auth.uid()::text);

-- 5. brand_kit_files / brand_kit_assets / operate_projects / ad_assets ----------
drop policy if exists "brand_kit_files_rw_own" on public.brand_kit_files;
create policy "brand_kit_files_rw_own" on public.brand_kit_files
  for all using (brand_id in (select id from public.brands where owner_user_id = auth.uid()::text))
  with check (brand_id in (select id from public.brands where owner_user_id = auth.uid()::text));

drop policy if exists "brand_kit_assets_rw_own" on public.brand_kit_assets;
create policy "brand_kit_assets_rw_own" on public.brand_kit_assets
  for all using (brand_id in (select id from public.brands where owner_user_id = auth.uid()::text))
  with check (brand_id in (select id from public.brands where owner_user_id = auth.uid()::text));

drop policy if exists "operate_projects_rw_own" on public.operate_projects;
create policy "operate_projects_rw_own" on public.operate_projects
  for all using (brand_id in (select id from public.brands where owner_user_id = auth.uid()::text))
  with check (brand_id in (select id from public.brands where owner_user_id = auth.uid()::text));

drop policy if exists "ad_assets_rw_own" on public.ad_assets;
create policy "ad_assets_rw_own" on public.ad_assets
  for all using (brand_id in (select id from public.brands where owner_user_id = auth.uid()::text))
  with check (brand_id in (select id from public.brands where owner_user_id = auth.uid()::text));

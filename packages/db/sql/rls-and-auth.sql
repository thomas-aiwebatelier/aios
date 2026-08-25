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
--
-- ─────────────────────────────────────────────────────────────────────────────
-- 2026-08-25 — THE PORTAL IS NOW READ-ONLY.
--
-- It used to be self-serve: the policies below were `for all`, so a signed-in
-- customer could insert and update, and four server actions let them kick off
-- pipelines — one of which (createCreative) spends real money on generation.
-- The product decision is that we deliver; customers look.
--
-- Two things are required to make that true, and the second is the one people
-- forget:
--
--   1. SELECT-only policies (no insert/update/delete policies at all), AND
--   2. REVOKE the underlying table grants from `authenticated` and `anon`.
--
-- Policies do NOT take grants back. A table protected only by policies still
-- hands a client role an insert path if the grant was never revoked. Both
-- halves, or it is not read-only.
--
-- Writes keep working because every worker and admin path uses the
-- service_role key, which bypasses RLS entirely.
--
-- The single exception is `lead_intents`: the front door has to accept an
-- INSERT from someone who is not logged in yet. It is insert-only — no select,
-- no update — so it cannot be used to read anything back out.
-- ─────────────────────────────────────────────────────────────────────────────

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
alter table public.profiles           enable row level security;
alter table public.brands             enable row level security;
alter table public.brand_kit_files    enable row level security;
alter table public.brand_kit_assets   enable row level security;
alter table public.operate_projects   enable row level security;
alter table public.ad_assets          enable row level security;
alter table public.video_deliverables enable row level security;
alter table public.lead_intents       enable row level security;

-- 2b. REVOKE WRITE GRANTS ------------------------------------------------------
-- The half that policies cannot do for you. Without this, dropping the write
-- policies below is cosmetic.
revoke insert, update, delete on public.profiles           from authenticated, anon;
revoke insert, update, delete on public.brands             from authenticated, anon;
revoke insert, update, delete on public.brand_kit_files    from authenticated, anon;
revoke insert, update, delete on public.brand_kit_assets   from authenticated, anon;
revoke insert, update, delete on public.operate_projects   from authenticated, anon;
revoke insert, update, delete on public.ad_assets          from authenticated, anon;
revoke insert, update, delete on public.video_deliverables from authenticated, anon;

-- lead_intents is the one exception: insert-only, never readable by a client.
revoke select, update, delete on public.lead_intents from authenticated, anon;
grant  insert                 on public.lead_intents to   authenticated, anon;

-- Customers still need to READ their own rows.
grant select on public.profiles           to authenticated;
grant select on public.brands             to authenticated;
grant select on public.brand_kit_files    to authenticated;
grant select on public.brand_kit_assets   to authenticated;
grant select on public.operate_projects   to authenticated;
grant select on public.ad_assets          to authenticated;
grant select on public.video_deliverables to authenticated;

-- 3. profiles ------------------------------------------------------------------
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin" on public.profiles
  for select using (id = auth.uid()::text or public.is_admin());

-- Deliberately removed: "profiles_update_own". Customers do not edit anything
-- through the client, including their own profile row. Name changes go through
-- an admin. Re-adding an update policy here would also need the UPDATE grant
-- back, so this cannot regress by accident.
drop policy if exists "profiles_update_own" on public.profiles;

-- 4. brands (owner_user_id = auth.uid()) ---------------------------------------
drop policy if exists "brands_rw_own" on public.brands;
drop policy if exists "brands_select_own" on public.brands;
create policy "brands_select_own" on public.brands
  for select using (owner_user_id = auth.uid()::text or public.is_admin());

-- 5. brand_kit_files / brand_kit_assets / operate_projects / ad_assets ----------
drop policy if exists "brand_kit_files_rw_own" on public.brand_kit_files;
drop policy if exists "brand_kit_files_select_own" on public.brand_kit_files;
create policy "brand_kit_files_select_own" on public.brand_kit_files
  for select using (
    brand_id in (select id from public.brands where owner_user_id = auth.uid()::text)
    or public.is_admin()
  );

drop policy if exists "brand_kit_assets_rw_own" on public.brand_kit_assets;
drop policy if exists "brand_kit_assets_select_own" on public.brand_kit_assets;
create policy "brand_kit_assets_select_own" on public.brand_kit_assets
  for select using (
    brand_id in (select id from public.brands where owner_user_id = auth.uid()::text)
    or public.is_admin()
  );

drop policy if exists "operate_projects_rw_own" on public.operate_projects;
drop policy if exists "operate_projects_select_own" on public.operate_projects;
create policy "operate_projects_select_own" on public.operate_projects
  for select using (
    brand_id in (select id from public.brands where owner_user_id = auth.uid()::text)
    or public.is_admin()
  );

drop policy if exists "ad_assets_rw_own" on public.ad_assets;
drop policy if exists "ad_assets_select_own" on public.ad_assets;
create policy "ad_assets_select_own" on public.ad_assets
  for select using (
    brand_id in (select id from public.brands where owner_user_id = auth.uid()::text)
    or public.is_admin()
  );

-- 6. video_deliverables (owner_user_id = auth.uid()) ---------------------------
drop policy if exists "video_deliverables_select_own" on public.video_deliverables;
create policy "video_deliverables_select_own" on public.video_deliverables
  for select using (owner_user_id = auth.uid()::text or public.is_admin());

-- 7. lead_intents — write-only front door --------------------------------------
-- Anyone may drop an intent in. Nobody but the service role may read one back.
-- `with check (true)` is intentional: at this point in the funnel there is no
-- identity to scope against. Abuse is handled upstream (honeypot + rate limit
-- in captureLeadIntent), not here.
drop policy if exists "lead_intents_insert_anyone" on public.lead_intents;
create policy "lead_intents_insert_anyone" on public.lead_intents
  for insert to authenticated, anon with check (true);

drop policy if exists "lead_intents_select_admin" on public.lead_intents;
create policy "lead_intents_select_admin" on public.lead_intents
  for select using (public.is_admin());

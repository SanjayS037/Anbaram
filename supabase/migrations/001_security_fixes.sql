-- =====================================================================
-- ANBARAM — 001 Security fixes
-- Run once in the Supabase SQL Editor AFTER anbaram_schema.sql.
-- Each block is a minimal change to an existing policy/function/view;
-- no tables or columns are added or removed.
-- =====================================================================

-- ---------------------------------------------------------------------
-- G1. is_admin() recursion
-- admins_select called is_admin(), which read admins, which re-applied
-- admins_select -> recursion error on every policy using is_admin().
-- SECURITY DEFINER lets the function read admins without RLS.
-- ---------------------------------------------------------------------
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.admins where id = auth.uid()); $$;

drop policy if exists "admins_select" on public.admins;
create policy "admins_select" on public.admins
  for select using (id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------
-- G2. Officers could approve / assign themselves
-- Insert must start as a clean pending row; only admins may update.
-- ---------------------------------------------------------------------
drop policy if exists "officers_insert_self" on public.officers;
create policy "officers_insert_self" on public.officers
  for insert with check (
    auth.uid() = id
    and status = 'pending'
    and assigned_collection_point_id is null
    and assigned_distribution_center_id is null
    and approved_by is null
    and approved_at is null
    and rejected_reason is null
  );

drop policy if exists "officers_update_own_or_admin" on public.officers;
create policy "officers_update_admin" on public.officers
  for update using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- G3. Triggers ran as the officer and were blocked by RLS
-- touch_last_collected silently updated 0 collection_points rows, so
-- last_collected_at never changed. auto_raise_flag relied on the
-- officer flags-insert policy (dropped in G5).
-- ---------------------------------------------------------------------
alter function public.touch_last_collected() security definer set search_path = public;
alter function public.auto_raise_flag()     security definer set search_path = public;

-- ---------------------------------------------------------------------
-- G4. Shipment writes were too broad
-- Insert: must be a fresh 'dispatched' row logged by the caller.
-- Update: DC officer may acknowledge a 'dispatched' shipment once, and
-- only the receipt columns are writable.
-- ---------------------------------------------------------------------
drop policy if exists "shipments_insert_by_cp_officer" on public.shipments;
create policy "shipments_insert_by_cp_officer" on public.shipments
  for insert with check (
    logged_by_officer_id = auth.uid()
    and status = 'dispatched'
    and received_by_officer_id is null
    and received_at is null
    and condition is null
    and received_photo_url is null
    and collection_point_id in (
      select id from public.collection_points where assigned_officer_id = auth.uid())
  );

drop policy if exists "shipments_update_by_dc_officer_or_admin" on public.shipments;
create policy "shipments_receive_by_dc_officer" on public.shipments
  for update
  using (
    status = 'dispatched'
    and distribution_center_id in (
      select id from public.distribution_centers where assigned_officer_id = auth.uid())
  )
  with check (
    status = 'received'
    and received_by_officer_id = auth.uid()
    and distribution_center_id in (
      select id from public.distribution_centers where assigned_officer_id = auth.uid())
  );

revoke update on public.shipments from anon, authenticated;
grant update (status, received_by_officer_id, received_photo_url, condition, condition_note, received_at)
  on public.shipments to authenticated;

-- ---------------------------------------------------------------------
-- G5. Any signed-in user could insert flags on any shipment
-- Flags are created by the auto_raise_flag trigger (SECURITY DEFINER
-- after G3), so the client insert policy is no longer needed.
-- ---------------------------------------------------------------------
drop policy if exists "flags_insert_by_officer" on public.flags;

-- ---------------------------------------------------------------------
-- G6. Reporting views bypassed RLS
-- Views run as their owner by default, so v_shipment_categories exposed
-- every shipment to the anon key. Detail views now respect the caller's
-- RLS. v_totals_by_category stays public (aggregate) but reads shipments
-- directly so it keeps working for the public transparency view.
-- ---------------------------------------------------------------------
create or replace view public.v_totals_by_category as
  select c.category, sum(c.weight_kg) as total_kg
  from public.shipments s
  cross join lateral (values
    ('clothes'::public.donation_category, s.clothes_kg),
    ('blankets'::public.donation_category,   s.blankets_kg),
    ('stationery'::public.donation_category, s.stationery_kg),
    ('books'::public.donation_category,      s.books_kg),
    ('other'::public.donation_category,      s.other_kg)
  ) as c(category, weight_kg)
  group by c.category;

alter view public.v_shipment_categories           set (security_invoker = true);
alter view public.v_totals_by_distribution_center set (security_invoker = true);

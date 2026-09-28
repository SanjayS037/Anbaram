-- =====================================================================
-- ANBARAM — 003 Collection request fixes
-- Run once in the Supabase SQL Editor (role: postgres) AFTER
-- anbaram_migration_collection_requests.sql. Minimal changes only.
-- =====================================================================

-- ---------------------------------------------------------------------
-- R1. Collection Point officers could edit ANY column of their point's
-- requests: mark them completed or cancelled without collecting,
-- change the destination center or the requested categories.
-- Now an officer may only move a request from pending → in_progress
-- ("I've started collecting"), and only status/started_at are writable
-- through the API. Admins keep full control through their own policy.
-- ---------------------------------------------------------------------
drop policy if exists "collection_requests_update_by_cp_officer" on public.collection_requests;
create policy "collection_requests_start_by_cp_officer" on public.collection_requests
  for update
  using (
    status = 'pending'
    and collection_point_id in (select id from public.collection_points where assigned_officer_id = auth.uid())
  )
  with check (
    status = 'in_progress'
    and collection_point_id in (select id from public.collection_points where assigned_officer_id = auth.uid())
  );

revoke update on public.collection_requests from anon, authenticated;
grant update (status, started_at) on public.collection_requests to authenticated;

-- ---------------------------------------------------------------------
-- R2. complete_linked_request ran as the officer, so after R1 it could
-- no longer update the request (silently doing nothing). It also
-- trusted any collection_request_id, so a shipment could "complete"
-- another point's request. Now it runs with owner rights, refuses a
-- link to another point's request, and only completes an open request
-- whose destination matches the shipment.
-- ---------------------------------------------------------------------
create or replace function public.complete_linked_request()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_cp uuid;
begin
  if new.collection_request_id is null then
    return new;
  end if;

  select collection_point_id into v_cp from collection_requests where id = new.collection_request_id;
  if v_cp is distinct from new.collection_point_id then
    raise exception 'This collection request belongs to a different collection point.';
  end if;

  update collection_requests
     set status = 'completed', completed_at = new.dispatched_at
   where id = new.collection_request_id
     and distribution_center_id = new.distribution_center_id
     and status in ('pending', 'in_progress');
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- R3. A request must name at least one category. NOT VALID = enforced
-- for new rows only, so any existing rows are left untouched.
-- ---------------------------------------------------------------------
alter table public.collection_requests
  drop constraint if exists collection_requests_categories_not_empty;
alter table public.collection_requests
  add constraint collection_requests_categories_not_empty
  check (requested_categories is not null and cardinality(requested_categories) > 0) not valid;

create index if not exists idx_shipments_collection_request on public.shipments(collection_request_id);

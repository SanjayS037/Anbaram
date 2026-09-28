-- =====================================================================
-- ANBARAM — Migration: Admin-Initiated Collection Requests (Hybrid Model)
-- Run this AFTER anbaram_schema.sql (and after seed data, if already run).
-- Adds a demand-driven trigger for collections, alongside the existing
-- calendar-based cycle_frequency_days due-date logic — both stay active.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. NEW TABLE: collection_requests
--    One row = one admin request for a specific Collection Point to
--    do a collection, usually because a Distribution Center is short
--    on a category. Independent of the calendar due-date system.
-- ---------------------------------------------------------------------
create table collection_requests (
  id                      uuid primary key default gen_random_uuid(),
  collection_point_id     uuid not null references collection_points(id),
  distribution_center_id  uuid not null references distribution_centers(id),
  requested_by_admin_id   uuid not null references admins(id),
  requested_categories    donation_category[],   -- e.g. '{blankets}' or '{blankets,clothes}'
  note                    text,
  status                  text not null default 'pending'
                            check (status in ('pending', 'in_progress', 'completed', 'cancelled')),
  created_at              timestamptz not null default now(),
  started_at              timestamptz,
  completed_at            timestamptz
);

create index idx_collection_requests_cp on collection_requests(collection_point_id);
create index idx_collection_requests_status on collection_requests(status);

-- ---------------------------------------------------------------------
-- 2. Link shipments back to the request that caused them (nullable —
--    a shipment can still exist with no request, from the calendar path)
-- ---------------------------------------------------------------------
alter table shipments add column collection_request_id uuid references collection_requests(id);

-- ---------------------------------------------------------------------
-- 3. ROW LEVEL SECURITY
-- ---------------------------------------------------------------------
alter table collection_requests enable row level security;

-- Admins can see and create all requests
create policy "collection_requests_admin_all" on collection_requests
  for all using (is_admin()) with check (is_admin());

-- The assigned Collection Point officer can see and update (start) their
-- own point's requests — but cannot create or delete them
create policy "collection_requests_select_by_cp_officer" on collection_requests
  for select using (
    is_admin()
    or collection_point_id in (select id from collection_points where assigned_officer_id = auth.uid())
  );

create policy "collection_requests_update_by_cp_officer" on collection_requests
  for update using (
    is_admin()
    or collection_point_id in (select id from collection_points where assigned_officer_id = auth.uid())
  );

-- ---------------------------------------------------------------------
-- 4. Auto-complete the linked request when its shipment is dispatched
--    (keeps the request's status in sync without extra app-side code)
-- ---------------------------------------------------------------------
create or replace function complete_linked_request()
returns trigger as $$
begin
  if new.collection_request_id is not null then
    update collection_requests
    set status = 'completed', completed_at = new.dispatched_at
    where id = new.collection_request_id;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_complete_linked_request
  after insert on shipments
  for each row execute function complete_linked_request();

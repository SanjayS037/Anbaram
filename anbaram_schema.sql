-- =====================================================================
-- ANBARAM — Supabase Postgres Schema
-- Paste this entire file into the Supabase SQL Editor and run it once,
-- top to bottom. Order matters (tables reference each other).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. EXTENSIONS
-- ---------------------------------------------------------------------
create extension if not exists "pgcrypto";   -- gives us gen_random_uuid()

-- ---------------------------------------------------------------------
-- 1. ENUM TYPES
-- ---------------------------------------------------------------------
create type officer_role as enum ('collection_point', 'distribution_point');
create type officer_status as enum ('pending', 'approved', 'rejected');
create type shipment_status as enum ('dispatched', 'received');
create type item_condition as enum ('good', 'slightly_damaged', 'damaged');
create type flag_status as enum ('open', 'resolved');
create type donation_category as enum ('clothes', 'blankets', 'stationery', 'books', 'other');

-- ---------------------------------------------------------------------
-- 2. ADMINS  (Collector Office dashboard users — created manually,
--    not via public signup, e.g. by inserting a row after the person
--    signs up through Supabase Auth normally)
-- ---------------------------------------------------------------------
create table admins (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null,
  designation text,                 -- e.g. "Collector & Magistrate"
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 3. DISTRIBUTION CENTERS  (created before officers/collection_points
--    to avoid a circular foreign key; the officer link is added later)
-- ---------------------------------------------------------------------
create table distribution_centers (
  id                    uuid primary key default gen_random_uuid(),
  name                  text not null,
  short_code            text unique,        -- e.g. "DC-01"
  address               text not null,
  contact_person_name   text,
  contact_person_phone  text,
  photo_url             text,               -- Cloudinary URL, see storage notes
  status                text not null default 'active' check (status in ('active','inactive')),
  created_at            timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 4. COLLECTION POINTS
-- ---------------------------------------------------------------------
create table collection_points (
  id                          uuid primary key default gen_random_uuid(),
  name                        text not null,
  short_code                  text unique,        -- e.g. "CP-014", used in batch codes
  address                     text not null,
  zone                        text,
  contact_person_name         text,
  contact_person_phone        text,
  photo_url                   text,               -- Cloudinary URL
  cycle_frequency_days        int not null default 30,
  default_distribution_center_id uuid references distribution_centers(id),
  last_collected_at           timestamptz,
  status                      text not null default 'active' check (status in ('active','inactive')),
  created_at                  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 5. OFFICERS  (extends auth.users — one row per signed-up officer)
-- ---------------------------------------------------------------------
create table officers (
  id                          uuid primary key references auth.users(id) on delete cascade,
  organization_name           text not null,
  full_name                   text not null,
  phone                       text not null,
  email                       text not null,
  role                        officer_role not null,
  status                      officer_status not null default 'pending',
  assigned_collection_point_id    uuid references collection_points(id),
  assigned_distribution_center_id uuid references distribution_centers(id),
  approved_by                 uuid references admins(id),
  approved_at                 timestamptz,
  rejected_reason             text,
  created_at                  timestamptz not null default now(),

  -- an officer is EITHER collection_point OR distribution_point, never both,
  -- and only ever linked to the matching kind of location
  constraint officer_role_location_match check (
    (role = 'collection_point' and assigned_distribution_center_id is null)
    or
    (role = 'distribution_point' and assigned_collection_point_id is null)
  )
);

-- now that officers exists, add the 1-to-1 back-links with UNIQUE
-- constraints so one officer can never be assigned to more than one place
alter table collection_points
  add column assigned_officer_id uuid unique references officers(id);

alter table distribution_centers
  add column assigned_officer_id uuid unique references officers(id);

-- ---------------------------------------------------------------------
-- 6. SHIPMENTS  (one row = one full donation batch's journey:
--    logged at a Collection Point -> dispatched -> received/acknowledged
--    at a Distribution Center)
-- ---------------------------------------------------------------------
create table shipments (
  id                      uuid primary key default gen_random_uuid(),
  serial_no               bigserial,          -- used to build the human-readable batch_code
  batch_code              text unique,        -- filled in by trigger below, e.g. "CP-014-B07"

  collection_point_id     uuid not null references collection_points(id),
  logged_by_officer_id    uuid not null references officers(id),

  -- weight logged per category at the Collection Point (kg)
  clothes_kg              numeric(8,2) not null default 0,
  clothes_photo_url       text,
  blankets_kg             numeric(8,2) not null default 0,
  blankets_photo_url      text,
  stationery_kg           numeric(8,2) not null default 0,
  stationery_photo_url    text,
  books_kg                numeric(8,2) not null default 0,
  books_photo_url         text,
  other_kg                numeric(8,2) not null default 0,
  other_photo_url         text,
  other_label             text,               -- what "Other" actually was, if used

  total_kg numeric(8,2) generated always as
    (clothes_kg + blankets_kg + stationery_kg + books_kg + other_kg) stored,

  -- dispatch details (picked from dropdowns on the merged Dispatch screen)
  distribution_center_id  uuid not null references distribution_centers(id),
  delivered_by_name       text not null,
  vehicle_number          text not null,
  dispatched_at           timestamptz not null default now(),

  -- Distribution Center side — single acknowledgment, not per-category
  status                  shipment_status not null default 'dispatched',
  received_by_officer_id  uuid references officers(id),
  received_photo_url      text,
  condition                item_condition,
  condition_note           text,
  received_at              timestamptz,

  created_at              timestamptz not null default now()
);

create index idx_shipments_collection_point on shipments(collection_point_id);
create index idx_shipments_distribution_center on shipments(distribution_center_id);
create index idx_shipments_dispatched_at on shipments(dispatched_at);
create index idx_shipments_status on shipments(status);

-- auto-generate batch_code like "CP-014-B07" on insert
create or replace function set_batch_code()
returns trigger as $$
declare
  cp_code text;
begin
  select short_code into cp_code from collection_points where id = new.collection_point_id;
  new.batch_code := coalesce(cp_code, 'CP') || '-B' || lpad(new.serial_no::text, 2, '0');
  return new;
end;
$$ language plpgsql;

create trigger trg_set_batch_code
  before insert on shipments
  for each row execute function set_batch_code();

-- keep collection_points.last_collected_at in sync automatically
create or replace function touch_last_collected()
returns trigger as $$
begin
  update collection_points
  set last_collected_at = new.dispatched_at
  where id = new.collection_point_id;
  return new;
end;
$$ language plpgsql;

create trigger trg_touch_last_collected
  after insert on shipments
  for each row execute function touch_last_collected();

-- ---------------------------------------------------------------------
-- 7. FLAGS  (issues raised on a shipment — auto-created when condition
--    is damaged/slightly_damaged, but the table stays generic so an
--    admin can also raise or resolve one manually)
-- ---------------------------------------------------------------------
create table flags (
  id                  uuid primary key default gen_random_uuid(),
  shipment_id         uuid not null references shipments(id),
  raised_by_officer_id uuid references officers(id),
  issue_type          text not null,          -- e.g. 'damaged', 'slightly_damaged', 'other'
  note                text,
  status              flag_status not null default 'open',
  resolved_by_admin_id uuid references admins(id),
  resolution_note      text,
  resolved_at          timestamptz,
  created_at           timestamptz not null default now()
);

create index idx_flags_status on flags(status);

-- auto-raise a flag whenever a Distribution Center officer marks a
-- shipment's condition as damaged or slightly_damaged
create or replace function auto_raise_flag()
returns trigger as $$
begin
  if new.condition in ('damaged', 'slightly_damaged') and
     (old.condition is distinct from new.condition) then
    insert into flags (shipment_id, raised_by_officer_id, issue_type, note)
    values (new.id, new.received_by_officer_id, new.condition::text, new.condition_note);
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_auto_raise_flag
  after update on shipments
  for each row execute function auto_raise_flag();

-- ---------------------------------------------------------------------
-- 8. INVENTORY STATUS  (Distribution Center marks a category as
--    out-of-stock; one row per center per category)
-- ---------------------------------------------------------------------
create table inventory_status (
  id                     uuid primary key default gen_random_uuid(),
  distribution_center_id uuid not null references distribution_centers(id),
  category               donation_category not null,
  is_out_of_stock        boolean not null default false,
  updated_by_officer_id  uuid references officers(id),
  updated_at             timestamptz not null default now(),
  unique (distribution_center_id, category)
);

-- =====================================================================
-- 9. ROW LEVEL SECURITY
-- =====================================================================
alter table officers enable row level security;
alter table collection_points enable row level security;
alter table distribution_centers enable row level security;
alter table shipments enable row level security;
alter table flags enable row level security;
alter table inventory_status enable row level security;
alter table admins enable row level security;

-- helper: is the current user an admin?
create or replace function is_admin()
returns boolean as $$
  select exists (select 1 from admins where id = auth.uid());
$$ language sql stable;

-- OFFICERS: a person can see/update their own row; admins see/update all
create policy "officers_select_own" on officers
  for select using (auth.uid() = id or is_admin());
create policy "officers_insert_self" on officers
  for insert with check (auth.uid() = id);   -- signup creates their own row, status defaults 'pending'
create policy "officers_update_own_or_admin" on officers
  for update using (auth.uid() = id or is_admin());

-- COLLECTION POINTS: the assigned officer sees their own point; admins see/manage all
create policy "cp_select" on collection_points
  for select using (
    is_admin() or assigned_officer_id = auth.uid()
  );
create policy "cp_admin_write" on collection_points
  for all using (is_admin()) with check (is_admin());

-- DISTRIBUTION CENTERS: same pattern
create policy "dc_select" on distribution_centers
  for select using (
    is_admin() or assigned_officer_id = auth.uid()
  );
create policy "dc_admin_write" on distribution_centers
  for all using (is_admin()) with check (is_admin());

-- SHIPMENTS: CP officer can insert/see shipments for their own point;
-- DC officer can see/update (to acknowledge) shipments headed to their center;
-- admins see everything
create policy "shipments_select" on shipments
  for select using (
    is_admin()
    or collection_point_id in (select id from collection_points where assigned_officer_id = auth.uid())
    or distribution_center_id in (select id from distribution_centers where assigned_officer_id = auth.uid())
  );
create policy "shipments_insert_by_cp_officer" on shipments
  for insert with check (
    collection_point_id in (select id from collection_points where assigned_officer_id = auth.uid())
  );
create policy "shipments_update_by_dc_officer_or_admin" on shipments
  for update using (
    is_admin()
    or distribution_center_id in (select id from distribution_centers where assigned_officer_id = auth.uid())
  );

-- FLAGS: visible to admins and the officers involved; only admins resolve
create policy "flags_select" on flags
  for select using (
    is_admin() or raised_by_officer_id = auth.uid()
  );
create policy "flags_insert_by_officer" on flags
  for insert with check (raised_by_officer_id = auth.uid());
create policy "flags_update_admin_only" on flags
  for update using (is_admin());

-- INVENTORY STATUS: DC officer manages their own center's rows; admins see all
create policy "inventory_select" on inventory_status
  for select using (
    is_admin()
    or distribution_center_id in (select id from distribution_centers where assigned_officer_id = auth.uid())
  );
create policy "inventory_upsert_by_dc_officer" on inventory_status
  for all using (
    distribution_center_id in (select id from distribution_centers where assigned_officer_id = auth.uid())
  ) with check (
    distribution_center_id in (select id from distribution_centers where assigned_officer_id = auth.uid())
  );

-- ADMINS table: admins can see each other; nobody else needs to
create policy "admins_select" on admins
  for select using (is_admin());

-- =====================================================================
-- 10. REPORTING VIEWS
--     (These power "quantity collected per place", and the monthly /
--     quarterly / yearly reports — group by whatever period you need
--     at query time using date_trunc on dispatched_at.)
-- =====================================================================

-- Unpivots the wide per-category columns into long format: one row per
-- (shipment, category). This is the base every report query should use.
create view v_shipment_categories as
  select id as shipment_id, collection_point_id, distribution_center_id,
         dispatched_at, status, 'clothes'::donation_category as category, clothes_kg as weight_kg
  from shipments
  union all
  select id, collection_point_id, distribution_center_id,
         dispatched_at, status, 'blankets', blankets_kg
  from shipments
  union all
  select id, collection_point_id, distribution_center_id,
         dispatched_at, status, 'stationery', stationery_kg
  from shipments
  union all
  select id, collection_point_id, distribution_center_id,
         dispatched_at, status, 'books', books_kg
  from shipments
  union all
  select id, collection_point_id, distribution_center_id,
         dispatched_at, status, 'other', other_kg
  from shipments;

-- Quantity collected per Collection Point, all-time (the "overall data" view)
create view v_totals_by_collection_point as
  select cp.id as collection_point_id, cp.name, cp.short_code,
         sum(s.total_kg) as total_kg,
         count(*) as total_shipments
  from shipments s
  join collection_points cp on cp.id = s.collection_point_id
  group by cp.id, cp.name, cp.short_code;

-- Quantity received per Distribution Center, all-time
create view v_totals_by_distribution_center as
  select dc.id as distribution_center_id, dc.name, dc.short_code,
         sum(s.total_kg) as total_kg,
         count(*) as total_shipments
  from shipments s
  join distribution_centers dc on dc.id = s.distribution_center_id
  group by dc.id, dc.name, dc.short_code;

-- District-wide totals by category (overall data, category breakdown)
create view v_totals_by_category as
  select category, sum(weight_kg) as total_kg
  from v_shipment_categories
  group by category;

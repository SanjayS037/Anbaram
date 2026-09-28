# Anbaram — Feature → Table Mapping

A quick-reference for which table(s) each screen or feature reads from and
writes to. Use this alongside `anbaram_schema.sql` while building each screen.

---

## Officer Signup (Collection Point / Distribution Center app)

- **Writes to:** `officers` (one insert — `status` defaults to `'pending'`,
  no location assigned yet)
- Nothing else is touched at this stage — `collection_points` /
  `distribution_centers` are not linked until an admin approves.

## Officer Login (both mobile apps)

- **Reads from:** `officers` (by `auth.uid()`) — check `status` and `role`
  to decide what to show:
  - `status = 'pending'` → "Waiting for approval" screen, nothing else loads
  - `status = 'rejected'` → "Request declined" screen
  - `status = 'approved'` → continue to that role's home screen

## Admin Login (dashboard)

- **Reads from:** `admins` (by `auth.uid()`) — presence of a row = admin access

## Admin — Pending Requests / Approve / Reject (Nodal Officers screen)

- **Reads from:** `officers` where `status = 'pending'`
- **Writes to:** `officers` — on Approve: set `status = 'approved'`,
  `approved_by`, `approved_at`, and one of `assigned_collection_point_id` /
  `assigned_distribution_center_id`. On Reject: set `status = 'rejected'`,
  `rejected_reason`.

## Admin — Nodal Officers list / Remove Officer

- **Reads from:** `officers` (all approved rows), joined with
  `collection_points` / `distribution_centers` for the location name
- **Writes to:** `officers` — Remove sets `status` back to `'rejected'`
  (or you can add a `'removed'` status if you want it distinct) and clears
  the assigned location column

---

## Collection Point Officer App

### My Point (home)

- **Reads from:** `collection_points` (the one row matching
  `officers.assigned_collection_point_id`) — name, address, photo, last
  collected date, contact person
- Status banner ("Due This Week" / "Up to Date") is computed in the app from
  `last_collected_at` + `cycle_frequency_days` — no separate table needed

### Log Weight

- **No writes yet** — weights and photos are held in the app's local state
  as the officer works through categories; nothing hits the database until
  the final Dispatch screen submits

### Dispatch (merged details + confirmation)

- **Reads from:** `distribution_centers` (to populate the "Destination"
  dropdown — filter by `status = 'active'`)
- **Writes to:** `shipments` — **one insert** on "Submit & Go to Home",
  containing all five category weights + photo URLs, `distribution_center_id`,
  `delivered_by_name`, `vehicle_number`
- This insert **triggers two things automatically** (see schema triggers):
  - `batch_code` gets generated (e.g. `CP-014-B07`)
  - `collection_points.last_collected_at` gets updated to match

### Photo uploads (Clothes/Blankets/Stationery/Books/Other on Log Weight)

- **Not a table write** — each photo goes to Cloudinary first; the returned
  URL is just held in app state until it's included in the `shipments`
  insert above (e.g. `clothes_photo_url`)

---

## Distribution Center Officer App

### Incoming Shipments (home)

- **Reads from:** `shipments` where `distribution_center_id` matches
  `officers.assigned_distribution_center_id`, filtered/grouped by `status`
  (`'dispatched'` = awaiting verification, `'received'` = done)

### Verify Shipment (single acknowledgment)

- **Reads from:** `shipments` (the selected row) — shows what was logged
  (`clothes_kg`, `blankets_kg`, etc.) as read-only summary
- **Writes to:** `shipments` — **one update** on "Confirm Receipt":
  `status = 'received'`, `received_by_officer_id`, `received_photo_url`,
  `condition`, `condition_note`, `received_at`
- If `condition` is `'damaged'` or `'slightly_damaged'`, this update
  **automatically inserts a row into `flags`** — no separate action needed
  from the officer or the app

### Inventory Out of Stock

- **Reads from:** `inventory_status` where `distribution_center_id` matches
  the officer's center — one row per category
- **Writes to:** `inventory_status` — upsert (`is_out_of_stock` toggle),
  `updated_by_officer_id`, `updated_at`

---

## Collector Office Dashboard

### Overview

- **Reads from:**
  - `v_totals_by_category` — the four category stat/chart numbers
  - `collection_points` / `distribution_centers` — active counts
    (`status = 'active'`)
  - `flags` where `status = 'open'` — open flags count + table
  - `shipments` (recent rows, ordered by `dispatched_at` desc) — recent
    activity feed
  - `collection_points` where overdue (compare `last_collected_at` +
    `cycle_frequency_days` to today) — officer compliance list

### Collection Points Management

- **Reads from:** `collection_points`, joined with `officers` (assigned
  officer's name) and `shipments` (recent history per point)
- **Writes to:** `collection_points` — Add / Edit / Reassign
  (`assigned_officer_id`), set `cycle_frequency_days`,
  `default_distribution_center_id`

### Distribution Centers Management

- **Reads from:** `distribution_centers`, joined with `officers` and
  `shipments` (incoming/reconciled history)
- **Writes to:** `distribution_centers` — Add / Edit / Reassign

### Nodal Officers Management

- Covered above under Admin — Pending Requests / Remove Officer

### Flags & Issues

- **Reads from:** `flags`, joined with `shipments` (for batch code,
  collection point, distribution center) and `officers` (who raised it)
- **Writes to:** `flags` — Resolve sets `status = 'resolved'`,
  `resolved_by_admin_id`, `resolution_note`, `resolved_at`

### Batch Explorer

- **Reads from:** `shipments` directly (search by `batch_code`), or
  `v_shipment_categories` when filtering/searching by category

### Reports (Monthly / Quarterly / Yearly / Overall) + Excel Export

- **Reads from:** `v_shipment_categories` (group by `date_trunc('month' /
  'quarter' / 'year', dispatched_at)`), or the pre-built views
  `v_totals_by_collection_point`, `v_totals_by_distribution_center`,
  `v_totals_by_category` for the "overall data" views
- No writes — Excel export just takes the query result and runs it through
  SheetJS client-side, as covered separately

### Public Transparency View

- **Reads from:** `v_totals_by_category`, `v_totals_by_collection_point` —
  same aggregate views as the dashboard, just exposed on a public read-only
  route with no `officers`/`admins`/individual-shipment detail shown

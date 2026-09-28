-- =====================================================================
-- ANBARAM — Step 14 security (RLS) checks
--
-- HOW TO RUN: Supabase → SQL Editor → New query → paste this whole file
--             → role dropdown = postgres → Run.
--
-- Covers migrations 001, 002, the collection_requests migration and 003.
-- WHAT IT DOES: creates temporary test users/locations/shipments, runs
-- every check while pretending to be each kind of user (anon, pending
-- officer, CP officer, DC officer, admin), then UNDOES ALL OF IT.
-- Your real data is never changed. The output is one PASS/FAIL table.
--
-- Only side effect: shipment serial numbers (used in batch codes such as
-- CP-014-B07) may skip 2 numbers, because Postgres sequences are not undone.
-- =====================================================================

-- helper: run a statement as a given user; returns 'rows:N' or 'error:<msg>'
create or replace function pg_temp.anbaram_as(p_uid uuid, p_sql text)
returns text language plpgsql as $$
declare
  n bigint;
begin
  if p_uid is null then
    perform set_config('role', 'anon', true);
    perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  else
    perform set_config('role', 'authenticated', true);
    perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
  end if;
  perform set_config('request.jwt.claim.sub', coalesce(p_uid::text, ''), true);

  if p_sql ~* '^\s*select\s+count' then
    execute p_sql into n;
  else
    execute p_sql;
    get diagnostics n = row_count;
  end if;
  reset role;
  return 'rows:' || n;
exception when others then
  reset role;
  return 'error:' || sqlerrm;
end;
$$;

create or replace function pg_temp.anbaram_rls_checks()
returns table (no int, who text, check_name text, result text, detail text)
language plpgsql as $$
declare
  -- fixed ids for throwaway test data (all rolled back at the end)
  u_admin   uuid := 'a0000000-0000-4000-8000-00000000000a';
  u_pending uuid := 'a0000000-0000-4000-8000-0000000000e1';
  u_cp      uuid := 'a0000000-0000-4000-8000-0000000000c1';
  u_dc      uuid := 'a0000000-0000-4000-8000-0000000000d1';
  l_cp      uuid := 'b0000000-0000-4000-8000-0000000000c1';
  l_cp_free uuid := 'b0000000-0000-4000-8000-0000000000c2';
  l_dc      uuid := 'b0000000-0000-4000-8000-0000000000d1';
  s_id      uuid;
  f_id      uuid;
  q1        uuid := 'c0000000-0000-4000-8000-000000000001';
  q2        uuid := 'c0000000-0000-4000-8000-000000000002';
  q3        uuid := 'c0000000-0000-4000-8000-000000000003';
  r text;
  d text;
  names text[] := '{}';
  whos text[] := '{}';
  results text[] := '{}';
  details text[] := '{}';
  i int;
begin
  begin -- everything inside this block is rolled back at the end
    -- ---------------- configuration (migrations applied?) ----------------
    whos := array_append(whos, ('setup')::text); names := array_append(names, ('migration 001: is_admin() is SECURITY DEFINER')::text);
    select case when prosecdef then 'PASS' else 'FAIL' end into r from pg_proc where proname = 'is_admin' and pronamespace = 'public'::regnamespace;
    results := array_append(results, (coalesce(r, 'FAIL'))::text); details := array_append(details, ('')::text);

    whos := array_append(whos, ('setup')::text); names := array_append(names, ('migration 001: trigger functions are SECURITY DEFINER')::text);
    select case when bool_and(prosecdef) and count(*) = 2 then 'PASS' else 'FAIL' end into r
      from pg_proc where proname in ('touch_last_collected', 'auto_raise_flag') and pronamespace = 'public'::regnamespace;
    results := array_append(results, (r)::text); details := array_append(details, ('')::text);

    whos := array_append(whos, ('setup')::text); names := array_append(names, ('migration 001: unsafe old policies removed')::text);
    select case when count(*) = 0 then 'PASS' else 'FAIL' end, coalesce(string_agg(policyname, ', '), '') into r, d
      from pg_policies where schemaname = 'public'
       and policyname in ('officers_update_own_or_admin', 'shipments_update_by_dc_officer_or_admin', 'flags_insert_by_officer');
    results := array_append(results, (r)::text); details := array_append(details, (d)::text);

    whos := array_append(whos, ('setup')::text); names := array_append(names, ('migration 002: officer functions exist')::text);
    select case when count(distinct proname) = 5 then 'PASS' else 'FAIL' end into r from pg_proc
     where pronamespace = 'public'::regnamespace
       and proname in ('approve_officer', 'reject_officer', 'remove_officer', 'assign_officer', 'unassign_location');
    results := array_append(results, (r)::text); details := array_append(details, ('if FAIL: run 002_officer_assignment_rpcs.sql')::text);

    -- ---------------- throwaway test data ----------------
    insert into auth.users (id, email) values
      (u_admin, 'rls-admin@test.invalid'), (u_pending, 'rls-pending@test.invalid'),
      (u_cp, 'rls-cp@test.invalid'), (u_dc, 'rls-dc@test.invalid');
    insert into public.admins (id, full_name) values (u_admin, 'RLS Test Admin');
    insert into public.distribution_centers (id, name, short_code, address) values (l_dc, 'RLS Test DC', 'ZZ-RLS-DC', 'test');
    insert into public.collection_points (id, name, short_code, address, default_distribution_center_id) values
      (l_cp, 'RLS Test CP', 'ZZ-RLS-CP1', 'test', l_dc), (l_cp_free, 'RLS Test CP 2', 'ZZ-RLS-CP2', 'test', l_dc);
    -- "on conflict" in case the project has a trigger that creates officer rows on signup
    insert into public.officers (id, organization_name, full_name, phone, email, role, status) values
      (u_pending, 'Test', 'RLS Pending', '0', 'rls-pending@test.invalid', 'collection_point', 'pending'),
      (u_cp, 'Test', 'RLS CP Officer', '0', 'rls-cp@test.invalid', 'collection_point', 'approved'),
      (u_dc, 'Test', 'RLS DC Officer', '0', 'rls-dc@test.invalid', 'distribution_point', 'approved')
    on conflict (id) do update set role = excluded.role, status = excluded.status,
      assigned_collection_point_id = null, assigned_distribution_center_id = null;
    update public.officers set assigned_collection_point_id = l_cp where id = u_cp;
    update public.officers set assigned_distribution_center_id = l_dc where id = u_dc;
    update public.collection_points set assigned_officer_id = u_cp where id = l_cp;
    update public.distribution_centers set assigned_officer_id = u_dc where id = l_dc;
    insert into public.shipments (collection_point_id, logged_by_officer_id, clothes_kg, distribution_center_id, delivered_by_name, vehicle_number)
      values (l_cp, u_cp, 10, l_dc, 'Test driver', 'TN00TEST') returning id into s_id;

    -- ---------------- anonymous (public key, not signed in) ----------------
    whos := array_append(whos, ('anon')::text); names := array_append(names, ('cannot read shipments')::text);
    r := pg_temp.anbaram_as(null, 'select count(*) from public.shipments');
    results := array_append(results, ((case when r = 'rows:0' then 'PASS' else 'FAIL' end))::text); details := array_append(details, (r)::text);

    whos := array_append(whos, ('anon')::text); names := array_append(names, ('cannot read per-shipment view (v_shipment_categories)')::text);
    r := pg_temp.anbaram_as(null, 'select count(*) from public.v_shipment_categories');
    results := array_append(results, ((case when r = 'rows:0' then 'PASS' else 'FAIL' end))::text); details := array_append(details, (r)::text);

    whos := array_append(whos, ('anon')::text); names := array_append(names, ('cannot read officers')::text);
    r := pg_temp.anbaram_as(null, 'select count(*) from public.officers');
    results := array_append(results, ((case when r = 'rows:0' then 'PASS' else 'FAIL' end))::text); details := array_append(details, (r)::text);

    whos := array_append(whos, ('anon')::text); names := array_append(names, ('cannot call approve_officer')::text);
    r := pg_temp.anbaram_as(null, format('select public.approve_officer(%L, %L)', u_pending, l_cp_free));
    results := array_append(results, ((case when r like 'error:%' then 'PASS' else 'FAIL' end))::text); details := array_append(details, (r)::text);

    -- ---------------- pending officer ----------------
    whos := array_append(whos, ('pending officer')::text); names := array_append(names, ('cannot approve self')::text);
    r := pg_temp.anbaram_as(u_pending, format('update public.officers set status = ''approved'' where id = %L', u_pending));
    results := array_append(results, ((case when r = 'rows:0' or r like 'error:%' then 'PASS' else 'FAIL' end))::text); details := array_append(details, (r)::text);

    whos := array_append(whos, ('pending officer')::text); names := array_append(names, ('cannot assign self to a location')::text);
    r := pg_temp.anbaram_as(u_pending, format('update public.collection_points set assigned_officer_id = %L where id = %L', u_pending, l_cp_free));
    results := array_append(results, ((case when r = 'rows:0' or r like 'error:%' then 'PASS' else 'FAIL' end))::text); details := array_append(details, (r)::text);

    whos := array_append(whos, ('pending officer')::text); names := array_append(names, ('cannot call approve_officer')::text);
    r := pg_temp.anbaram_as(u_pending, format('select public.approve_officer(%L, %L)', u_pending, l_cp_free));
    results := array_append(results, ((case when r like 'error:%' then 'PASS' else 'FAIL' end))::text); details := array_append(details, (r)::text);

    whos := array_append(whos, ('pending officer')::text); names := array_append(names, ('sees no shipments')::text);
    r := pg_temp.anbaram_as(u_pending, 'select count(*) from public.shipments');
    results := array_append(results, ((case when r = 'rows:0' then 'PASS' else 'FAIL' end))::text); details := array_append(details, (r)::text);

    -- a brand-new signup (the test admin uid has no officer row yet)
    whos := array_append(whos, ('new signup')::text); names := array_append(names, ('cannot register as already approved')::text);
    r := pg_temp.anbaram_as(u_admin, format(
      'insert into public.officers (id, organization_name, full_name, phone, email, role, status) values (%L, ''x'', ''x'', ''0'', ''x@test.invalid'', ''collection_point'', ''approved'')', u_admin));
    results := array_append(results, ((case when r like 'error:%' then 'PASS' else 'FAIL' end))::text); details := array_append(details, (r)::text);

    -- ---------------- collection point officer ----------------
    whos := array_append(whos, ('CP officer')::text); names := array_append(names, ('sees only own collection point')::text);
    r := pg_temp.anbaram_as(u_cp, 'select count(*) from public.collection_points');
    results := array_append(results, ((case when r = 'rows:1' then 'PASS' else 'FAIL' end))::text); details := array_append(details, (r)::text);

    whos := array_append(whos, ('CP officer')::text); names := array_append(names, ('sees only own shipments')::text);
    r := pg_temp.anbaram_as(u_cp, format('select count(*) from public.shipments where collection_point_id <> %L', l_cp));
    results := array_append(results, ((case when r = 'rows:0' then 'PASS' else 'FAIL' end))::text); details := array_append(details, (r)::text);

    whos := array_append(whos, ('CP officer')::text); names := array_append(names, ('cannot edit own collection point')::text);
    r := pg_temp.anbaram_as(u_cp, format('update public.collection_points set cycle_frequency_days = 999 where id = %L', l_cp));
    results := array_append(results, ((case when r = 'rows:0' or r like 'error:%' then 'PASS' else 'FAIL' end))::text); details := array_append(details, (r)::text);

    whos := array_append(whos, ('CP officer')::text); names := array_append(names, ('cannot create a shipment already "received"')::text);
    r := pg_temp.anbaram_as(u_cp, format(
      'insert into public.shipments (collection_point_id, logged_by_officer_id, distribution_center_id, delivered_by_name, vehicle_number, status) values (%L, %L, %L, ''x'', ''x'', ''received'')', l_cp, u_cp, l_dc));
    results := array_append(results, ((case when r like 'error:%' then 'PASS' else 'FAIL' end))::text); details := array_append(details, (r)::text);

    whos := array_append(whos, ('CP officer')::text); names := array_append(names, ('cannot log a shipment for another point')::text);
    r := pg_temp.anbaram_as(u_cp, format(
      'insert into public.shipments (collection_point_id, logged_by_officer_id, distribution_center_id, delivered_by_name, vehicle_number) values (%L, %L, %L, ''x'', ''x'')', l_cp_free, u_cp, l_dc));
    results := array_append(results, ((case when r like 'error:%' then 'PASS' else 'FAIL' end))::text); details := array_append(details, (r)::text);

    whos := array_append(whos, ('CP officer')::text); names := array_append(names, ('can log a normal shipment (and trigger updates last_collected_at)')::text);
    update public.collection_points set last_collected_at = null where id = l_cp;
    r := pg_temp.anbaram_as(u_cp, format(
      'insert into public.shipments (collection_point_id, logged_by_officer_id, clothes_kg, distribution_center_id, delivered_by_name, vehicle_number) values (%L, %L, 5, %L, ''x'', ''x'')', l_cp, u_cp, l_dc));
    results := array_append(results, ((case when r = 'rows:1' and (select last_collected_at from public.collection_points where id = l_cp) is not null then 'PASS' else 'FAIL' end))::text);
    details := array_append(details, (r)::text);

    whos := array_append(whos, ('CP officer')::text); names := array_append(names, ('cannot read admins')::text);
    r := pg_temp.anbaram_as(u_cp, 'select count(*) from public.admins');
    results := array_append(results, ((case when r = 'rows:0' then 'PASS' else 'FAIL' end))::text); details := array_append(details, (r)::text);

    -- ---------------- distribution center officer ----------------
    whos := array_append(whos, ('DC officer')::text); names := array_append(names, ('cannot change logged weights')::text);
    r := pg_temp.anbaram_as(u_dc, format('update public.shipments set clothes_kg = 999 where id = %L', s_id));
    results := array_append(results, ((case when r like 'error:%' or r = 'rows:0' then 'PASS' else 'FAIL' end))::text); details := array_append(details, (r)::text);

    whos := array_append(whos, ('DC officer')::text); names := array_append(names, ('cannot receive in someone else''s name')::text);
    r := pg_temp.anbaram_as(u_dc, format(
      'update public.shipments set status = ''received'', received_by_officer_id = %L, condition = ''good'', received_at = now() where id = %L', u_cp, s_id));
    results := array_append(results, ((case when r like 'error:%' or r = 'rows:0' then 'PASS' else 'FAIL' end))::text); details := array_append(details, (r)::text);

    whos := array_append(whos, ('DC officer')::text); names := array_append(names, ('can receive as damaged → flag auto-created')::text);
    r := pg_temp.anbaram_as(u_dc, format(
      'update public.shipments set status = ''received'', received_by_officer_id = %L, condition = ''damaged'', condition_note = ''rls test'', received_at = now() where id = %L', u_dc, s_id));
    select id into f_id from public.flags where shipment_id = s_id;
    results := array_append(results, ((case when r = 'rows:1' and f_id is not null then 'PASS' else 'FAIL' end))::text); details := array_append(details, (r)::text);

    whos := array_append(whos, ('DC officer')::text); names := array_append(names, ('cannot re-acknowledge a received shipment')::text);
    r := pg_temp.anbaram_as(u_dc, format(
      'update public.shipments set status = ''received'', received_by_officer_id = %L, condition = ''good'', received_at = now() where id = %L', u_dc, s_id));
    results := array_append(results, ((case when r = 'rows:0' or r like 'error:%' then 'PASS' else 'FAIL' end))::text); details := array_append(details, (r)::text);

    whos := array_append(whos, ('DC officer')::text); names := array_append(names, ('cannot resolve flags')::text);
    r := pg_temp.anbaram_as(u_dc, format('update public.flags set status = ''resolved'' where id = %L', f_id));
    results := array_append(results, ((case when r = 'rows:0' or r like 'error:%' then 'PASS' else 'FAIL' end))::text); details := array_append(details, (r)::text);

    whos := array_append(whos, ('DC officer')::text); names := array_append(names, ('cannot insert flags directly')::text);
    r := pg_temp.anbaram_as(u_dc, format(
      'insert into public.flags (shipment_id, raised_by_officer_id, issue_type) values (%L, %L, ''other'')', s_id, u_dc));
    results := array_append(results, ((case when r like 'error:%' then 'PASS' else 'FAIL' end))::text); details := array_append(details, (r)::text);

    -- ---------------- collection requests (their migration + 003) ----------------
    if to_regclass('public.collection_requests') is null then
      whos := array_append(whos, 'setup'); names := array_append(names, 'collection_requests table exists');
      results := array_append(results, 'SKIP'); details := array_append(details, 'table not found - request checks skipped');
    else
      execute format($f$insert into public.collection_requests (id, collection_point_id, distribution_center_id, requested_by_admin_id, requested_categories) values
        (%L, %L, %L, %L, '{blankets}'), (%L, %L, %L, %L, '{books}'), (%L, %L, %L, %L, '{clothes}')$f$,
        q1, l_cp, l_dc, u_admin, q2, l_cp, l_dc, u_admin, q3, l_cp_free, l_dc, u_admin);

      whos := array_append(whos, 'setup'); names := array_append(names, 'migration 003: request trigger is SECURITY DEFINER');
      select case when prosecdef then 'PASS' else 'FAIL' end into r from pg_proc where proname = 'complete_linked_request' and pronamespace = 'public'::regnamespace;
      results := array_append(results, coalesce(r, 'FAIL')); details := array_append(details, 'if FAIL: run 003_collection_requests_fixes.sql');

      whos := array_append(whos, 'CP officer'); names := array_append(names, 'sees only own point''s requests');
      r := pg_temp.anbaram_as(u_cp, format('select count(*) from public.collection_requests where id in (%L, %L, %L)', q1, q2, q3));
      results := array_append(results, (case when r = 'rows:2' then 'PASS' else 'FAIL' end)); details := array_append(details, r);

      whos := array_append(whos, 'CP officer'); names := array_append(names, 'can start a pending request');
      r := pg_temp.anbaram_as(u_cp, format('update public.collection_requests set status = ''in_progress'', started_at = now() where id = %L', q1));
      results := array_append(results, (case when r = 'rows:1' then 'PASS' else 'FAIL' end)); details := array_append(details, r);

      whos := array_append(whos, 'CP officer'); names := array_append(names, 'cannot cancel or complete a request directly');
      r := pg_temp.anbaram_as(u_cp, format('update public.collection_requests set status = ''cancelled'' where id = %L', q2));
      results := array_append(results, (case when r = 'rows:0' or r like 'error:%' then 'PASS' else 'FAIL' end)); details := array_append(details, r);

      whos := array_append(whos, 'CP officer'); names := array_append(names, 'cannot change a request''s destination');
      r := pg_temp.anbaram_as(u_cp, format('update public.collection_requests set distribution_center_id = %L where id = %L', l_dc, q2));
      results := array_append(results, (case when r = 'rows:0' or r like 'error:%' then 'PASS' else 'FAIL' end)); details := array_append(details, r);

      whos := array_append(whos, 'CP officer'); names := array_append(names, 'cannot create requests');
      r := pg_temp.anbaram_as(u_cp, format(
        'insert into public.collection_requests (collection_point_id, distribution_center_id, requested_by_admin_id, requested_categories) values (%L, %L, %L, ''{other}'')', l_cp, l_dc, u_admin));
      results := array_append(results, (case when r like 'error:%' then 'PASS' else 'FAIL' end)); details := array_append(details, r);

      whos := array_append(whos, 'CP officer'); names := array_append(names, 'cannot link a shipment to another point''s request');
      r := pg_temp.anbaram_as(u_cp, format(
        'insert into public.shipments (collection_point_id, logged_by_officer_id, clothes_kg, distribution_center_id, delivered_by_name, vehicle_number, collection_request_id) values (%L, %L, 1, %L, ''x'', ''x'', %L)', l_cp, u_cp, l_dc, q3));
      results := array_append(results, (case when r like 'error:%' and (select status from public.collection_requests where id = q3) = 'pending' then 'PASS' else 'FAIL' end));
      details := array_append(details, r);

      whos := array_append(whos, 'CP officer'); names := array_append(names, 'dispatching a linked shipment completes the request');
      r := pg_temp.anbaram_as(u_cp, format(
        'insert into public.shipments (collection_point_id, logged_by_officer_id, blankets_kg, distribution_center_id, delivered_by_name, vehicle_number, collection_request_id) values (%L, %L, 12, %L, ''x'', ''x'', %L)', l_cp, u_cp, l_dc, q1));
      results := array_append(results, (case when r = 'rows:1' and (select status from public.collection_requests where id = q1) = 'completed' then 'PASS' else 'FAIL' end));
      details := array_append(details, r || ' / request now ' || coalesce((select status from public.collection_requests where id = q1), '?'));

      whos := array_append(whos, 'admin'); names := array_append(names, 'can create a request');
      r := pg_temp.anbaram_as(u_admin, format(
        'insert into public.collection_requests (collection_point_id, distribution_center_id, requested_by_admin_id, requested_categories, note) values (%L, %L, %L, ''{stationery}'', ''rls test'')', l_cp_free, l_dc, u_admin));
      results := array_append(results, (case when r = 'rows:1' then 'PASS' else 'FAIL' end)); details := array_append(details, r);

      whos := array_append(whos, 'admin'); names := array_append(names, 'can cancel an open request');
      r := pg_temp.anbaram_as(u_admin, format('update public.collection_requests set status = ''cancelled'' where id = %L and status in (''pending'', ''in_progress'')', q2));
      results := array_append(results, (case when r = 'rows:1' then 'PASS' else 'FAIL' end)); details := array_append(details, r);

      whos := array_append(whos, 'admin'); names := array_append(names, 'can read out-of-stock rows (inventory_status)');
      insert into public.inventory_status (distribution_center_id, category, is_out_of_stock) values (l_dc, 'blankets', true)
        on conflict (distribution_center_id, category) do update set is_out_of_stock = true;
      r := pg_temp.anbaram_as(u_admin, format('select count(*) from public.inventory_status where distribution_center_id = %L', l_dc));
      results := array_append(results, (case when r = 'rows:1' then 'PASS' else 'FAIL' end)); details := array_append(details, r);
    end if;

    -- ---------------- admin ----------------
    whos := array_append(whos, ('admin')::text); names := array_append(names, ('can read all officers')::text);
    r := pg_temp.anbaram_as(u_admin, format('select count(*) from public.officers where id in (%L, %L, %L)', u_pending, u_cp, u_dc));
    results := array_append(results, ((case when r = 'rows:3' then 'PASS' else 'FAIL' end))::text); details := array_append(details, (r)::text);

    whos := array_append(whos, ('admin')::text); names := array_append(names, ('can approve a pending officer into a free point')::text);
    r := pg_temp.anbaram_as(u_admin, format('select count(*) from (select public.approve_officer(%L, %L)) x', u_pending, l_cp_free));
    results := array_append(results, ((case when r = 'rows:1'
      and (select status from public.officers where id = u_pending) = 'approved'
      and (select assigned_officer_id from public.collection_points where id = l_cp_free) = u_pending then 'PASS' else 'FAIL' end))::text);
    details := array_append(details, (r)::text);

    whos := array_append(whos, ('admin')::text); names := array_append(names, ('can resolve a flag')::text);
    r := pg_temp.anbaram_as(u_admin, format(
      'update public.flags set status = ''resolved'', resolved_by_admin_id = %L, resolution_note = ''rls test'', resolved_at = now() where id = %L and status = ''open''', u_admin, f_id));
    results := array_append(results, ((case when r = 'rows:1' then 'PASS' else 'FAIL' end))::text); details := array_append(details, (r)::text);

    whos := array_append(whos, ('admin')::text); names := array_append(names, ('removing an officer revokes their access')::text);
    r := pg_temp.anbaram_as(u_admin, format('select count(*) from (select public.remove_officer(%L, ''rls test'')) x', u_cp));
    r := pg_temp.anbaram_as(u_cp, 'select count(*) from public.shipments');
    results := array_append(results, ((case when r = 'rows:0' then 'PASS' else 'FAIL' end))::text); details := array_append(details, ('removed officer now sees ' || r)::text);

    raise exception 'anbaram_rls_rollback'; -- undo every change above
  exception when others then
    if sqlerrm <> 'anbaram_rls_rollback' then
      whos := array_append(whos, ('setup')::text); names := array_append(names, ('script stopped early')::text); results := array_append(results, ('FAIL')::text); details := array_append(details, (sqlerrm)::text);
    end if;
  end;

  for i in 1 .. coalesce(array_length(names, 1), 0) loop
    no := i; who := whos[i]; check_name := names[i]; result := results[i]; detail := details[i];
    return next;
  end loop;
end;
$$;

select * from pg_temp.anbaram_rls_checks();

-- =====================================================================
-- ANBARAM — 004 Delete a collection point or distribution center
-- Run once in the Supabase SQL Editor (role: postgres) AFTER 003.
--
-- Why a function instead of a plain delete from the browser:
-- other rows point at a place (its officer, stock rows, collection
-- requests, collection points that usually send to a center). A plain
-- delete fails on those links, and clearing them one by one from the
-- browser could stop halfway. This function does it all in one
-- transaction.
--
-- A place that has ANY shipment is never deleted: shipments, flags and
-- reports depend on it. Such a place can only be closed (status
-- 'inactive'), which the dashboard already supports.
-- =====================================================================

create or replace function public.delete_location(p_location_type text, p_location_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_officer   uuid;
  v_shipments int;
begin
  if not is_admin() then
    raise exception 'Only Collector Office admins can delete places.' using errcode = '42501';
  end if;

  if p_location_type = 'collection_point' then
    select assigned_officer_id into v_officer from collection_points where id = p_location_id for update;
    if not found then raise exception 'This collection point was already deleted.'; end if;
    select count(*) into v_shipments from shipments where collection_point_id = p_location_id;
  elsif p_location_type = 'distribution_center' then
    select assigned_officer_id into v_officer from distribution_centers where id = p_location_id for update;
    if not found then raise exception 'This distribution center was already deleted.'; end if;
    select count(*) into v_shipments from shipments where distribution_center_id = p_location_id;
  else
    raise exception 'Unknown location type %.', p_location_type;
  end if;

  if v_shipments > 0 then
    raise exception 'This place has % shipment(s), so it cannot be deleted. Mark it as closed instead.', v_shipments;
  end if;

  -- The officer stays approved, just without a place (same as Remove on the Officers page).
  if v_officer is not null then perform _detach_officer(v_officer); end if;

  if p_location_type = 'collection_point' then
    update shipments set collection_request_id = null
     where collection_request_id in (select id from collection_requests where collection_point_id = p_location_id);
    delete from collection_requests where collection_point_id = p_location_id;
    delete from collection_points where id = p_location_id;
  else
    update shipments set collection_request_id = null
     where collection_request_id in (select id from collection_requests where distribution_center_id = p_location_id);
    delete from collection_requests where distribution_center_id = p_location_id;
    delete from inventory_status where distribution_center_id = p_location_id;
    update collection_points set default_distribution_center_id = null
     where default_distribution_center_id = p_location_id;
    delete from distribution_centers where id = p_location_id;
  end if;
end;
$$;

-- Callable by signed-in users only; the function re-checks is_admin().
revoke execute on function public.delete_location(text, uuid) from public, anon;
grant  execute on function public.delete_location(text, uuid) to authenticated;

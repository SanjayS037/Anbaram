-- =====================================================================
-- ANBARAM — 002 Officer approval & assignment functions
-- Run once in the Supabase SQL Editor (role: postgres) AFTER 001.
--
-- Why functions instead of plain updates from the browser:
-- an officer's location is stored in TWO places —
--   officers.assigned_collection_point_id / assigned_distribution_center_id
--   collection_points.assigned_officer_id / distribution_centers.assigned_officer_id
-- RLS grants data access through the second one. Each function below
-- updates both sides in a single transaction so they can never drift
-- apart. They write only the existing columns; no tables are added.
--
-- Every function checks is_admin() first, so calling them directly
-- with the public key achieves nothing for a non-admin.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Internal helper: detach an officer from whatever location they hold,
-- on both sides of the link. Not callable from the API.
-- ---------------------------------------------------------------------
create or replace function public._detach_officer(p_officer_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  update collection_points    set assigned_officer_id = null where assigned_officer_id = p_officer_id;
  update distribution_centers set assigned_officer_id = null where assigned_officer_id = p_officer_id;
  update officers
     set assigned_collection_point_id = null,
         assigned_distribution_center_id = null
   where id = p_officer_id;
end;
$$;

revoke execute on function public._detach_officer(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Internal helper: link an approved officer to a location (both sides).
-- Frees the officer's previous location and the location's previous
-- officer (who stays approved, just unassigned).
-- ---------------------------------------------------------------------
create or replace function public._attach_officer(p_officer_id uuid, p_location_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_role officer_role;
  v_loc_status text;
  v_prev_officer uuid;
begin
  select role into v_role from officers where id = p_officer_id for update;

  if v_role = 'collection_point' then
    select status, assigned_officer_id into v_loc_status, v_prev_officer
      from collection_points where id = p_location_id for update;
    if not found then raise exception 'Collection point not found.'; end if;
    if v_loc_status <> 'active' then raise exception 'That collection point is inactive. Activate it first.'; end if;

    if v_prev_officer is not null and v_prev_officer <> p_officer_id then
      perform _detach_officer(v_prev_officer);
    end if;
    perform _detach_officer(p_officer_id);

    update collection_points set assigned_officer_id = p_officer_id where id = p_location_id;
    update officers set assigned_collection_point_id = p_location_id where id = p_officer_id;
  else
    select status, assigned_officer_id into v_loc_status, v_prev_officer
      from distribution_centers where id = p_location_id for update;
    if not found then raise exception 'Distribution center not found.'; end if;
    if v_loc_status <> 'active' then raise exception 'That distribution center is inactive. Activate it first.'; end if;

    if v_prev_officer is not null and v_prev_officer <> p_officer_id then
      perform _detach_officer(v_prev_officer);
    end if;
    perform _detach_officer(p_officer_id);

    update distribution_centers set assigned_officer_id = p_officer_id where id = p_location_id;
    update officers set assigned_distribution_center_id = p_location_id where id = p_officer_id;
  end if;
end;
$$;

revoke execute on function public._attach_officer(uuid, uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- approve_officer: pending -> approved, and assign to a location that
-- matches the officer's role (CP officer -> collection point,
-- DC officer -> distribution center). The location must be free.
-- ---------------------------------------------------------------------
create or replace function public.approve_officer(p_officer_id uuid, p_location_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_status officer_status;
  v_role officer_role;
  v_taken uuid;
begin
  if not is_admin() then
    raise exception 'Only Collector Office admins can approve officers.' using errcode = '42501';
  end if;

  select status, role into v_status, v_role from officers where id = p_officer_id for update;
  if not found then raise exception 'Officer not found.'; end if;
  if v_status <> 'pending' then raise exception 'This request is no longer pending (current status: %).', v_status; end if;
  if p_location_id is null then raise exception 'Choose a location to assign.'; end if;

  if v_role = 'collection_point' then
    select assigned_officer_id into v_taken from collection_points where id = p_location_id;
    if not found then raise exception 'This officer registered for a collection point. Choose a collection point.'; end if;
  else
    select assigned_officer_id into v_taken from distribution_centers where id = p_location_id;
    if not found then raise exception 'This officer registered for a distribution center. Choose a distribution center.'; end if;
  end if;
  if v_taken is not null then
    raise exception 'That location already has an officer. Pick another, or reassign it from the location page.';
  end if;

  update officers
     set status = 'approved',
         approved_by = auth.uid(),
         approved_at = now(),
         rejected_reason = null
   where id = p_officer_id;

  perform _attach_officer(p_officer_id, p_location_id);
end;
$$;

-- ---------------------------------------------------------------------
-- reject_officer: pending -> rejected, reason required.
-- ---------------------------------------------------------------------
create or replace function public.reject_officer(p_officer_id uuid, p_reason text)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_status officer_status;
begin
  if not is_admin() then
    raise exception 'Only Collector Office admins can reject officers.' using errcode = '42501';
  end if;
  if coalesce(trim(p_reason), '') = '' then raise exception 'A rejection reason is required.'; end if;

  select status into v_status from officers where id = p_officer_id for update;
  if not found then raise exception 'Officer not found.'; end if;
  if v_status <> 'pending' then raise exception 'This request is no longer pending (current status: %).', v_status; end if;

  update officers set status = 'rejected', rejected_reason = trim(p_reason) where id = p_officer_id;
end;
$$;

-- ---------------------------------------------------------------------
-- remove_officer: approved -> rejected (mapping: "Remove sets status
-- back to 'rejected' and clears the assigned location"). Clearing the
-- location's assigned_officer_id is what actually revokes data access.
-- ---------------------------------------------------------------------
create or replace function public.remove_officer(p_officer_id uuid, p_reason text)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_status officer_status;
begin
  if not is_admin() then
    raise exception 'Only Collector Office admins can remove officers.' using errcode = '42501';
  end if;
  if coalesce(trim(p_reason), '') = '' then raise exception 'A reason for removal is required.'; end if;

  select status into v_status from officers where id = p_officer_id for update;
  if not found then raise exception 'Officer not found.'; end if;
  if v_status <> 'approved' then raise exception 'Only approved officers can be removed.'; end if;

  perform _detach_officer(p_officer_id);
  update officers
     set status = 'rejected',
         rejected_reason = 'Removed: ' || trim(p_reason)
   where id = p_officer_id;
end;
$$;

-- ---------------------------------------------------------------------
-- assign_officer: assign / reassign an APPROVED officer to a location
-- (used from Nodal Officers and from the Collection Point / Distribution
-- Center pages). p_location_type is 'collection_point' or
-- 'distribution_center' and must match the officer's role.
-- ---------------------------------------------------------------------
create or replace function public.assign_officer(p_location_type text, p_location_id uuid, p_officer_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_status officer_status;
  v_role officer_role;
begin
  if not is_admin() then
    raise exception 'Only Collector Office admins can assign officers.' using errcode = '42501';
  end if;
  if p_location_type not in ('collection_point', 'distribution_center') then
    raise exception 'Unknown location type %.', p_location_type;
  end if;

  select status, role into v_status, v_role from officers where id = p_officer_id for update;
  if not found then raise exception 'Officer not found.'; end if;
  if v_status <> 'approved' then raise exception 'Only approved officers can be assigned.'; end if;
  if (p_location_type = 'collection_point') <> (v_role = 'collection_point') then
    raise exception 'This officer registered as a % officer and cannot be assigned to a %.',
      replace(v_role::text, '_', ' '), replace(p_location_type, '_', ' ');
  end if;

  perform _attach_officer(p_officer_id, p_location_id);
end;
$$;

-- ---------------------------------------------------------------------
-- unassign_location: remove whichever officer holds a location. The
-- officer stays approved but has no location (and so no data access).
-- ---------------------------------------------------------------------
create or replace function public.unassign_location(p_location_type text, p_location_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_officer uuid;
begin
  if not is_admin() then
    raise exception 'Only Collector Office admins can change assignments.' using errcode = '42501';
  end if;

  if p_location_type = 'collection_point' then
    select assigned_officer_id into v_officer from collection_points where id = p_location_id for update;
  elsif p_location_type = 'distribution_center' then
    select assigned_officer_id into v_officer from distribution_centers where id = p_location_id for update;
  else
    raise exception 'Unknown location type %.', p_location_type;
  end if;

  if v_officer is not null then perform _detach_officer(v_officer); end if;
end;
$$;

-- Callable by signed-in users only; each function re-checks is_admin().
revoke execute on function public.approve_officer(uuid, uuid)            from public, anon;
revoke execute on function public.reject_officer(uuid, text)             from public, anon;
revoke execute on function public.remove_officer(uuid, text)             from public, anon;
revoke execute on function public.assign_officer(text, uuid, uuid)       from public, anon;
revoke execute on function public.unassign_location(text, uuid)          from public, anon;
grant  execute on function public.approve_officer(uuid, uuid)            to authenticated;
grant  execute on function public.reject_officer(uuid, text)             to authenticated;
grant  execute on function public.remove_officer(uuid, text)             to authenticated;
grant  execute on function public.assign_officer(text, uuid, uuid)       to authenticated;
grant  execute on function public.unassign_location(text, uuid)          to authenticated;

-- Speeds up the Pending / Approved / Rejected tabs.
create index if not exists idx_officers_status on public.officers(status);

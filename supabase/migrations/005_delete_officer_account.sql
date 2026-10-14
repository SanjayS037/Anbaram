-- =====================================================================
-- ANBARAM — 005 Officer deletes their own account
-- Run once in the Supabase SQL Editor (role: postgres) AFTER 004.
--
-- Used by the public "Delete account" page (/delete-account) that
-- Google Play asks for. The officer signs in with their own email and
-- password on that page; the `delete-account` Edge Function then calls
-- this function for THAT signed-in person only.
--
-- Why not just delete the row: shipments, flags and stock rows point at
-- the officer (shipments.logged_by_officer_id is required), so a plain
-- delete fails — and removing those rows would wipe the district's
-- donation records. So:
--   * officer with NO records (e.g. still pending) -> profile deleted fully
--   * officer WITH records -> personal details erased (name, phone,
--     email, organisation), removed from their place, marked rejected.
--     The records stay and show "Deleted account".
-- In both cases the Edge Function then deletes the login itself.
--
-- Collector Office (admin) accounts are never deleted here.
-- No tables or columns are added.
-- =====================================================================

create or replace function public.delete_officer_account(p_user_id uuid)
returns text
language plpgsql security definer set search_path = public
as $$
declare
  v_has_records boolean;
begin
  if exists (select 1 from admins where id = p_user_id) then
    raise exception 'This is a Collector Office account, so it cannot be deleted here. Please contact the Collectorate.'
      using errcode = '42501';
  end if;

  perform 1 from officers where id = p_user_id for update;
  if not found then
    return 'no_profile'; -- only a login exists (or the profile was already deleted)
  end if;

  -- Free their collection point / distribution center (both sides of the link).
  perform _detach_officer(p_user_id);

  v_has_records :=
       exists (select 1 from shipments where logged_by_officer_id = p_user_id or received_by_officer_id = p_user_id)
    or exists (select 1 from flags where raised_by_officer_id = p_user_id)
    or exists (select 1 from inventory_status where updated_by_officer_id = p_user_id);

  if v_has_records then
    update officers
       set full_name         = 'Deleted account',
           organization_name = '',
           phone             = '',
           email             = '',
           status            = 'rejected',
           rejected_reason   = 'Account deleted by the officer on '
                               || to_char(now() at time zone 'Asia/Kolkata', 'DD Mon YYYY')
     where id = p_user_id;
    return 'anonymized';
  end if;

  delete from officers where id = p_user_id;
  return 'deleted';
end;
$$;

-- Only the Edge Function (service role, on the server) may call this.
-- Officers cannot call it from the app, and nobody can call it for another person.
revoke execute on function public.delete_officer_account(uuid) from public, anon, authenticated;
grant  execute on function public.delete_officer_account(uuid) to service_role;

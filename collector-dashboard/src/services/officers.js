import { supabase } from '../lib/supabase'
import { unwrap, unwrapCount } from '../lib/db'

const OFFICER_SELECT = `
  *,
  collection_point:collection_points!officers_assigned_collection_point_id_fkey(id, name, short_code),
  distribution_center:distribution_centers!officers_assigned_distribution_center_id_fkey(id, name, short_code),
  approver:admins!officers_approved_by_fkey(full_name)
`

/** PostgREST `or` filters use , ( ) " as syntax — strip them (and LIKE wildcards) from user input. */
export const sanitizeSearch = (term) =>
  term
    .replace(/[,()"%*\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

export async function listOfficers({ status, role = 'all', search, page, pageSize, sort }) {
  let query = supabase
    .from('officers')
    .select(OFFICER_SELECT, { count: 'exact' })
    .eq('status', status)
    .order(sort.column, { ascending: sort.ascending })
    .range((page - 1) * pageSize, page * pageSize - 1)

  if (role !== 'all') query = query.eq('role', role)
  const term = search ? sanitizeSearch(search) : ''
  if (term) {
    query = query.or(
      ['full_name', 'email', 'phone', 'organization_name'].map((col) => `${col}.ilike."*${term}*"`).join(','),
    )
  }

  const result = await query
  return { rows: unwrap(result), total: result.count ?? 0 }
}

export async function countOfficersByStatus() {
  const statuses = ['pending', 'approved', 'rejected']
  const counts = await Promise.all(
    statuses.map(async (status) =>
      unwrapCount(await supabase.from('officers').select('id', { count: 'exact', head: true }).eq('status', status)),
    ),
  )
  return { pending: counts[0], approved: counts[1], rejected: counts[2] }
}

export async function getOfficer(id) {
  return unwrap(await supabase.from('officers').select(OFFICER_SELECT).eq('id', id).single())
}

/** Which kind of location an officer can hold, from their registered role. */
export const locationTypeForRole = (role) => (role === 'collection_point' ? 'collection_point' : 'distribution_center')

/** Active locations of the right kind, with who (if anyone) currently holds each. */
export async function listAssignableLocations(type) {
  if (type === 'collection_point') {
    const rows = unwrap(
      await supabase
        .from('collection_points')
        .select(
          'id, name, short_code, zone, address, officer:officers!collection_points_assigned_officer_id_fkey(id, full_name)',
        )
        .eq('status', 'active')
        .order('name'),
    )
    return rows
  }
  const rows = unwrap(
    await supabase
      .from('distribution_centers')
      .select(
        'id, name, short_code, address, officer:officers!distribution_centers_assigned_officer_id_fkey(id, full_name)',
      )
      .eq('status', 'active')
      .order('name'),
  )
  return rows.map((r) => ({ ...r, zone: null }))
}

// --- Mutations (all go through the SECURITY DEFINER functions in migration 002) ---

export async function approveOfficer(officerId, locationId) {
  unwrap(await supabase.rpc('approve_officer', { p_officer_id: officerId, p_location_id: locationId }))
}

export async function rejectOfficer(officerId, reason) {
  unwrap(await supabase.rpc('reject_officer', { p_officer_id: officerId, p_reason: reason }))
}

export async function removeOfficer(officerId, reason) {
  unwrap(await supabase.rpc('remove_officer', { p_officer_id: officerId, p_reason: reason }))
}

export async function assignOfficer(type, locationId, officerId) {
  unwrap(
    await supabase.rpc('assign_officer', { p_location_type: type, p_location_id: locationId, p_officer_id: officerId }),
  )
}

export async function unassignLocation(type, locationId) {
  unwrap(await supabase.rpc('unassign_location', { p_location_type: type, p_location_id: locationId }))
}

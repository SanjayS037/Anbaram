import { supabase } from '../lib/supabase'
import { fetchAllPages, unwrap } from '../lib/db'
// ---------------------------------------------------------------------------
// Collection points
// ---------------------------------------------------------------------------

const CP_SELECT = `
  *,
  officer:officers!collection_points_assigned_officer_id_fkey(id, full_name, phone, email),
  default_dc:distribution_centers!collection_points_default_distribution_center_id_fkey(id, name, short_code),
  requests:collection_requests!collection_requests_collection_point_id_fkey(
    id, status, requested_categories, note, created_at, started_at,
    distribution_center:distribution_centers!collection_requests_distribution_center_id_fkey(id, name)
  )
`
// Embedded-resource filter: only open requests are embedded (points without one are still returned).
const OPEN_REQUESTS = ['pending', 'in_progress']

export async function listCollectionPoints() {
  return await fetchAllPages((from, to) =>
    supabase
      .from('collection_points')
      .select(CP_SELECT)
      .in('requests.status', OPEN_REQUESTS)
      .order('name')
      .range(from, to),
  )
}

export async function getCollectionPoint(id) {
  return unwrap(
    await supabase
      .from('collection_points')
      .select(CP_SELECT)
      .in('requests.status', OPEN_REQUESTS)
      .eq('id', id)
      .single(),
  )
}

export async function createCollectionPoint(input) {
  return unwrap(await supabase.from('collection_points').insert(input).select('id').single())
}

export async function updateCollectionPoint(id, input) {
  unwrap(await supabase.from('collection_points').update(input).eq('id', id).select('id').single())
}

// ---------------------------------------------------------------------------
// Distribution centers
// ---------------------------------------------------------------------------

const DC_SELECT = `*, officer:officers!distribution_centers_assigned_officer_id_fkey(id, full_name, phone, email)`

export async function listDistributionCenters() {
  return await fetchAllPages((from, to) =>
    supabase.from('distribution_centers').select(DC_SELECT).order('name').range(from, to),
  )
}

export async function getDistributionCenter(id) {
  return unwrap(await supabase.from('distribution_centers').select(DC_SELECT).eq('id', id).single())
}

export async function createDistributionCenter(input) {
  return unwrap(await supabase.from('distribution_centers').insert(input).select('id').single())
}

export async function updateDistributionCenter(id, input) {
  unwrap(await supabase.from('distribution_centers').update(input).eq('id', id).select('id').single())
}

/**
 * Delete a place for good (migration 004). The database refuses when the place
 * has any shipment — those must be closed instead, so records are kept.
 */
export async function deleteLocation(type, id) {
  unwrap(await supabase.rpc('delete_location', { p_location_type: type, p_location_id: id }))
}

// ---------------------------------------------------------------------------
// Totals (existing reporting views) and assignable officers
// ---------------------------------------------------------------------------

export async function getLocationTotals(type, id) {
  const result =
    type === 'collection_point'
      ? await supabase
          .from('v_totals_by_collection_point')
          .select('total_kg, total_shipments')
          .eq('collection_point_id', id)
          .maybeSingle()
      : await supabase
          .from('v_totals_by_distribution_center')
          .select('total_kg, total_shipments')
          .eq('distribution_center_id', id)
          .maybeSingle()
  const row = unwrap(result)
  return { total_kg: Number(row?.total_kg ?? 0), total_shipments: Number(row?.total_shipments ?? 0) }
}

/** Approved officers of a role, with where each one is currently assigned (if anywhere). */
export async function listAssignableOfficers(role) {
  return unwrap(
    await supabase
      .from('officers')
      .select(
        `id, full_name, phone, organization_name,
         collection_point:collection_points!officers_assigned_collection_point_id_fkey(id, name, short_code),
         distribution_center:distribution_centers!officers_assigned_distribution_center_id_fkey(id, name, short_code)`,
      )
      .eq('status', 'approved')
      .eq('role', role)
      .order('full_name'),
  )
}

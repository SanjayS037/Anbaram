import { addDays, parseISO } from 'date-fns'
import { supabase } from '../lib/supabase'
import { unwrap, unwrapCount } from '../lib/db'
const LIST_SELECT = `
  id, batch_code, status, total_kg, clothes_kg, blankets_kg, stationery_kg, books_kg, other_kg,
  dispatched_at, received_at, condition, delivered_by_name, vehicle_number,
  collection_point:collection_points!shipments_collection_point_id_fkey(id, name, short_code),
  distribution_center:distribution_centers!shipments_distribution_center_id_fkey(id, name, short_code)
`

/** Batch codes are generated as e.g. "CP-014-B07"; strip anything that isn't part of one. */
const sanitizeBatchCode = (term) => term.replace(/[^A-Za-z0-9-]/g, '').trim()

export async function listShipments({ filters, page, pageSize, sort }) {
  let query = supabase
    .from('shipments')
    .select(LIST_SELECT, { count: 'exact' })
    .order(sort.column, { ascending: sort.ascending, nullsFirst: false })
    .order('id') // stable paging when the sort column has ties
    .range((page - 1) * pageSize, page * pageSize - 1)

  const code = filters.search ? sanitizeBatchCode(filters.search) : ''
  if (code) query = query.ilike('batch_code', `%${code}%`)
  // Category filter = shipments that contain that category (weight > 0).
  // Equivalent to v_shipment_categories where category = X and weight_kg > 0,
  // but keeps one row per shipment for the explorer.
  if (filters.category && filters.category !== 'all') query = query.gt(`${filters.category}_kg`, 0)
  if (filters.collectionPointId) query = query.eq('collection_point_id', filters.collectionPointId)
  if (filters.distributionCenterId) query = query.eq('distribution_center_id', filters.distributionCenterId)
  if (filters.status && filters.status !== 'all') query = query.eq('status', filters.status)
  if (filters.from) query = query.gte('dispatched_at', parseISO(filters.from).toISOString())
  if (filters.to) query = query.lt('dispatched_at', addDays(parseISO(filters.to), 1).toISOString())

  const result = await query
  return { rows: unwrap(result), total: result.count ?? 0 }
}

export async function getShipment(id) {
  const result = await supabase
    .from('shipments')
    .select(
      `*,
       collection_point:collection_points!shipments_collection_point_id_fkey(id, name, short_code, address),
       distribution_center:distribution_centers!shipments_distribution_center_id_fkey(id, name, short_code, address),
       logged_by:officers!shipments_logged_by_officer_id_fkey(id, full_name, phone),
       received_by:officers!shipments_received_by_officer_id_fkey(id, full_name, phone),
       flags:flags!flags_shipment_id_fkey(
         *,
         raised_by:officers!flags_raised_by_officer_id_fkey(full_name),
         resolver:admins!flags_resolved_by_admin_id_fkey(full_name)
       )`,
    )
    .eq('id', id)
    .single()
  return unwrap(result)
}

/** All collection points and distribution centers (including inactive) for filter dropdowns. */
export async function listLocationOptions() {
  const [cps, dcs] = await Promise.all([
    supabase.from('collection_points').select('id, name, short_code').order('name'),
    supabase.from('distribution_centers').select('id, name, short_code').order('name'),
  ])
  return { collectionPoints: unwrap(cps), distributionCenters: unwrap(dcs) }
}

export async function countShipments(filters) {
  let query = supabase.from('shipments').select('id', { count: 'exact', head: true })
  if (filters.distributionCenterId) query = query.eq('distribution_center_id', filters.distributionCenterId)
  if (filters.collectionPointId) query = query.eq('collection_point_id', filters.collectionPointId)
  if (filters.status) query = query.eq('status', filters.status)
  return unwrapCount(await query)
}

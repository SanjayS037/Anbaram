import { supabase } from '../lib/supabase'
import { fetchAllPages, unwrap } from '../lib/db'

export const noFilters = (f) =>
  f.category === 'all' && !f.collectionPointId && !f.distributionCenterId && f.status === 'all'

/**
 * Long-format rows (one per shipment × category) from v_shipment_categories,
 * the base the schema intends every report to use. Paged past the 1,000-row cap.
 */
export async function fetchCategoryRows({ from, to, filters }) {
  return fetchAllPages((start, end) => {
    let query = supabase
      .from('v_shipment_categories')
      .select('shipment_id, collection_point_id, distribution_center_id, dispatched_at, status, category, weight_kg')
      .order('dispatched_at')
      .order('shipment_id')
      .order('category')
      .range(start, end)
    if (from) query = query.gte('dispatched_at', from.toISOString())
    if (to) query = query.lt('dispatched_at', to.toISOString())
    if (filters.category !== 'all') query = query.eq('category', filters.category)
    if (filters.collectionPointId) query = query.eq('collection_point_id', filters.collectionPointId)
    if (filters.distributionCenterId) query = query.eq('distribution_center_id', filters.distributionCenterId)
    if (filters.status !== 'all') query = query.eq('status', filters.status)
    return query
  })
}

/** The all-time aggregate views — used for the unfiltered "Overall" report. */
export async function fetchOverallViews() {
  const [byCategory, byCp, byDc] = await Promise.all([
    supabase.from('v_totals_by_category').select('category, total_kg'),
    supabase
      .from('v_totals_by_collection_point')
      .select('collection_point_id, name, short_code, total_kg, total_shipments'),
    supabase
      .from('v_totals_by_distribution_center')
      .select('distribution_center_id, name, short_code, total_kg, total_shipments'),
  ])
  return { byCategory: unwrap(byCategory), byCp: unwrap(byCp), byDc: unwrap(byDc) }
}

/** Shipment-level rows for the "Shipments" sheet of the Excel export. */
export async function fetchShipmentsForExport({ from, to, filters }) {
  return fetchAllPages((start, end) => {
    let query = supabase
      .from('shipments')
      .select(
        `batch_code, dispatched_at, received_at, status, condition,
         clothes_kg, blankets_kg, stationery_kg, books_kg, other_kg, other_label, total_kg,
         delivered_by_name, vehicle_number,
         collection_point:collection_points!shipments_collection_point_id_fkey(name, short_code),
         distribution_center:distribution_centers!shipments_distribution_center_id_fkey(name, short_code)`,
      )
      .order('dispatched_at')
      .order('id')
      .range(start, end)
    if (from) query = query.gte('dispatched_at', from.toISOString())
    if (to) query = query.lt('dispatched_at', to.toISOString())
    if (filters.category !== 'all') query = query.gt(`${filters.category}_kg`, 0)
    if (filters.collectionPointId) query = query.eq('collection_point_id', filters.collectionPointId)
    if (filters.distributionCenterId) query = query.eq('distribution_center_id', filters.distributionCenterId)
    if (filters.status !== 'all') query = query.eq('status', filters.status)
    return query
  })
}

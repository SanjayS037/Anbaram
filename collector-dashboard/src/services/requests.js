import { supabase } from '../lib/supabase'
import { unwrap, unwrapCount } from '../lib/db'
import { CATEGORIES } from '../utils/categories'
export const OPEN_STATUSES = ['pending', 'in_progress']

// ---------------------------------------------------------------------------
// Incoming requests — a Distribution Center officer says their center is out
// of stock from their app (any inventory_status row with is_out_of_stock =
// true). The request is per CENTER, not per item: one center = one request,
// and the collection point assigned to it collects every item.
// ---------------------------------------------------------------------------

/** Every item key — a center request always asks for all of them. */
export const ALL_CATEGORY_KEYS = CATEGORIES.map((c) => c.key)

/**
 * Turn out-of-stock rows into one request per active center, newest first.
 * A center is left out when an open collection request already covers it.
 */
export function groupCenterRequests(alerts, openRequests) {
  const covered = new Set((openRequests ?? []).map((r) => r.distribution_center_id))
  const byCenter = new Map()
  for (const a of alerts ?? []) {
    const center = a.distribution_center
    if (!center || center.status !== 'active' || covered.has(center.id)) continue
    const current = byCenter.get(center.id)
    // Keep the most recent update so "sent by" / time show the latest officer action.
    if (!current || a.updated_at > current.updated_at)
      byCenter.set(center.id, { id: center.id, center, requested_by: a.requested_by, updated_at: a.updated_at })
  }
  return [...byCenter.values()].sort((a, b) => b.updated_at.localeCompare(a.updated_at))
}

export async function listStockAlerts() {
  return unwrap(
    await supabase
      .from('inventory_status')
      .select(
        `id, category, updated_at,
         distribution_center:distribution_centers!inventory_status_distribution_center_id_fkey(id, name, short_code, status),
         requested_by:officers!inventory_status_updated_by_officer_id_fkey(full_name, phone)`,
      )
      .eq('is_out_of_stock', true)
      .order('updated_at', { ascending: false }), // newest request on top
  )
}

/** Stock state for one center: every category that has a row (missing row = never marked). */
export async function getCenterStock(distributionCenterId) {
  return unwrap(
    await supabase
      .from('inventory_status')
      .select('category, is_out_of_stock, updated_at')
      .eq('distribution_center_id', distributionCenterId),
  )
}

// ---------------------------------------------------------------------------
// Collection requests
// ---------------------------------------------------------------------------

const REQUEST_SELECT = `
  *,
  collection_point:collection_points!collection_requests_collection_point_id_fkey(
    id, name, short_code,
    officer:officers!collection_points_assigned_officer_id_fkey(id, full_name, phone)
  ),
  distribution_center:distribution_centers!collection_requests_distribution_center_id_fkey(id, name, short_code),
  requested_by:admins!collection_requests_requested_by_admin_id_fkey(full_name),
  shipments:shipments!shipments_collection_request_id_fkey(id, batch_code, status, total_kg, dispatched_at)
`

export async function listRequests({ tab, page, pageSize }) {
  let query = supabase
    .from('collection_requests')
    .select(REQUEST_SELECT, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1)
  query = tab === 'open' ? query.in('status', OPEN_STATUSES) : query.in('status', ['completed', 'cancelled'])
  const result = await query
  return { rows: unwrap(result), total: result.count ?? 0 }
}

/** Open requests (lightweight) — used to show which stock alerts are already being handled. */
export async function listOpenRequestSummaries() {
  return unwrap(
    await supabase
      .from('collection_requests')
      .select(
        `id, status, distribution_center_id, collection_point_id, requested_categories, created_at,
         collection_point:collection_points!collection_requests_collection_point_id_fkey(id, name, short_code)`,
      )
      .in('status', OPEN_STATUSES)
      .order('created_at', { ascending: false }),
  )
}

export async function countRequestsByTab() {
  const [open, history] = await Promise.all([
    supabase.from('collection_requests').select('id', { count: 'exact', head: true }).in('status', OPEN_STATUSES),
    supabase
      .from('collection_requests')
      .select('id', { count: 'exact', head: true })
      .in('status', ['completed', 'cancelled']),
  ])
  return { open: unwrapCount(open), history: unwrapCount(history) }
}

export async function createRequest(input) {
  unwrap(
    await supabase
      .from('collection_requests')
      .insert({
        collection_point_id: input.collectionPointId,
        distribution_center_id: input.distributionCenterId,
        requested_by_admin_id: input.adminId,
        requested_categories: input.categories,
        note: input.note,
      })
      .select('id')
      .single(),
  )
}

/** Cancel only if still open, so a request completed in the meantime is never overwritten. */
export async function cancelRequest(id) {
  const rows = unwrap(
    await supabase
      .from('collection_requests')
      .update({ status: 'cancelled' })
      .eq('id', id)
      .in('status', OPEN_STATUSES)
      .select('id'),
  )
  if (!rows.length) throw new Error('This request is already finished or removed. Please reload the page.')
}

// ---------------------------------------------------------------------------
// Full inventory (every center × item) for the Inventory tab
// ---------------------------------------------------------------------------

export async function listInventory() {
  return unwrap(
    await supabase.from('inventory_status').select(
      `id, distribution_center_id, category, is_out_of_stock, updated_at,
         updated_by:officers!inventory_status_updated_by_officer_id_fkey(full_name)`,
    ),
  )
}

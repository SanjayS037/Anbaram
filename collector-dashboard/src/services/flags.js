import { supabase } from '../lib/supabase'
import { unwrap, unwrapCount } from '../lib/db'
// !inner lets the batch-code search filter on the embedded shipment.
// Every flag has a shipment (NOT NULL FK), so no rows are lost by it.
const FLAG_SELECT = `
  *,
  shipment:shipments!flags_shipment_id_fkey!inner(
    id, batch_code,
    collection_point:collection_points!shipments_collection_point_id_fkey(id, name, short_code),
    distribution_center:distribution_centers!shipments_distribution_center_id_fkey(id, name, short_code)
  ),
  raised_by:officers!flags_raised_by_officer_id_fkey(id, full_name),
  resolver:admins!flags_resolved_by_admin_id_fkey(full_name)
`

export async function listFlags({ status, search, issueType, page, pageSize }) {
  let query = supabase
    .from('flags')
    .select(FLAG_SELECT, { count: 'exact' })
    .eq('status', status)
    .order(status === 'open' ? 'created_at' : 'resolved_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1)

  const code = search?.replace(/[^A-Za-z0-9-]/g, '').trim()
  if (code) query = query.ilike('shipment.batch_code', `%${code}%`)
  if (issueType && issueType !== 'all') query = query.eq('issue_type', issueType)

  const result = await query
  return { rows: unwrap(result), total: result.count ?? 0 }
}

export async function countFlagsByStatus() {
  const [open, resolved] = await Promise.all(
    ['open', 'resolved'].map(async (status) =>
      unwrapCount(await supabase.from('flags').select('id', { count: 'exact', head: true }).eq('status', status)),
    ),
  )
  return { open, resolved }
}

/**
 * Resolve an open flag. The .eq('status', 'open') guard means two admins
 * resolving at once can't overwrite each other's note.
 */
export async function resolveFlag(flagId, adminId, resolutionNote) {
  const rows = unwrap(
    await supabase
      .from('flags')
      .update({
        status: 'resolved',
        resolved_by_admin_id: adminId,
        resolution_note: resolutionNote,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', flagId)
      .eq('status', 'open')
      .select('id'),
  )
  if (!rows.length) throw new Error('This flag was already marked as done. Please reload the page.')
}

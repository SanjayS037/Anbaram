import { format, startOfMonth, subMonths } from 'date-fns'
import { supabase } from '../lib/supabase'
import { fetchAllPages, unwrap, unwrapCount } from '../lib/db'

const TREND_MONTHS = 6
const RECENT_LIMIT = 8
const OPEN_FLAGS_LIMIT = 5

// shipments has two FKs to officers, and collection_points/officers point at
// each other, so embeds name the FK explicitly to avoid ambiguity errors.
const SHIPMENT_SUMMARY = `
  id, batch_code, status, total_kg, dispatched_at, received_at, condition,
  collection_point:collection_points!shipments_collection_point_id_fkey(name),
  distribution_center:distribution_centers!shipments_distribution_center_id_fkey(name)
`

const toOverviewShipment = (row) => ({
  id: row.id,
  batch_code: row.batch_code,
  status: row.status,
  total_kg: Number(row.total_kg),
  dispatched_at: row.dispatched_at,
  received_at: row.received_at,
  condition: row.condition,
  collection_point_name: row.collection_point?.name ?? 'Unknown point',
  distribution_center_name: row.distribution_center?.name ?? 'Unknown center',
})

async function fetchTotalsByCategory() {
  const rows = unwrap(await supabase.from('v_totals_by_category').select('category, total_kg'))
  return rows.map((r) => ({ category: r.category, total_kg: Number(r.total_kg ?? 0) }))
}

async function countActive(table) {
  return unwrapCount(await supabase.from(table).select('id', { count: 'exact', head: true }).eq('status', 'active'))
}

async function fetchOpenFlags() {
  const result = await supabase
    .from('flags')
    .select(
      `id, shipment_id, issue_type, note, created_at,
       shipment:shipments!flags_shipment_id_fkey(
         batch_code,
         collection_point:collection_points!shipments_collection_point_id_fkey(name),
         distribution_center:distribution_centers!shipments_distribution_center_id_fkey(name)
       )`,
      { count: 'exact' },
    )
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .limit(OPEN_FLAGS_LIMIT)

  const rows = unwrap(result)
  const flags = rows.map((f) => ({
    id: f.id,
    shipment_id: f.shipment_id,
    batch_code: f.shipment?.batch_code ?? null,
    issue_type: f.issue_type,
    note: f.note,
    created_at: f.created_at,
    collection_point_name: f.shipment?.collection_point?.name ?? 'Unknown point',
    distribution_center_name: f.shipment?.distribution_center?.name ?? 'Unknown center',
  }))
  return { flags, count: result.count ?? flags.length }
}

/** Latest dispatches and latest receipts, merged into one feed by event time. */
async function fetchRecentShipments() {
  const [dispatched, received] = await Promise.all([
    supabase
      .from('shipments')
      .select(SHIPMENT_SUMMARY)
      .order('dispatched_at', { ascending: false })
      .limit(RECENT_LIMIT),
    supabase
      .from('shipments')
      .select(SHIPMENT_SUMMARY)
      .not('received_at', 'is', null)
      .order('received_at', { ascending: false })
      .limit(RECENT_LIMIT),
  ])
  const byId = new Map()
  for (const row of [...unwrap(dispatched), ...unwrap(received)]) {
    byId.set(row.id, toOverviewShipment(row))
  }
  const eventTime = (s) => new Date(s.received_at ?? s.dispatched_at).getTime()
  return [...byId.values()].sort((a, b) => eventTime(b) - eventTime(a)).slice(0, RECENT_LIMIT)
}

async function fetchCompliance() {
  const rows = unwrap(
    await supabase
      .from('collection_points')
      .select(
        `id, name, short_code, last_collected_at, cycle_frequency_days,
         officer:officers!collection_points_assigned_officer_id_fkey(full_name)`,
      )
      .eq('status', 'active'),
  )
  return rows.map((p) => ({
    id: p.id,
    name: p.name,
    short_code: p.short_code,
    officer_name: p.officer?.full_name ?? null,
    last_collected_at: p.last_collected_at,
    cycle_frequency_days: p.cycle_frequency_days,
  }))
}

async function fetchMonthlyTrend() {
  const firstMonth = startOfMonth(subMonths(new Date(), TREND_MONTHS - 1))
  const rows = await fetchAllPages((from, to) =>
    supabase
      .from('shipments')
      .select('dispatched_at, total_kg')
      .gte('dispatched_at', firstMonth.toISOString())
      .order('dispatched_at')
      .range(from, to),
  )

  const totals = new Map()
  for (let i = 0; i < TREND_MONTHS; i++) totals.set(format(subMonths(new Date(), TREND_MONTHS - 1 - i), 'yyyy-MM'), 0)
  for (const row of rows) {
    const month = format(new Date(row.dispatched_at), 'yyyy-MM')
    if (totals.has(month)) totals.set(month, totals.get(month) + Number(row.total_kg))
  }
  return [...totals].map(([month, total_kg]) => ({ month, total_kg }))
}

export async function fetchOverview() {
  const [
    totalsByCategory,
    activeCollectionPoints,
    activeDistributionCenters,
    openFlags,
    recentShipments,
    compliance,
    monthlyTrend,
  ] = await Promise.all([
    fetchTotalsByCategory(),
    countActive('collection_points'),
    countActive('distribution_centers'),
    fetchOpenFlags(),
    fetchRecentShipments(),
    fetchCompliance(),
    fetchMonthlyTrend(),
  ])

  return {
    totalsByCategory,
    activeCollectionPoints,
    activeDistributionCenters,
    openFlagsCount: openFlags.count,
    openFlags: openFlags.flags,
    recentShipments,
    compliance,
    monthlyTrend,
  }
}

/** Counts for the sidebar badges. */
export async function fetchNavCounts() {
  const [openFlags, pendingOfficers, stockAlerts] = await Promise.all([
    supabase.from('flags').select('id', { count: 'exact', head: true }).eq('status', 'open'),
    supabase.from('officers').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    countUncoveredStockAlerts(),
  ])
  return { openFlags: unwrapCount(openFlags), pendingOfficers: unwrapCount(pendingOfficers), stockAlerts }
}

/** Active centers that are out of stock and have no open collection request yet (one request per center). */
async function countUncoveredStockAlerts() {
  const [alerts, open] = await Promise.all([
    supabase
      .from('inventory_status')
      .select(
        'distribution_center_id, distribution_center:distribution_centers!inventory_status_distribution_center_id_fkey(status)',
      )
      .eq('is_out_of_stock', true),
    supabase.from('collection_requests').select('distribution_center_id').in('status', ['pending', 'in_progress']),
  ])
  const covered = new Set(unwrap(open).map((r) => r.distribution_center_id))
  const waiting = new Set(
    unwrap(alerts)
      .filter((a) => a.distribution_center?.status === 'active' && !covered.has(a.distribution_center_id))
      .map((a) => a.distribution_center_id),
  )
  return waiting.size
}

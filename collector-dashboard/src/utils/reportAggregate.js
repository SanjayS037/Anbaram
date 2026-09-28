import { addMonths, differenceInCalendarMonths, startOfMonth } from 'date-fns'
import { CATEGORIES } from './categories'
import { bucketKey, bucketLabel, bucketsBetween } from './periods'

const byKgDesc = (a, b) => b.total_kg - a.total_kg

/**
 * Aggregates v_shipment_categories rows into the report. A shipment counts
 * toward "shipments" if it has any row in scope (with a category filter:
 * only if it actually contains that category).
 */
export function buildReport({ rows, range, filters, names, views, now = new Date() }) {
  const inPeriod = rows.filter((r) => {
    const t = new Date(r.dispatched_at)
    return (!range.start || t >= range.start) && (!range.end || t < range.end)
  })
  const counts = (r) => filters.category === 'all' || Number(r.weight_kg) > 0

  const shipmentIds = new Set()
  const receivedIds = new Set()
  const cat = new Map()
  const cp = new Map()
  const dc = new Map()

  for (const r of inPeriod) {
    const kg = Number(r.weight_kg)
    cat.set(r.category, (cat.get(r.category) ?? 0) + kg)
    for (const [map, id] of [
      [cp, r.collection_point_id],
      [dc, r.distribution_center_id],
    ]) {
      const entry = map.get(id) ?? { kg: 0, ids: new Set() }
      entry.kg += kg
      if (counts(r)) entry.ids.add(r.shipment_id)
      map.set(id, entry)
    }
    if (counts(r)) {
      shipmentIds.add(r.shipment_id)
      if (r.status === 'received') receivedIds.add(r.shipment_id)
    }
  }

  const nameOf = (list, id) => list.find((l) => l.id === id)
  const toTotals = (map, list) =>
    [...map].map(([id, v]) => ({
      id,
      name: nameOf(list, id)?.name ?? 'Unknown',
      short_code: nameOf(list, id)?.short_code ?? null,
      total_kg: v.kg,
      shipments: v.ids.size,
    }))

  // ---- trend ---------------------------------------------------------------
  const firstRow = rows[0] ? new Date(rows[0].dispatched_at) : now
  const trendStart = range.trendStart ?? startOfMonth(firstRow)
  const trendEnd = range.end ?? addMonths(startOfMonth(now), 1)
  const granularity =
    range.granularity ?? (differenceInCalendarMonths(trendEnd, trendStart) <= 36 ? 'month' : 'quarter')
  const selectedKey =
    range.start && range.granularity !== 'day' && range.trendStart && range.trendStart < range.start
      ? bucketKey(range.start, granularity)
      : null

  const empty = () => Object.fromEntries(CATEGORIES.map((c) => [c.key, 0]))
  const trendMap = new Map(
    bucketsBetween(trendStart, trendEnd, granularity).map((b) => [
      b.key,
      {
        key: b.key,
        label: bucketLabel(b.start, granularity),
        longLabel: bucketLabel(b.start, granularity, true),
        selected: b.key === selectedKey,
        total: 0,
        ...empty(),
      },
    ]),
  )
  for (const r of rows) {
    const point = trendMap.get(bucketKey(new Date(r.dispatched_at), granularity))
    if (!point) continue
    point[r.category] += Number(r.weight_kg)
    point.total += Number(r.weight_kg)
  }

  const base = {
    receivedShipments: receivedIds.size,
    trend: [...trendMap.values()],
    granularity,
  }

  // Unfiltered all-time report: take totals from the pre-built views.
  if (views) {
    const byCp = views.byCp.map((v) => ({
      id: v.collection_point_id,
      name: v.name,
      short_code: v.short_code,
      total_kg: Number(v.total_kg ?? 0),
      shipments: Number(v.total_shipments ?? 0),
    }))
    return {
      ...base,
      source: 'views',
      totalKg: views.byCategory.reduce((s, v) => s + Number(v.total_kg ?? 0), 0),
      shipments: byCp.reduce((s, v) => s + v.shipments, 0),
      byCategory: views.byCategory.map((v) => ({ category: v.category, total_kg: Number(v.total_kg ?? 0) })),
      byCollectionPoint: byCp.sort(byKgDesc),
      byDistributionCenter: views.byDc
        .map((v) => ({
          id: v.distribution_center_id,
          name: v.name,
          short_code: v.short_code,
          total_kg: Number(v.total_kg ?? 0),
          shipments: Number(v.total_shipments ?? 0),
        }))
        .sort(byKgDesc),
    }
  }

  return {
    ...base,
    source: 'rows',
    totalKg: [...cat.values()].reduce((s, v) => s + v, 0),
    shipments: shipmentIds.size,
    byCategory: [...cat].map(([category, total_kg]) => ({ category, total_kg })),
    byCollectionPoint: toTotals(cp, names.collectionPoints)
      .filter((t) => t.shipments > 0)
      .sort(byKgDesc),
    byDistributionCenter: toTotals(dc, names.distributionCenters)
      .filter((t) => t.shipments > 0)
      .sort(byKgDesc),
  }
}

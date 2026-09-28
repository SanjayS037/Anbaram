import { Card, CardBody, CardHeader } from '../../components/ui/Card'
import { ErrorState, Skeleton } from '../../components/ui/States'
import { useCenterStock, useOpenRequestSummaries } from '../../hooks/useRequests'
import { CATEGORIES } from '../../utils/categories'
import { cn } from '../../utils/cn'
import { formatRelative } from '../../utils/format'

/** Per-category stock state reported by the center's officer (inventory_status). Finished items arrive as requests on the Requests page. */
export function StockStatusCard({ centerId }) {
  const stock = useCenterStock(centerId)
  const open = useOpenRequestSummaries()

  const byCategory = new Map((stock.data ?? []).map((s) => [s.category, s]))
  const requested = new Map()
  for (const r of open.data ?? []) {
    if (r.distribution_center_id !== centerId) continue
    for (const c of r.requested_categories ?? []) requested.set(c, r.collection_point?.name ?? 'a collection point')
  }
  const waiting = CATEGORIES.map((c) => c.key).filter(
    (k) => byCategory.get(k)?.is_out_of_stock && !requested.has(k),
  ).length

  return (
    <Card>
      <CardHeader
        title="Stock"
        subtitle="Updated by this center's officer in the app"
        action={
          waiting > 0 && (
            <span className="text-xs font-semibold text-red-800">
              {waiting} waiting. Assign them on the Requests page.
            </span>
          )
        }
      />
      <CardBody>
        {stock.isError ? (
          <ErrorState error={stock.error} onRetry={() => void stock.refetch()} />
        ) : stock.isPending ? (
          <Skeleton className="h-16" />
        ) : (
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {CATEGORIES.map((c) => {
              const row = byCategory.get(c.key)
              const out = !!row?.is_out_of_stock
              return (
                <li
                  key={c.key}
                  className={cn(
                    'rounded-md border px-3 py-2.5',
                    out ? 'border-red-200 bg-red-50/70' : 'border-line bg-surface',
                  )}
                >
                  <p className="flex items-center gap-1.5 text-sm font-semibold">
                    <span className="size-2.5 rounded-full" style={{ background: c.color }} aria-hidden />
                    {c.label}
                  </p>
                  <p
                    className={cn(
                      'mt-0.5 text-xs font-semibold',
                      out ? 'text-red-800' : row ? 'text-emerald-800' : 'text-muted',
                    )}
                  >
                    {out ? 'Finished' : row ? 'Available' : 'No update'}
                  </p>
                  {row && <p className="text-[11px] text-muted">updated {formatRelative(row.updated_at)}</p>}
                  {requested.has(c.key) && (
                    <p className="mt-0.5 truncate text-[11px] font-semibold text-sky-800">
                      Assigned to {requested.get(c.key)}
                    </p>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </CardBody>
    </Card>
  )
}

import { useMemo, useState } from 'react'
import { Card } from '../../components/ui/Card'
import { SearchInput } from '../../components/ui/Form'
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/States'
import { TableShell, Th, theadClass } from '../../components/ui/Table'
import { useDistributionCenters } from '../../hooks/useLocations'
import { useInventory, useOpenRequestSummaries } from '../../hooks/useRequests'
import { CATEGORIES } from '../../utils/categories'
import { cn } from '../../utils/cn'
import { formatRelative } from '../../utils/format'

/**
 * Inventory tab: the inventory_status table as a grid — one row per active
 * distribution center, one column per item. Read-only here; each center's
 * officer updates it from their app, and every "Out" becomes a request.
 */
export function InventoryTable({ onGoToRequests }) {
  const inventory = useInventory()
  const centers = useDistributionCenters()
  const open = useOpenRequestSummaries()
  const [search, setSearch] = useState('')
  const [onlyOut, setOnlyOut] = useState(false)

  const rows = useMemo(() => {
    const byCenter = new Map()
    for (const r of inventory.data ?? []) {
      const m = byCenter.get(r.distribution_center_id) ?? new Map()
      m.set(r.category, r)
      byCenter.set(r.distribution_center_id, m)
    }
    const term = search.trim().toLowerCase()
    return (centers.data ?? [])
      .filter((c) => c.status === 'active')
      .filter((c) => !term || [c.name, c.short_code].some((v) => v?.toLowerCase().includes(term)))
      .map((c) => {
        const items = byCenter.get(c.id) ?? new Map()
        const latest = [...items.values()].sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0]
        const outCount = [...items.values()].filter((i) => i.is_out_of_stock).length
        return { center: c, items, latest, outCount }
      })
      .filter((r) => !onlyOut || r.outCount > 0)
      .sort((a, b) => b.outCount - a.outCount || a.center.name.localeCompare(b.center.name))
  }, [inventory.data, centers.data, search, onlyOut])

  // Which collection point is handling a given center + item, if any.
  const assignedTo = (centerId, category) =>
    open.data?.find((r) => r.distribution_center_id === centerId && (r.requested_categories ?? []).includes(category))
      ?.collection_point?.name

  const totalOut = (inventory.data ?? []).filter((r) => r.is_out_of_stock).length
  const loading = inventory.isPending || centers.isPending
  const error = inventory.error ?? centers.error

  return (
    <Card>
      <div className="flex flex-col gap-3 border-b border-line px-5 py-4 md:flex-row md:items-center">
        <div className="flex-1">
          <p className="font-semibold">Stock at each distribution center</p>
          <p className="text-sm text-muted">
            Each center's officer updates this in their app. Anything marked Finished becomes a request.
          </p>
        </div>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search center"
          label="Search distribution centers"
          className="md:w-64"
        />
        <label className="flex items-center gap-2 text-sm whitespace-nowrap">
          <input
            type="checkbox"
            checked={onlyOut}
            onChange={(e) => setOnlyOut(e.target.checked)}
            className="size-4 accent-brand-700"
          />
          Only centers with finished items
        </label>
      </div>

      {error ? (
        <ErrorState
          error={error}
          onRetry={() => {
            void inventory.refetch()
            void centers.refetch()
          }}
        />
      ) : loading ? (
        <div className="space-y-2 p-5">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </div>
      ) : !rows.length ? (
        <EmptyState
          title={
            onlyOut
              ? 'No center has finished items'
              : search
                ? 'No centers found. Try a different search.'
                : 'No open distribution centers'
          }
          className="py-10"
        />
      ) : (
        <>
          <TableShell minWidth={900}>
            <thead className={theadClass}>
              <tr>
                <Th className="pl-5">Distribution center</Th>
                {CATEGORIES.map((c) => (
                  <Th key={c.key} className="text-center">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="size-2 rounded-full" style={{ background: c.color }} aria-hidden />
                      {c.label}
                    </span>
                  </Th>
                ))}
                <Th className="pr-5">Last updated</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map(({ center, items, latest }) => (
                <tr key={center.id}>
                  <td className="py-3 pr-3 pl-5">
                    <p className="font-semibold">{center.name}</p>
                    {center.short_code && <p className="text-xs text-muted">{center.short_code}</p>}
                  </td>
                  {CATEGORIES.map((c) => {
                    const item = items.get(c.key)
                    const handler = item?.is_out_of_stock ? assignedTo(center.id, c.key) : undefined
                    return (
                      <td key={c.key} className="px-2 py-3 text-center align-middle">
                        {!item ? (
                          <span className="text-xs text-muted" title="The center has not updated this item yet">
                            —
                          </span>
                        ) : item.is_out_of_stock ? (
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-bold text-red-800 ring-1 ring-red-200">
                              Finished
                            </span>
                            {handler ? (
                              <span
                                className="max-w-32 truncate text-[11px] text-sky-800"
                                title={`Assigned to ${handler}`}
                              >
                                → {handler}
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={onGoToRequests}
                                className="text-[11px] font-semibold text-red-800 underline"
                              >
                                Not assigned yet
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200">
                            Available
                          </span>
                        )}
                      </td>
                    )
                  })}
                  <td className="py-3 pr-5 pl-3 text-xs text-muted">
                    {latest ? (
                      <>
                        <p className="whitespace-nowrap">{formatRelative(latest.updated_at)}</p>
                        {latest.updated_by && <p className="truncate">by {latest.updated_by.full_name}</p>}
                      </>
                    ) : (
                      'No update yet'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </TableShell>
          <p className={cn('border-t border-line px-5 py-3 text-xs text-muted')}>
            {rows.length} center{rows.length === 1 ? '' : 's'} · {totalOut} item{totalOut === 1 ? '' : 's'} finished in
            total · “—” means the center has not updated that item yet.
          </p>
        </>
      )}
    </Card>
  )
}

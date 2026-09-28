import { useMemo, useState } from 'react'
import { Card } from '../../components/ui/Card'
import { SearchInput } from '../../components/ui/Form'
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/States'
import { TableShell, Th, theadClass } from '../../components/ui/Table'
import { useDistributionCenters } from '../../hooks/useLocations'
import { useInventory, useOpenRequestSummaries } from '../../hooks/useRequests'
import { cn } from '../../utils/cn'
import { formatRelative } from '../../utils/format'

/**
 * Stock tab: one row per active distribution center with a single stock state.
 * A center is out of stock when its officer has marked anything out in the app
 * (any inventory_status row with is_out_of_stock). Read-only here; each out of
 * stock center becomes one request on the Requests tab.
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
        const items = [...(byCenter.get(c.id) ?? new Map()).values()]
        const latest = items.sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0]
        const isOut = items.some((i) => i.is_out_of_stock)
        return { center: c, latest, isOut, hasUpdate: items.length > 0 }
      })
      .filter((r) => !onlyOut || r.isOut)
      .sort((a, b) => Number(b.isOut) - Number(a.isOut) || a.center.name.localeCompare(b.center.name))
  }, [inventory.data, centers.data, search, onlyOut])

  // Which collection point is filling a given center, if any.
  const assignedTo = (centerId) => open.data?.find((r) => r.distribution_center_id === centerId)?.collection_point?.name

  const totalOut = rows.filter((r) => r.isOut).length
  const loading = inventory.isPending || centers.isPending
  const error = inventory.error ?? centers.error

  return (
    <Card>
      <div className="flex flex-col gap-3 border-b border-line px-5 py-4 md:flex-row md:items-center">
        <div className="flex-1">
          <p className="font-semibold">Stock at each distribution center</p>
          <p className="text-sm text-muted">
            Each center's officer updates this in their app. A center marked Out of stock becomes a request.
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
          Only out of stock centers
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
              ? 'No center is out of stock'
              : search
                ? 'No centers found. Try a different search.'
                : 'No open distribution centers'
          }
          className="py-10"
        />
      ) : (
        <>
          <TableShell minWidth={640}>
            <thead className={theadClass}>
              <tr>
                <Th className="pl-5">Distribution center</Th>
                <Th>Stock</Th>
                <Th>Collection point</Th>
                <Th className="pr-5">Last updated</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map(({ center, latest, isOut, hasUpdate }) => {
                const handler = isOut ? assignedTo(center.id) : undefined
                return (
                  <tr key={center.id}>
                    <td className="py-3 pr-3 pl-5">
                      <p className="font-semibold">{center.name}</p>
                      {center.short_code && <p className="text-xs text-muted">{center.short_code}</p>}
                    </td>
                    <td className="px-3 py-3">
                      {isOut ? (
                        <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-bold whitespace-nowrap text-red-800 ring-1 ring-red-200">
                          Out of stock
                        </span>
                      ) : hasUpdate ? (
                        <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200">
                          Available
                        </span>
                      ) : (
                        <span className="text-xs text-muted">No update</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-sm">
                      {!isOut ? (
                        <span className="text-muted">—</span>
                      ) : handler ? (
                        <span className="text-sky-800">→ {handler}</span>
                      ) : (
                        <button
                          type="button"
                          onClick={onGoToRequests}
                          className="text-xs font-semibold text-red-800 underline"
                        >
                          Not assigned yet
                        </button>
                      )}
                    </td>
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
                )
              })}
            </tbody>
          </TableShell>
          <p className={cn('border-t border-line px-5 py-3 text-xs text-muted')}>
            {rows.length} center{rows.length === 1 ? '' : 's'} · {totalOut} out of stock.
          </p>
        </>
      )}
    </Card>
  )
}

import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { X } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input, SearchInput, Select } from '../../components/ui/Form'
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/States'
import { Pagination } from '../../components/ui/Table'
import { ShipmentTable } from '../../components/domain/ShipmentTable'
import { useLocationOptions, useShipmentList } from '../../hooks/useShipments'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { CATEGORIES } from '../../utils/categories'
import { usePanelParam } from '../../hooks/usePanelParam'
import { BatchPanel } from './BatchPanel'

const PAGE_SIZE = 25
const SORT_COLUMNS = ['dispatched_at', 'received_at', 'total_kg', 'batch_code']
const FILTER_KEYS = ['q', 'category', 'cp', 'dc', 'status', 'from', 'to']

export function BatchExplorerPage() {
  const [params, setParams] = useSearchParams()
  const options = useLocationOptions()
  const panel = usePanelParam()
  const [searchText, setSearchText] = useState(params.get('q') ?? '')
  const search = useDebouncedValue(searchText)

  const filters = {
    search,
    category: params.get('category') ?? 'all',
    collectionPointId: params.get('cp') ?? undefined,
    distributionCenterId: params.get('dc') ?? undefined,
    status: params.get('status') ?? 'all',
    from: params.get('from') ?? undefined,
    to: params.get('to') ?? undefined,
  }
  const page = Math.max(1, Number(params.get('page')) || 1)
  const sortColumn = SORT_COLUMNS.includes(params.get('sort')) ? params.get('sort') : 'dispatched_at'
  const sort = { column: sortColumn, ascending: params.get('dir') === 'asc' }
  const list = useShipmentList({ filters, page, pageSize: PAGE_SIZE, sort })

  const update = (changes, resetPage = true) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        for (const [key, value] of Object.entries(changes)) {
          if (value) next.set(key, value)
          else next.delete(key)
        }
        if (resetPage) next.delete('page')
        return next
      },
      { replace: true },
    )

  const hasFilters = FILTER_KEYS.some((key) => params.get(key))
  const dateError =
    filters.from && filters.to && filters.from > filters.to ? 'The first date is after the second date.' : null

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Every shipment, from when a collection point sends it to when a distribution center receives it.
      </p>

      <Card>
        <div className="grid gap-3 px-4 py-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
          <SearchInput
            value={searchText}
            onChange={(v) => {
              setSearchText(v)
              update({ q: v || null })
            }}
            placeholder="Shipment number, for example CP-014-B07"
            label="Search by shipment number"
            className="sm:col-span-2"
          />
          <Select
            aria-label="Item"
            value={filters.category}
            onChange={(e) => update({ category: e.target.value === 'all' ? null : e.target.value })}
          >
            <option value="all">All items</option>
            {CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>
                Contains {c.label.toLowerCase()}
              </option>
            ))}
          </Select>
          <Select
            aria-label="Collection point"
            value={filters.collectionPointId ?? ''}
            onChange={(e) => update({ cp: e.target.value || null })}
          >
            <option value="">All collection points</option>
            {options.data?.collectionPoints.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </Select>
          <Select
            aria-label="Distribution center"
            value={filters.distributionCenterId ?? ''}
            onChange={(e) => update({ dc: e.target.value || null })}
          >
            <option value="">All distribution centers</option>
            {options.data?.distributionCenters.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </Select>
          <Select
            aria-label="Status"
            value={filters.status}
            onChange={(e) => update({ status: e.target.value === 'all' ? null : e.target.value })}
          >
            <option value="all">Sent and received</option>
            <option value="dispatched">On the way</option>
            <option value="received">Received</option>
          </Select>
          <label className="block">
            <span className="sr-only">Sent from date</span>
            <Input
              type="date"
              value={filters.from ?? ''}
              onChange={(e) => update({ from: e.target.value || null })}
              title="Sent from date"
              aria-invalid={!!dateError}
            />
          </label>
          <label className="block">
            <span className="sr-only">Sent to date</span>
            <Input
              type="date"
              value={filters.to ?? ''}
              onChange={(e) => update({ to: e.target.value || null })}
              title="Sent to date"
              aria-invalid={!!dateError}
            />
          </label>
        </div>
        {(hasFilters || dateError) && (
          <div className="flex items-center gap-3 px-4 pb-3 text-xs">
            {dateError && <span className="text-red-700">{dateError}</span>}
            {hasFilters && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setSearchText('')
                  setParams({}, { replace: true })
                }}
              >
                <X className="size-3.5" aria-hidden /> Clear filters
              </Button>
            )}
          </div>
        )}

        {list.isError ? (
          <ErrorState error={list.error} onRetry={() => void list.refetch()} />
        ) : list.isPending ? (
          <div className="space-y-2 px-4 pb-4">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-11" />
            ))}
          </div>
        ) : !list.data.rows.length ? (
          hasFilters ? (
            <EmptyState title="No shipments found" description="Try other dates, or clear the filters." />
          ) : (
            <EmptyState
              title="No shipments yet"
              description="Shipments show here when a collection point sends items."
            />
          )
        ) : (
          <div className={list.isPlaceholderData ? 'opacity-60' : undefined}>
            <ShipmentTable
              rows={list.data.rows}
              sort={sort}
              onSort={(s) => update({ sort: s.column, dir: s.ascending ? 'asc' : null })}
              onOpen={panel.open}
            />
            <Pagination
              page={page}
              pageSize={PAGE_SIZE}
              total={list.data.total}
              onPageChange={(p) => update({ page: String(p) }, false)}
            />
          </div>
        )}
      </Card>

      {panel.openId && <BatchPanel shipmentId={panel.openId} onClose={panel.close} />}
    </div>
  )
}

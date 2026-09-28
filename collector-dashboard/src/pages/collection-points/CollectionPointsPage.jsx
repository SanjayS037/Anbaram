import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { SearchInput, Select } from '../../components/ui/Form'
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/States'
import { Pagination, SortableTh, TableShell, Th, theadClass } from '../../components/ui/Table'
import { ComplianceBadge, LocationStatusBadge, RequestStatusBadge } from '../../components/domain/StatusBadges'
import { OfficerContactCell } from '../../components/domain/OfficerContactCell'
import { LocationFormDialog } from '../../components/domain/LocationFormDialog'
import { useCollectionPoints } from '../../hooks/useLocations'
import { useClientTable } from '../../hooks/useClientTable'
import { usePanelParam } from '../../hooks/usePanelParam'
import { CollectionPointPanel } from './CollectionPointPanel'
import { complianceRank, getCompliance } from '../../utils/compliance'
import { formatDate } from '../../utils/format'

const searchText = (r) => [r.name, r.short_code, r.zone, r.address, r.officer?.full_name, r.officer?.phone].join(' ')
const sortValue = (r, column) => {
  switch (column) {
    case 'name':
      return r.name.toLowerCase()
    case 'zone':
      return r.zone?.toLowerCase() ?? null
    case 'last_collected_at':
      return r.last_collected_at ? new Date(r.last_collected_at).getTime() : null
    case 'due':
      // most urgent first: overdue, never, due soon, on schedule
      return complianceRank[r.compliance.state] * 100000 + (r.compliance.daysUntilDue ?? 0)
  }
}

export function CollectionPointsPage() {
  const panel = usePanelParam()
  const points = useCollectionPoints()
  const [adding, setAdding] = useState(false)
  const [status, setStatus] = useState('active')
  const [compliance, setCompliance] = useState('all')

  const rows = useMemo(
    () =>
      (points.data ?? [])
        .filter((p) => status === 'all' || p.status === status)
        .map((p) => ({ ...p, compliance: getCompliance(p.last_collected_at, p.cycle_frequency_days) }))
        .filter((p) => compliance === 'all' || p.compliance.state === compliance),
    [points.data, status, compliance],
  )
  const table = useClientTable({ rows, searchText, sortValue, initialSort: { column: 'due', ascending: true } })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          Places where people give donations. Each place has one officer and is collected every few days.
        </p>
        <Button onClick={() => setAdding(true)}>
          <Plus className="size-4" aria-hidden /> Add collection point
        </Button>
      </div>

      <Card>
        <div className="flex flex-col gap-3 px-4 py-3 md:flex-row">
          <SearchInput
            value={table.search}
            onChange={table.setSearch}
            placeholder="Search by name, code, taluk, address or officer"
            className="md:max-w-sm md:flex-1"
          />
          <Select
            aria-label="Filter by status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="md:w-40"
          >
            <option value="active">Open</option>
            <option value="inactive">Closed</option>
            <option value="all">Open and closed</option>
          </Select>
          <Select
            aria-label="Filter by collection schedule"
            value={compliance}
            onChange={(e) => setCompliance(e.target.value)}
            className="md:w-48"
          >
            <option value="all">Any schedule</option>
            <option value="overdue">Late</option>
            <option value="never">Not collected yet</option>
            <option value="due_soon">Due in the next 7 days</option>
            <option value="on_schedule">On time</option>
          </Select>
        </div>

        {points.isError ? (
          <ErrorState error={points.error} onRetry={() => void points.refetch()} />
        ) : points.isPending ? (
          <div className="space-y-2 px-4 pb-4">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : !points.data.length ? (
          <EmptyState
            title="No collection points yet"
            description="Add the first collection point. Then approve an officer to look after it."
            action={
              <Button size="sm" onClick={() => setAdding(true)} className="mt-2">
                <Plus className="size-4" aria-hidden /> Add collection point
              </Button>
            }
          />
        ) : !table.total ? (
          <EmptyState title="No collection points found. Try a different search." />
        ) : (
          <>
            <TableShell minWidth={1060}>
              <thead className={theadClass}>
                <tr>
                  <SortableTh column="name" sort={table.sort} onSort={table.setSort}>
                    Collection point
                  </SortableTh>
                  <SortableTh column="zone" sort={table.sort} onSort={table.setSort}>
                    Taluk
                  </SortableTh>
                  <Th>Officer</Th>
                  <Th>Usually sends to</Th>
                  <SortableTh column="last_collected_at" sort={table.sort} onSort={table.setSort}>
                    Last collected
                  </SortableTh>
                  <SortableTh column="due" sort={table.sort} onSort={table.setSort}>
                    Next due
                  </SortableTh>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {table.pageRows.map((p) => (
                  <tr key={p.id} className="cursor-pointer hover:bg-brand-50/60" onClick={() => panel.open(p.id)}>
                    <td className="max-w-60 px-4 py-3">
                      <button
                        type="button"
                        onClick={(e) => (e.stopPropagation(), panel.open(p.id))}
                        className="text-left font-semibold text-brand-800 hover:underline"
                      >
                        {p.name}
                      </button>
                      {p.short_code && (
                        <span className="ml-1 text-xs whitespace-nowrap text-muted">({p.short_code})</span>
                      )}
                      {p.status === 'inactive' && (
                        <span className="ml-1.5">
                          <LocationStatusBadge status="inactive" />
                        </span>
                      )}
                      <p className="truncate text-xs text-muted">{p.address}</p>
                    </td>
                    <td className="px-4 py-3 text-muted">{p.zone ?? '—'}</td>
                    <td className="px-4 py-3">
                      <OfficerContactCell officer={p.officer} />
                    </td>
                    <td className="px-4 py-3 text-muted">{p.default_dc?.name ?? '—'}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted">{formatDate(p.last_collected_at)}</td>
                    <td className="px-4 py-3">
                      {p.status !== 'active' ? (
                        <span className="text-xs text-muted">—</span>
                      ) : p.requests[0] ? (
                        // An open collection request takes priority over the calendar due date.
                        <span title={`For ${p.requests[0].distribution_center?.name ?? 'a distribution center'}`}>
                          <RequestStatusBadge status={p.requests[0].status} />
                        </span>
                      ) : (
                        <ComplianceBadge result={p.compliance} />
                      )}
                      <p className="mt-1 text-xs whitespace-nowrap text-muted">Every {p.cycle_frequency_days} days</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
            <Pagination page={table.page} pageSize={table.pageSize} total={table.total} onPageChange={table.setPage} />
          </>
        )}
      </Card>

      {panel.openId && <CollectionPointPanel pointId={panel.openId} onClose={panel.close} />}

      {adding && (
        <LocationFormDialog
          type="collection_point"
          onClose={(id) => {
            setAdding(false)
            if (id) panel.open(id)
          }}
        />
      )}
    </div>
  )
}

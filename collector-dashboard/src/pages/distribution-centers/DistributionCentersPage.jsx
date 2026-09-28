import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { SearchInput, Select } from '../../components/ui/Form'
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/States'
import { Pagination, SortableTh, TableShell, Th, theadClass } from '../../components/ui/Table'
import { LocationStatusBadge } from '../../components/domain/StatusBadges'
import { OfficerContactCell } from '../../components/domain/OfficerContactCell'
import { LocationFormDialog } from '../../components/domain/LocationFormDialog'
import { useDistributionCenters } from '../../hooks/useLocations'
import { useClientTable } from '../../hooks/useClientTable'
import { usePanelParam } from '../../hooks/usePanelParam'
import { DistributionCenterPanel } from './DistributionCenterPanel'
import { formatDate } from '../../utils/format'

const searchText = (r) => [r.name, r.short_code, r.address, r.officer?.full_name, r.officer?.phone].join(' ')
const sortValue = (r, column) => (column === 'name' ? r.name.toLowerCase() : new Date(r.created_at).getTime())

export function DistributionCentersPage() {
  const panel = usePanelParam()
  const centers = useDistributionCenters()
  const [adding, setAdding] = useState(false)
  const [status, setStatus] = useState('active')

  const rows = useMemo(
    () => (centers.data ?? []).filter((c) => status === 'all' || c.status === status),
    [centers.data, status],
  )
  const table = useClientTable({ rows, searchText, sortValue, initialSort: { column: 'name', ascending: true } })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">Places that receive the items, check them and give them to people in need.</p>
        <Button onClick={() => setAdding(true)}>
          <Plus className="size-4" aria-hidden /> Add distribution center
        </Button>
      </div>

      <Card>
        <div className="flex flex-col gap-3 px-4 py-3 md:flex-row">
          <SearchInput
            value={table.search}
            onChange={table.setSearch}
            placeholder="Search by name, code, address or officer"
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
        </div>

        {centers.isError ? (
          <ErrorState error={centers.error} onRetry={() => void centers.refetch()} />
        ) : centers.isPending ? (
          <div className="space-y-2 px-4 pb-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : !centers.data.length ? (
          <EmptyState
            title="No distribution centers yet"
            description="Add a distribution center so collection points have a place to send items."
            action={
              <Button size="sm" onClick={() => setAdding(true)} className="mt-2">
                <Plus className="size-4" aria-hidden /> Add distribution center
              </Button>
            }
          />
        ) : !table.total ? (
          <EmptyState title="No distribution centers found. Try a different search." />
        ) : (
          <>
            <TableShell minWidth={860}>
              <thead className={theadClass}>
                <tr>
                  <SortableTh column="name" sort={table.sort} onSort={table.setSort}>
                    Distribution center
                  </SortableTh>
                  <Th>Officer</Th>
                  <SortableTh column="created_at" sort={table.sort} onSort={table.setSort}>
                    Added
                  </SortableTh>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {table.pageRows.map((c) => (
                  <tr key={c.id} className="cursor-pointer hover:bg-brand-50/60" onClick={() => panel.open(c.id)}>
                    <td className="max-w-80 px-4 py-3">
                      <button
                        type="button"
                        onClick={(e) => (e.stopPropagation(), panel.open(c.id))}
                        className="text-left font-semibold text-brand-800 hover:underline"
                      >
                        {c.name}
                      </button>
                      {c.short_code && <span className="ml-1 text-xs text-muted">({c.short_code})</span>}
                      <p className="truncate text-xs text-muted">{c.address}</p>
                    </td>
                    <td className="px-4 py-3">
                      <OfficerContactCell officer={c.officer} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted">{formatDate(c.created_at)}</td>
                    <td className="px-4 py-3">
                      <LocationStatusBadge status={c.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
            <Pagination page={table.page} pageSize={table.pageSize} total={table.total} onPageChange={table.setPage} />
          </>
        )}
      </Card>

      {panel.openId && <DistributionCenterPanel centerId={panel.openId} onClose={panel.close} />}

      {adding && (
        <LocationFormDialog
          type="distribution_center"
          onClose={(id) => {
            setAdding(false)
            if (id) panel.open(id)
          }}
        />
      )}
    </div>
  )
}

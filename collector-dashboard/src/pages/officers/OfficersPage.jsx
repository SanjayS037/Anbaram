import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { Card } from '../../components/ui/Card'
import { Tabs } from '../../components/ui/Tabs'
import { SearchInput, Select } from '../../components/ui/Form'
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/States'
import { Pagination, SortableTh, TableShell, Th, theadClass } from '../../components/ui/Table'
import { RoleBadge } from '../../components/domain/StatusBadges'
import { useOfficerCounts, useOfficerList } from '../../hooks/useOfficers'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { formatDate } from '../../utils/format'
import { OfficerActions } from './OfficerActions'
import { OfficerPanel } from './OfficerPanel'
import { usePanelParam } from '../../hooks/usePanelParam'

const PAGE_SIZE = 20
const STATUSES = ['pending', 'approved', 'rejected']
const SORT_COLUMNS = ['full_name', 'created_at', 'organization_name']

const emptyCopy = {
  pending: {
    title: 'No officers waiting',
    description: 'When a new officer signs up in the app, they will show here for you to approve.',
  },
  approved: {
    title: 'No approved officers yet',
    description: 'Approve a waiting officer to give them a place.',
  },
  rejected: { title: 'No rejected or removed officers', description: '' },
}

function LocationCell({ officer }) {
  if (officer.status === 'rejected') {
    return <span className="line-clamp-2 text-xs text-muted">{officer.rejected_reason ?? '—'}</span>
  }
  const loc = officer.collection_point ?? officer.distribution_center
  if (officer.status === 'pending') return <span className="text-xs text-muted">Chosen when you approve</span>
  if (!loc) return <span className="text-xs font-semibold text-amber-800">No place yet</span>
  return (
    <span className="text-sm">
      {loc.name}
      {loc.short_code && <span className="ml-1 text-muted">({loc.short_code})</span>}
    </span>
  )
}

export function OfficersPage() {
  const [params, setParams] = useSearchParams()
  const status = STATUSES.includes(params.get('status')) ? params.get('status') : 'pending'
  const role = params.get('role') ?? 'all'
  const page = Math.max(1, Number(params.get('page')) || 1)
  const sortColumn = SORT_COLUMNS.includes(params.get('sort')) ? params.get('sort') : 'created_at'
  const sort = { column: sortColumn, ascending: params.get('dir') === 'asc' }

  const [searchText, setSearchText] = useState(params.get('q') ?? '')
  const search = useDebouncedValue(searchText)

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

  const counts = useOfficerCounts()
  const panel = usePanelParam()
  const list = useOfficerList({ status, role, search, page, pageSize: PAGE_SIZE, sort })

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Officers sign up in the Collection Point or Distribution Center app. When you approve an officer, you give them
        one place to look after.
      </p>

      <Card>
        <div className="px-4 pt-2">
          <Tabs
            label="Officer status"
            value={status}
            onChange={(value) => update({ status: value })}
            items={STATUSES.map((s) => ({
              value: s,
              label: s === 'pending' ? 'Waiting for approval' : s === 'rejected' ? 'Rejected / Removed' : 'Approved',
              count: counts.data?.[s],
            }))}
          />
        </div>

        <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row">
          <SearchInput
            value={searchText}
            onChange={(value) => {
              setSearchText(value)
              update({ q: value || null })
            }}
            placeholder="Search by name, email, phone or office"
            className="sm:max-w-sm sm:flex-1"
          />
          <Select
            aria-label="Filter by type of officer"
            value={role}
            onChange={(e) => update({ role: e.target.value === 'all' ? null : e.target.value })}
            className="sm:w-56"
          >
            <option value="all">All officers</option>
            <option value="collection_point">Collection Point officers</option>
            <option value="distribution_point">Distribution Center officers</option>
          </Select>
        </div>

        {list.isError ? (
          <ErrorState error={list.error} onRetry={() => void list.refetch()} />
        ) : list.isPending ? (
          <div className="space-y-2 px-4 pb-4">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : !list.data.rows.length ? (
          search || role !== 'all' ? (
            <EmptyState title="No officers found" description="Try a different search." />
          ) : (
            <EmptyState {...emptyCopy[status]} />
          )
        ) : (
          <>
            <div className={list.isPlaceholderData ? 'opacity-60 transition-opacity' : undefined}>
              <TableShell minWidth={980}>
                <thead className={theadClass}>
                  <tr>
                    <SortableTh
                      column="full_name"
                      sort={sort}
                      onSort={(s) => update({ sort: s.column, dir: s.ascending ? 'asc' : null })}
                    >
                      Officer
                    </SortableTh>
                    <Th>Phone</Th>
                    <SortableTh
                      column="organization_name"
                      sort={sort}
                      onSort={(s) => update({ sort: s.column, dir: s.ascending ? 'asc' : null })}
                    >
                      Office
                    </SortableTh>
                    <Th>Works at</Th>
                    <SortableTh
                      column="created_at"
                      sort={sort}
                      onSort={(s) => update({ sort: s.column, dir: s.ascending ? 'asc' : null })}
                    >
                      Joined on
                    </SortableTh>
                    <Th>{status === 'rejected' ? 'Reason' : 'Place'}</Th>
                    {status !== 'rejected' && <Th className="text-right">Actions</Th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {list.data.rows.map((officer) => (
                    <tr
                      key={officer.id}
                      className="cursor-pointer align-middle hover:bg-brand-50/60"
                      onClick={() => panel.open(officer.id)}
                    >
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={(e) => (e.stopPropagation(), panel.open(officer.id))}
                          className="text-left font-semibold text-brand-800 hover:underline"
                        >
                          {officer.full_name}
                        </button>
                        <p className="text-xs text-muted">{officer.email}</p>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <a
                          href={`tel:${officer.phone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="hover:underline"
                        >
                          {officer.phone}
                        </a>
                      </td>
                      <td className="px-4 py-3">{officer.organization_name}</td>
                      <td className="px-4 py-3">
                        <RoleBadge role={officer.role} />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-muted">{formatDate(officer.created_at)}</td>
                      <td className="max-w-56 px-4 py-3">
                        <LocationCell officer={officer} />
                      </td>
                      {status !== 'rejected' && (
                        <td className="px-4 py-3">
                          <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                            <OfficerActions officer={officer} />
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </TableShell>
            </div>
            <Pagination
              page={page}
              pageSize={PAGE_SIZE}
              total={list.data.total}
              onPageChange={(p) => update({ page: String(p) }, false)}
            />
          </>
        )}
      </Card>

      {panel.openId && <OfficerPanel officerId={panel.openId} onClose={panel.close} />}
    </div>
  )
}

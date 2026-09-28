import { useId, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { ArrowRight, CheckCircle2, Inbox, Phone, UserCheck, X } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input, Select } from '../../components/ui/Form'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/States'
import { Pagination } from '../../components/ui/Table'
import { RequestStatusBadge } from '../../components/domain/StatusBadges'
import { useAdmin } from '../../hooks/authContext'
import { useCollectionPoints } from '../../hooks/useLocations'
import {
  useCancelRequest,
  useCreateRequest,
  useOpenRequestSummaries,
  useRequestCounts,
  useRequestList,
  useStockAlerts,
} from '../../hooks/useRequests'
import { CATEGORIES, categoryLabel } from '../../utils/categories'
import { cn } from '../../utils/cn'
import { formatDate, formatKg, formatRelative } from '../../utils/format'
import { BatchPanel } from '../batches/BatchPanel'
import { Tabs } from '../../components/ui/Tabs'
import { InventoryTable } from './InventoryTable'

const PAGE_SIZE = 10

/**
 * Requests page.
 * 1. A Distribution Center officer marks an item as finished in their app
 *    (inventory_status.is_out_of_stock = true) — that is the request.
 * 2. The Collector Office assigns a collection point to it (inserts a
 *    collection_requests row). Nothing is assigned automatically.
 * 3. The collection point's officer collects and dispatches; the assignment
 *    completes automatically when the shipment is sent.
 */
/** Requests page = two tables: requests (collection_requests + incoming) and inventory (inventory_status). */
export function CollectionRequestsPage() {
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'inventory' ? 'inventory' : 'requests'
  const setTab = (next) => setParams(next === 'requests' ? {} : { tab: next }, { replace: true })
  const alerts = useStockAlerts()
  const waiting = useWaitingCount()

  return (
    <div className="space-y-5">
      <div className="mx-auto max-w-5xl">
        <Tabs
          label="Requests page sections"
          value={tab}
          onChange={setTab}
          items={[
            { value: 'requests', label: 'Requests', count: waiting },
            { value: 'inventory', label: 'Stock' },
          ]}
        />
      </div>
      <div className="mx-auto max-w-5xl">
        {tab === 'requests' ? (
          <RequestsTab alerts={alerts} />
        ) : (
          <InventoryTable onGoToRequests={() => setTab('requests')} />
        )}
      </div>
    </div>
  )
}

/** Number of out-of-stock items nobody has been assigned to yet. */
function useWaitingCount() {
  const alerts = useStockAlerts()
  const open = useOpenRequestSummaries()
  return (alerts.data ?? []).filter(
    (a) =>
      a.distribution_center?.status === 'active' &&
      !open.data?.some(
        (r) =>
          r.distribution_center_id === a.distribution_center?.id && (r.requested_categories ?? []).includes(a.category),
      ),
  ).length
}

function RequestsTab({ alerts }) {
  const openAssignments = useOpenRequestSummaries()
  const points = useCollectionPoints()

  // A request is "new" until an open assignment covers that center + item.
  const newRequests = useMemo(
    () =>
      (alerts.data ?? []).filter(
        (a) =>
          a.distribution_center?.status === 'active' &&
          !openAssignments.data?.some(
            (r) =>
              r.distribution_center_id === a.distribution_center?.id &&
              (r.requested_categories ?? []).includes(a.category),
          ),
      ),
    [alerts.data, openAssignments.data],
  )

  const loading = alerts.isPending || openAssignments.isPending || points.isPending
  const error = alerts.error ?? openAssignments.error ?? points.error

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-ink">
            New requests
            {newRequests.length > 0 && (
              <span className="rounded-full bg-red-700 px-2 text-xs font-bold text-white">{newRequests.length}</span>
            )}
          </h2>
          <p className="text-sm text-muted">
            A distribution center officer sends a request from their app when an item is finished. Choose a collection
            point to send it.
          </p>
        </div>

        {error ? (
          <Card>
            <ErrorState
              error={error}
              onRetry={() => {
                void alerts.refetch()
                void openAssignments.refetch()
                void points.refetch()
              }}
            />
          </Card>
        ) : loading ? (
          <Skeleton className="h-40" />
        ) : !newRequests.length ? (
          <Card>
            <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
              <Inbox className="size-7 text-brand-300" aria-hidden />
              <p className="font-semibold">No new requests</p>
              <p className="text-sm text-muted">When a distribution center has finished an item, it will show here.</p>
            </div>
          </Card>
        ) : (
          newRequests.map((request) => <NewRequestCard key={request.id} request={request} points={points.data ?? []} />)
        )}
      </section>

      <AssignedRequests />
    </div>
  )
}

// ---------------------------------------------------------------------------
// One incoming request: what ran out, where, who sent it — and Assign
// ---------------------------------------------------------------------------

function NewRequestCard({ request, points }) {
  const admin = useAdmin()
  const assign = useCreateRequest()
  const id = useId()
  const [pointId, setPointId] = useState('')
  const [message, setMessage] = useState('')
  const center = request.distribution_center
  const color = CATEGORIES.find((c) => c.key === request.category)?.color

  // No map coordinates exist in the schema, so the "nearest" suggestion is the
  // points that normally send to this center; all others follow.
  const active = points.filter((p) => p.status === 'active')
  const usual = active.filter((p) => p.default_distribution_center_id === center.id)
  const others = active.filter((p) => p.default_distribution_center_id !== center.id)
  const label = (p) => `${p.name} — ${p.officer ? p.officer.full_name : 'no officer (cannot be chosen)'}`
  const chosen = active.find((p) => p.id === pointId)

  function submit() {
    if (!chosen) return
    assign.mutate({
      collectionPointId: chosen.id,
      distributionCenterId: center.id,
      adminId: admin.id,
      categories: [request.category],
      note: message.trim() || null,
      pointName: chosen.name,
    })
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex">
        <div className="w-1.5 shrink-0" style={{ background: color }} aria-hidden />
        <div className="flex-1 space-y-4 p-5">
          <div>
            <p className="text-base">
              <strong className="text-lg">{categoryLabel(request.category)}</strong>
              <span className="text-muted"> is finished at </span>
              <span className="font-semibold text-brand-900">{center.name}</span>
            </p>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-muted">
              {request.requested_by ? (
                <a
                  href={`tel:${request.requested_by.phone}`}
                  className="inline-flex items-center gap-1 hover:underline"
                >
                  <Phone className="size-3" aria-hidden />
                  Sent by {request.requested_by.full_name}, {request.requested_by.phone}
                </a>
              ) : (
                <span>Sent from the distribution center app</span>
              )}
              <span>{formatRelative(request.updated_at)}</span>
            </p>
          </div>

          <div className="grid gap-3 rounded-md bg-brand-50/70 p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <label htmlFor={`${id}-cp`} className="block">
              <span className="text-sm font-medium text-ink">Choose a collection point</span>
              <Select id={`${id}-cp`} value={pointId} onChange={(e) => setPointId(e.target.value)} className="mt-1">
                <option value="">Choose…</option>
                {usual.length > 0 && (
                  <optgroup label="Usually sends to this center">
                    {usual.map((p) => (
                      <option key={p.id} value={p.id} disabled={!p.officer}>
                        {label(p)}
                      </option>
                    ))}
                  </optgroup>
                )}
                <optgroup label={usual.length ? 'Other collection points' : 'Collection points'}>
                  {others.map((p) => (
                    <option key={p.id} value={p.id} disabled={!p.officer}>
                      {label(p)}
                    </option>
                  ))}
                </optgroup>
              </Select>
            </label>
            <label htmlFor={`${id}-msg`} className="block">
              <span className="text-sm font-medium text-ink">
                Message for officer <span className="font-normal text-muted">(optional)</span>
              </span>
              <Input
                id={`${id}-msg`}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={300}
                placeholder="For example: urgent, about 40 needed"
                className="mt-1"
              />
            </label>
            <Button onClick={submit} disabled={!chosen} loading={assign.isPending} className="w-full sm:w-auto">
              <UserCheck className="size-4" aria-hidden /> Assign
            </Button>
          </div>
          {chosen && (
            <p className="-mt-2 text-xs text-muted">
              <strong className="text-ink">{chosen.officer?.full_name}</strong> from {chosen.name} will collect{' '}
              {categoryLabel(request.category).toLowerCase()} and take them to {center.name}.
            </p>
          )}
        </div>
      </div>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Already assigned (in progress by default, past on request)
// ---------------------------------------------------------------------------

function AssignedRequests() {
  const [tab, setTab] = useState('open')
  const [page, setPage] = useState(1)
  const counts = useRequestCounts()
  const list = useRequestList({ tab, page, pageSize: PAGE_SIZE })
  const unassign = useCancelRequest()
  const [cancelling, setCancelling] = useState(null)
  const [openBatch, setOpenBatch] = useState(null)

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-ink">{tab === 'open' ? 'Assigned' : 'Past requests'}</h2>
          <p className="text-sm text-muted">
            {tab === 'open'
              ? 'Waiting for the collection point officer. Each one closes by itself when they send the items.'
              : 'Requests that were sent or removed.'}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setTab(tab === 'open' ? 'history' : 'open')
            setPage(1)
          }}
        >
          {tab === 'open'
            ? `Show past requests (${counts.data?.history ?? 0})`
            : `Show assigned requests (${counts.data?.open ?? 0})`}
        </Button>
      </div>

      <Card>
        {list.isError ? (
          <ErrorState error={list.error} onRetry={() => void list.refetch()} />
        ) : list.isPending ? (
          <div className="space-y-2 p-4">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
        ) : !list.data.rows.length ? (
          <EmptyState
            title={tab === 'open' ? 'No assigned requests right now' : 'No past requests yet'}
            className="py-8"
          />
        ) : (
          <div className={cn(list.isPlaceholderData && 'opacity-60')}>
            <ul className="divide-y divide-line">
              {list.data.rows.map((r) => (
                <li key={r.id} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:gap-4">
                  <div className="shrink-0 sm:w-28">
                    <RequestStatusBadge status={r.status} />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1 text-sm">
                    <p className="flex flex-wrap items-center gap-1.5">
                      <strong>{(r.requested_categories ?? []).map(categoryLabel).join(', ')}</strong>
                      <span className="text-muted">from</span>
                      <span className="font-medium">{r.collection_point?.name ?? '—'}</span>
                      <ArrowRight className="size-3.5 text-muted" aria-hidden />
                      <span className="font-medium">{r.distribution_center?.name ?? '—'}</span>
                    </p>
                    <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted">
                      {r.collection_point?.officer ? (
                        <a
                          href={`tel:${r.collection_point.officer.phone}`}
                          className="inline-flex items-center gap-1 hover:underline"
                        >
                          <Phone className="size-3" aria-hidden />
                          {r.collection_point.officer.full_name}, {r.collection_point.officer.phone}
                        </a>
                      ) : (
                        <span className="font-semibold text-amber-800">No officer at this point</span>
                      )}
                      <span>assigned {formatDate(r.created_at)}</span>
                      {r.status === 'completed' && r.completed_at && <span>sent {formatDate(r.completed_at)}</span>}
                    </p>
                    {r.note && <p className="text-xs text-muted italic">“{r.note}”</p>}
                    {r.shipments.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setOpenBatch(s.id)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline"
                      >
                        <CheckCircle2 className="size-3" aria-hidden /> Shipment {s.batch_code} · {formatKg(s.total_kg)}
                      </button>
                    ))}
                  </div>
                  {tab === 'open' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="self-start text-red-800 sm:self-center"
                      onClick={() => setCancelling(r)}
                    >
                      <X className="size-4" aria-hidden /> Unassign
                    </Button>
                  )}
                </li>
              ))}
            </ul>
            {list.data.total > PAGE_SIZE && (
              <Pagination page={page} pageSize={PAGE_SIZE} total={list.data.total} onPageChange={setPage} />
            )}
          </div>
        )}
      </Card>

      {openBatch && <BatchPanel shipmentId={openBatch} onClose={() => setOpenBatch(null)} />}

      {cancelling && (
        <ConfirmDialog
          open
          onClose={() => setCancelling(null)}
          busy={unassign.isPending}
          title="Remove this request from the collection point?"
          confirmLabel="Yes, remove"
          onConfirm={() =>
            unassign.mutate(
              { id: cancelling.id, pointName: cancelling.collection_point?.name ?? 'collection point' },
              { onSuccess: () => setCancelling(null) },
            )
          }
        >
          {cancelling.collection_point?.officer?.full_name ?? 'The officer'} will no longer be asked to take items to{' '}
          <strong className="text-ink">{cancelling.distribution_center?.name}</strong>. If the item is still finished
          there, the request goes back to <strong className="text-ink">New requests</strong> so you can choose another
          collection point.
          {cancelling.status === 'in_progress' && ' They have already started, so please call them.'}
        </ConfirmDialog>
      )}
    </section>
  )
}

import { useId, useState } from 'react'
import { useSearchParams } from 'react-router'
import { CheckCircle2 } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { Tabs } from '../../components/ui/Tabs'
import { Field, SearchInput, Select, Textarea } from '../../components/ui/Form'
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/States'
import { Pagination, TableShell, Th, theadClass } from '../../components/ui/Table'
import { useAdmin } from '../../hooks/authContext'
import { useFlagCounts, useFlagList, useResolveFlag } from '../../hooks/useShipments'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { formatDate, formatDateTime } from '../../utils/format'
import { issueTypeLabel } from '../../utils/labels'
import { BatchPanel } from '../batches/BatchPanel'

const PAGE_SIZE = 20

const issueTone = (issueType) =>
  issueType === 'damaged' ? 'danger' : issueType === 'slightly_damaged' ? 'warning' : 'neutral'

export function FlagsPage() {
  const [params, setParams] = useSearchParams()
  const status = params.get('status') === 'resolved' ? 'resolved' : 'open'
  const [issueType, setIssueType] = useState('all')
  const [searchText, setSearchText] = useState('')
  const search = useDebouncedValue(searchText)
  const [page, setPage] = useState(1)
  const [resolving, setResolving] = useState(null)
  const [openBatch, setOpenBatch] = useState(null)

  const counts = useFlagCounts()
  const list = useFlagList({ status, search, issueType, page, pageSize: PAGE_SIZE })

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        A flag is created by itself when a distribution center receives a shipment that is damaged. After you handle it,
        mark it as done.
      </p>

      <Card>
        <div className="px-4 pt-2">
          <Tabs
            label="Flag status"
            value={status}
            onChange={(value) => {
              setParams(value === 'open' ? {} : { status: value }, { replace: true })
              setPage(1)
            }}
            items={[
              { value: 'open', label: 'Open', count: counts.data?.open },
              { value: 'resolved', label: 'Done', count: counts.data?.resolved },
            ]}
          />
        </div>

        <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row">
          <SearchInput
            value={searchText}
            onChange={(v) => {
              setSearchText(v)
              setPage(1)
            }}
            placeholder="Search by shipment number"
            label="Search by shipment number"
            className="sm:max-w-xs sm:flex-1"
          />
          <Select
            aria-label="Filter by reason"
            value={issueType}
            onChange={(e) => {
              setIssueType(e.target.value)
              setPage(1)
            }}
            className="sm:w-52"
          >
            <option value="all">All reasons</option>
            <option value="damaged">Damaged</option>
            <option value="slightly_damaged">Slightly damaged</option>
            <option value="other">Other</option>
          </Select>
        </div>

        {list.isError ? (
          <ErrorState error={list.error} onRetry={() => void list.refetch()} />
        ) : list.isPending ? (
          <div className="space-y-2 px-4 pb-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : !list.data.rows.length ? (
          search || issueType !== 'all' ? (
            <EmptyState title="No flags found. Try a different search." />
          ) : status === 'open' ? (
            <EmptyState
              title="No open flags"
              description="All received shipments are fine, or their flags are already done."
            />
          ) : (
            <EmptyState title="No done flags yet" />
          )
        ) : (
          <div className={list.isPlaceholderData ? 'opacity-60' : undefined}>
            <TableShell minWidth={status === 'open' ? 1000 : 1150}>
              <thead className={theadClass}>
                <tr>
                  <Th>Shipment No.</Th>
                  <Th>From → To</Th>
                  <Th>Reason</Th>
                  <Th>Note</Th>
                  <Th>Reported by</Th>
                  <Th>Reported on</Th>
                  {status === 'resolved' ? (
                    <>
                      <Th>What was done</Th>
                      <Th>Done on</Th>
                    </>
                  ) : (
                    <Th className="text-right">Action</Th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {list.data.rows.map((f) => (
                  <tr key={f.id} className="align-top hover:bg-brand-50/40">
                    <td className="px-4 py-3 font-semibold whitespace-nowrap">
                      {f.shipment ? (
                        <button
                          type="button"
                          onClick={() => setOpenBatch(f.shipment.id)}
                          className="text-brand-800 hover:underline"
                          title="See the shipment"
                        >
                          {f.shipment.batch_code ?? '—'}
                        </button>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {f.shipment?.collection_point?.name ?? '—'}
                      <span className="text-muted"> → </span>
                      {f.shipment?.distribution_center?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={issueTone(f.issue_type)}>{issueTypeLabel(f.issue_type)}</Badge>
                    </td>
                    <td className="max-w-64 px-4 py-3 text-muted">{f.note || '—'}</td>
                    <td className="px-4 py-3">{f.raised_by?.full_name ?? '—'}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted">{formatDate(f.created_at)}</td>
                    {status === 'resolved' ? (
                      <>
                        <td className="max-w-64 px-4 py-3">{f.resolution_note || '—'}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-muted">
                          {formatDate(f.resolved_at)}
                          {f.resolver && <p className="text-xs">by {f.resolver.full_name}</p>}
                        </td>
                      </>
                    ) : (
                      <td className="px-4 py-3 text-right">
                        <Button size="sm" onClick={() => setResolving(f)}>
                          <CheckCircle2 className="size-4" aria-hidden /> Mark as done
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </TableShell>
            <Pagination page={page} pageSize={PAGE_SIZE} total={list.data.total} onPageChange={setPage} />
          </div>
        )}
      </Card>

      {resolving && <ResolveFlagDialog flag={resolving} onClose={() => setResolving(null)} />}
      {openBatch && <BatchPanel shipmentId={openBatch} onClose={() => setOpenBatch(null)} />}
    </div>
  )
}

function ResolveFlagDialog({ flag, onClose }) {
  const admin = useAdmin()
  const resolve = useResolveFlag()
  const [note, setNote] = useState('')
  const [touched, setTouched] = useState(false)
  const id = useId()
  const error = touched && note.trim().length < 5 ? 'Please write what was done (at least 5 letters).' : null

  function submit(event) {
    event.preventDefault()
    setTouched(true)
    if (note.trim().length < 5) return
    resolve.mutate(
      { flagId: flag.id, adminId: admin.id, note: note.trim(), batchCode: flag.shipment?.batch_code ?? null },
      { onSuccess: onClose },
    )
  }

  return (
    <Modal
      open
      onClose={onClose}
      busy={resolve.isPending}
      size="md"
      title={`Mark the flag on ${flag.shipment?.batch_code ?? 'this shipment'} as done`}
      description={
        <>
          <Badge tone={issueTone(flag.issue_type)}>{issueTypeLabel(flag.issue_type)}</Badge> reported{' '}
          {formatDateTime(flag.created_at)}
          {flag.raised_by && <> by {flag.raised_by.full_name}</>}
        </>
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={resolve.isPending}>
            Cancel
          </Button>
          <Button type="submit" form={id} loading={resolve.isPending}>
            Mark as done
          </Button>
        </>
      }
    >
      {flag.note && (
        <blockquote className="mb-4 rounded-md border-l-4 border-amber-400 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          “{flag.note}”
        </blockquote>
      )}
      <form id={id} onSubmit={submit} noValidate>
        <Field
          label="What was done?"
          htmlFor={`${id}-note`}
          required
          error={error}
          hint="Your name and the time are saved with this."
        >
          <Textarea
            id={`${id}-note`}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onBlur={() => setTouched(true)}
            placeholder="For example: Damaged boxes thrown away. New blankets sent from DC-02."
            maxLength={1000}
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-note-error` : undefined}
            autoFocus
          />
        </Field>
      </form>
    </Modal>
  )
}

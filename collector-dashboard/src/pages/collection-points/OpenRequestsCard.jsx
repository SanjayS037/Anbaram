import { useState } from 'react'
import { X } from 'lucide-react'
import { Card, CardBody, CardHeader } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { CategoryChip } from '../../components/domain/CategoryChip'
import { RequestStatusBadge } from '../../components/domain/StatusBadges'
import { useCancelRequest } from '../../hooks/useRequests'
import { formatDate, formatRelative } from '../../utils/format'

/** Open collection requests for one point, with Cancel. Renders nothing when there are none. */
export function OpenRequestsCard({ point }) {
  const cancel = useCancelRequest()
  const [cancelling, setCancelling] = useState(null)
  if (!point.requests.length) return null

  return (
    <Card className="border-amber-200">
      <CardHeader
        title="Requests given to this point"
        subtitle="This point has been asked to send items to a distribution center that ran out"
      />
      <CardBody>
        <ul className="divide-y divide-line">
          {point.requests.map((r) => (
            <li key={r.id} className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <RequestStatusBadge status={r.status} />
                  <span className="text-sm">
                    Deliver to <span className="font-semibold">{r.distribution_center?.name ?? '—'}</span>
                  </span>
                  <span className="text-xs text-muted">
                    assigned {formatDate(r.created_at)}
                    {r.started_at && ` · started ${formatRelative(r.started_at)}`}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {(r.requested_categories ?? []).map((c) => (
                    <CategoryChip key={c} category={c} />
                  ))}
                </div>
                {r.note && <p className="text-sm text-muted">{r.note}</p>}
              </div>
              <Button
                size="sm"
                variant="secondary"
                className="self-start text-red-800 sm:self-center"
                onClick={() => setCancelling(r)}
              >
                <X className="size-4" aria-hidden /> Remove
              </Button>
            </li>
          ))}
        </ul>
      </CardBody>

      {cancelling && (
        <ConfirmDialog
          open
          onClose={() => setCancelling(null)}
          busy={cancel.isPending}
          title="Remove this request from this point?"
          confirmLabel="Yes, remove"
          onConfirm={() =>
            cancel.mutate({ id: cancelling.id, pointName: point.name }, { onSuccess: () => setCancelling(null) })
          }
        >
          {point.officer?.full_name ?? 'The officer'} will no longer be asked to collect for{' '}
          <strong className="text-ink">{cancelling.distribution_center?.name}</strong>.
          {cancelling.status === 'in_progress' && ' They have already started collecting, so please call them.'}
        </ConfirmDialog>
      )}
    </Card>
  )
}

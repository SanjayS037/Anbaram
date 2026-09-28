import { CheckCircle2, Truck } from 'lucide-react'
import { Card, CardBody, CardHeader } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Detail, DetailList } from '../../components/ui/DetailList'
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/States'
import { TableShell, Th, theadClass } from '../../components/ui/Table'
import { ConditionBadge, ShipmentStatusBadge } from '../../components/domain/StatusBadges'
import { PhotoThumb } from '../../components/domain/PhotoThumb'
import { Drawer } from '../../components/ui/Drawer'
import { useShipment } from '../../hooks/useShipments'
import { CATEGORIES } from '../../utils/categories'
import { formatDateTime, formatKg } from '../../utils/format'
import { issueTypeLabel } from '../../utils/labels'
import { cn } from '../../utils/cn'

function Timeline({ s }) {
  const steps = [
    {
      done: true,
      icon: Truck,
      title: 'Sent',
      when: s.dispatched_at,
      by: s.logged_by?.full_name,
      place: s.collection_point?.name,
    },
    {
      done: s.status === 'received',
      icon: CheckCircle2,
      title: s.status === 'received' ? 'Received and checked' : 'Not received yet',
      when: s.received_at,
      by: s.received_by?.full_name,
      place: s.distribution_center?.name,
    },
  ]
  return (
    <ol className="grid gap-3 sm:grid-cols-2">
      {steps.map((step) => (
        <li
          key={step.title}
          className={cn(
            'flex gap-3 rounded-md border px-4 py-3',
            step.done ? 'border-brand-200 bg-brand-50/60' : 'border-dashed border-line',
          )}
        >
          <step.icon
            className={cn('mt-0.5 size-5 shrink-0', step.done ? 'text-brand-700' : 'text-muted')}
            aria-hidden
          />
          <div className="min-w-0 text-sm">
            <p className="font-semibold">{step.title}</p>
            <p className="text-muted">{step.place ?? '—'}</p>
            {step.done && (
              <p className="text-xs text-muted">
                {formatDateTime(step.when)}
                {step.by && <> · {step.by}</>}
              </p>
            )}
          </div>
        </li>
      ))}
    </ol>
  )
}

/** Full details of one shipment (batch), as a side panel. Can open over any page. */
export function BatchPanel({ shipmentId, onClose }) {
  const shipment = useShipment(shipmentId)

  if (shipment.isPending || shipment.isError) {
    return (
      <Drawer open onClose={onClose} title={shipment.isError ? 'Shipment' : 'Loading…'}>
        {shipment.isError ? (
          <ErrorState
            title="Could not load this shipment"
            error={shipment.error}
            onRetry={() => void shipment.refetch()}
          />
        ) : (
          <>
            <Skeleton className="h-24" />
            <Skeleton className="h-72" />
          </>
        )}
      </Drawer>
    )
  }

  const s = shipment.data
  const total = Number(s.total_kg) || 0

  return (
    <Drawer
      open
      onClose={onClose}
      title={
        <>
          {s.batch_code ?? 'Shipment'}
          <span className="ml-3 font-sans text-base font-semibold text-muted tabular-nums">{formatKg(total)}</span>
        </>
      }
      subtitle={
        <>
          <ShipmentStatusBadge status={s.status} />
          {s.condition && <ConditionBadge condition={s.condition} />}
        </>
      }
    >
      <Timeline s={s} />

      <div className="space-y-5">
        <Card>
          <CardHeader title="Items and weight" subtitle="Weighed at the collection point, with photos" />
          <CardBody className="px-0">
            <TableShell minWidth={520}>
              <thead className={theadClass}>
                <tr>
                  <Th className="pl-5">Item</Th>
                  <Th className="text-right">Weight</Th>
                  <Th>Part</Th>
                  <Th className="pr-5">Photo</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {CATEGORIES.map((c) => {
                  const kg = Number(s[`${c.key}_kg`])
                  const photo = s[`${c.key}_photo_url`]
                  return (
                    <tr key={c.key} className={kg === 0 ? 'text-muted' : undefined}>
                      <td className="py-2.5 pr-4 pl-5">
                        <span className="flex items-center gap-2">
                          <span className="size-2.5 rounded-sm" style={{ background: c.color }} aria-hidden />
                          {c.label}
                          {c.key === 'other' && s.other_label && (
                            <span className="text-xs text-muted">({s.other_label})</span>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right font-semibold tabular-nums">{formatKg(kg)}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-brand-50" aria-hidden>
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${total ? (kg / total) * 100 : 0}%`, background: c.color }}
                            />
                          </div>
                          <span className="text-xs tabular-nums">{total ? ((kg / total) * 100).toFixed(0) : 0}%</span>
                        </div>
                      </td>
                      <td className="py-2 pr-5 pl-4">
                        {kg > 0 || photo ? (
                          <PhotoThumb url={photo} alt={`${c.label} photo for ${s.batch_code}`} className="size-12" />
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </TableShell>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Received at the distribution center" subtitle="Checked by the officer who received it" />
          <CardBody>
            {s.status === 'received' ? (
              <div className="space-y-4">
                <DetailList className="lg:grid-cols-2">
                  <Detail label="Received by">
                    {s.received_by ? <span className="font-semibold">{s.received_by.full_name}</span> : '—'}
                  </Detail>
                  <Detail label="Received at">{formatDateTime(s.received_at)}</Detail>
                  <Detail label="Condition">
                    <ConditionBadge condition={s.condition} />
                  </Detail>
                  <Detail label="Note about condition">{s.condition_note || '—'}</Detail>
                </DetailList>
                <div>
                  <p className="text-[11px] font-semibold tracking-wide text-muted uppercase">Photo when received</p>
                  <PhotoThumb
                    url={s.received_photo_url}
                    alt={`Receiving photo for ${s.batch_code}`}
                    className="mt-1 h-40 w-full max-w-xs"
                  />
                </div>
              </div>
            ) : (
              <EmptyState
                title="Not received yet"
                description={`Waiting to be received at ${s.distribution_center?.name ?? 'the distribution center'}.`}
              />
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="Sending details" />
        <CardBody>
          <DetailList className="lg:grid-cols-2">
            <Detail label="From">
              {s.collection_point ? <span className="font-semibold">{s.collection_point.name}</span> : '—'}
              {s.collection_point && <p className="text-xs text-muted">{s.collection_point.address}</p>}
            </Detail>
            <Detail label="To">
              {s.distribution_center ? <span className="font-semibold">{s.distribution_center.name}</span> : '—'}
              {s.distribution_center && <p className="text-xs text-muted">{s.distribution_center.address}</p>}
            </Detail>
            <Detail label="Entered by">{s.logged_by ? <span>{s.logged_by.full_name}</span> : '—'}</Detail>
            <Detail label="Sent on">{formatDateTime(s.dispatched_at)}</Detail>
            <Detail label="Driver / carried by">{s.delivered_by_name}</Detail>
            <Detail label="Vehicle number">
              <span className="font-mono">{s.vehicle_number}</span>
            </Detail>
            {s.collection_request_id && (
              <Detail label="Why it was sent">
                <span className="font-semibold">To fill a distribution center request</span>
              </Detail>
            )}
          </DetailList>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Flags" />
        <CardBody>
          {!s.flags.length ? (
            <p className="text-sm text-muted">No flags for this shipment.</p>
          ) : (
            <ul className="divide-y divide-line">
              {s.flags.map((f) => (
                <li key={f.id} className="flex flex-wrap items-start gap-3 py-3">
                  <Badge tone={f.issue_type === 'damaged' ? 'danger' : 'warning'}>{issueTypeLabel(f.issue_type)}</Badge>
                  <div className="min-w-0 flex-1 text-sm">
                    <p>{f.note || <span className="text-muted">No note</span>}</p>
                    <p className="text-xs text-muted">
                      Reported {formatDateTime(f.created_at)}
                      {f.raised_by && <> by {f.raised_by.full_name}</>}
                    </p>
                    {f.status === 'resolved' && (
                      <p className="mt-1 text-xs text-emerald-800">
                        Done {formatDateTime(f.resolved_at)}
                        {f.resolver && <> by {f.resolver.full_name}</>}: {f.resolution_note}
                      </p>
                    )}
                  </div>
                  <Badge tone={f.status === 'open' ? 'warning' : 'success'}>
                    {f.status === 'open' ? 'Open' : 'Done'}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </Drawer>
  )
}

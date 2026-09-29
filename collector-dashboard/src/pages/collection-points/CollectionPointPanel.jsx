import { useState } from 'react'
import { Archive, CalendarClock, Package, Pencil, Power, Trash2, RefreshCcw } from 'lucide-react'
import { Drawer } from '../../components/ui/Drawer'
import { Card, CardBody, CardHeader } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Detail, DetailList } from '../../components/ui/DetailList'
import { ErrorState, Skeleton } from '../../components/ui/States'
import { ComplianceBadge, LocationStatusBadge } from '../../components/domain/StatusBadges'
import { LocationFormDialog } from '../../components/domain/LocationFormDialog'
import { DeleteLocationDialog } from '../../components/domain/DeleteLocationDialog'
import { OfficerAssignmentCard } from '../../components/domain/OfficerAssignmentCard'
import { ShipmentHistoryCard } from '../../components/domain/ShipmentHistoryCard'
import { LocationPhotoCard } from '../../components/domain/LocationPhotoCard'
import { StatTile } from '../../components/domain/StatTile'
import { OpenRequestsCard } from './OpenRequestsCard'
import { useCollectionPoint, useLocationTotals, useSetLocationStatus } from '../../hooks/useLocations'
import { getCompliance } from '../../utils/compliance'
import { formatDate, formatNumber } from '../../utils/format'

/** Everything about one collection point, in a side panel over the list. */
export function CollectionPointPanel({ pointId, onClose }) {
  const point = useCollectionPoint(pointId)
  const totals = useLocationTotals('collection_point', pointId)
  const setStatus = useSetLocationStatus()
  const [dialog, setDialog] = useState(null)

  if (point.isPending || point.isError) {
    return (
      <Drawer open onClose={onClose} title={point.isError ? 'Collection point' : 'Loading…'}>
        {point.isError ? (
          <ErrorState
            title="Could not load this collection point"
            error={point.error}
            onRetry={() => void point.refetch()}
          />
        ) : (
          <>
            <Skeleton className="h-28" />
            <Skeleton className="h-64" />
          </>
        )}
      </Drawer>
    )
  }

  const p = point.data
  const compliance = getCompliance(p.last_collected_at, p.cycle_frequency_days)
  const active = p.status === 'active'

  return (
    <Drawer
      open
      onClose={onClose}
      title={
        <>
          {p.name}
          {p.short_code && <span className="ml-2 font-sans text-sm font-semibold text-muted">{p.short_code}</span>}
        </>
      }
      subtitle={
        <>
          <LocationStatusBadge status={p.status} />
          {active && <ComplianceBadge result={compliance} />}
        </>
      }
      actions={
        <>
          <Button size="sm" variant="secondary" onClick={() => setDialog('edit')}>
            <Pencil className="size-4" aria-hidden /> Edit
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setDialog('status')}
            className={active ? 'text-red-800' : undefined}
          >
            <Power className="size-4" aria-hidden /> {active ? 'Mark as closed' : 'Mark as open'}
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setDialog('delete')} className="text-red-800">
            <Trash2 className="size-4" aria-hidden /> Delete
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <StatTile
          label="Total collected"
          value={formatNumber(Math.round(totals.data?.total_kg ?? 0))}
          unit="kg"
          icon={Archive}
          loading={totals.isPending}
        />
        <StatTile
          label="Shipments sent"
          value={formatNumber(totals.data?.total_shipments)}
          icon={Package}
          loading={totals.isPending}
        />
        <StatTile label="Collect every" value={String(p.cycle_frequency_days)} unit="days" icon={RefreshCcw} />
        <StatTile
          label="Next collection"
          value={compliance.dueDate ? formatDate(compliance.dueDate.toISOString()) : 'Not yet'}
          icon={CalendarClock}
          tone={compliance.state === 'overdue' ? 'alert' : 'brand'}
        />
      </div>

      <Card>
        <CardHeader title="Details" />
        <CardBody>
          <div className="flex gap-4">
            <DetailList className="flex-1 lg:grid-cols-2">
              <Detail label="Address" className="sm:col-span-2">
                {p.address}
              </Detail>
              <Detail label="Taluk">{p.zone ?? '—'}</Detail>
              <Detail label="Usually sends to">{p.default_dc?.name ?? '—'}</Detail>
              <Detail label="Last collected">{formatDate(p.last_collected_at)}</Detail>
              <Detail label="Added">{formatDate(p.created_at)}</Detail>
              <Detail label="Other contact person">{p.contact_person_name ?? '—'}</Detail>
              <Detail label="Their phone number">
                {p.contact_person_phone ? (
                  <a href={`tel:${p.contact_person_phone}`} className="hover:underline">
                    {p.contact_person_phone}
                  </a>
                ) : (
                  '—'
                )}
              </Detail>
            </DetailList>
          </div>
        </CardBody>
      </Card>

      <LocationPhotoCard type="collection_point" location={p} />
      <OfficerAssignmentCard type="collection_point" location={p} />
      <OpenRequestsCard point={p} />
      <ShipmentHistoryCard type="collection_point" locationId={p.id} />

      {dialog === 'edit' && <LocationFormDialog type="collection_point" existing={p} onClose={() => setDialog(null)} />}
      <ConfirmDialog
        open={dialog === 'status'}
        onClose={() => setDialog(null)}
        busy={setStatus.isPending}
        tone={active ? 'danger' : 'primary'}
        title={active ? `Close ${p.name}?` : `Open ${p.name} again?`}
        confirmLabel={active ? 'Mark as closed' : 'Mark as open'}
        onConfirm={() =>
          setStatus.mutate(
            { type: 'collection_point', id: p.id, active: !active, name: p.name },
            { onSuccess: () => setDialog(null) },
          )
        }
      >
        {active ? (
          <>
            It will not be counted or checked for late collections. Its old shipments are kept.
            {p.officer && (
              <> {p.officer.full_name} is still its officer. Remove the officer too if they should stop using it.</>
            )}
          </>
        ) : (
          'It will be counted and checked for late collections again.'
        )}
      </ConfirmDialog>
      {dialog === 'delete' && (
        <DeleteLocationDialog
          open
          type="collection_point"
          location={p}
          shipmentCount={totals.data?.total_shipments ?? 0}
          onClose={() => setDialog(null)}
          onDeleted={onClose}
        />
      )}
    </Drawer>
  )
}

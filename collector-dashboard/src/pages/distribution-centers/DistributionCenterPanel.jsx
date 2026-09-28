import { useState } from 'react'
import { Archive, PackageCheck, Pencil, Power, Truck } from 'lucide-react'
import { Drawer } from '../../components/ui/Drawer'
import { Card, CardBody, CardHeader } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Detail, DetailList } from '../../components/ui/DetailList'
import { ErrorState, Skeleton } from '../../components/ui/States'
import { LocationStatusBadge } from '../../components/domain/StatusBadges'
import { LocationFormDialog } from '../../components/domain/LocationFormDialog'
import { OfficerAssignmentCard } from '../../components/domain/OfficerAssignmentCard'
import { ShipmentHistoryCard } from '../../components/domain/ShipmentHistoryCard'
import { LocationPhotoCard } from '../../components/domain/LocationPhotoCard'
import { StatTile } from '../../components/domain/StatTile'
import { StockStatusCard } from './StockStatusCard'
import { useDistributionCenter, useLocationTotals, useSetLocationStatus } from '../../hooks/useLocations'
import { useShipmentCount } from '../../hooks/useShipments'
import { formatDate, formatNumber } from '../../utils/format'

/** Everything about one distribution center, in a side panel over the list. */
export function DistributionCenterPanel({ centerId, onClose }) {
  const center = useDistributionCenter(centerId)
  const totals = useLocationTotals('distribution_center', centerId)
  const awaiting = useShipmentCount({ distributionCenterId: centerId, status: 'dispatched' })
  const reconciled = useShipmentCount({ distributionCenterId: centerId, status: 'received' })
  const setStatus = useSetLocationStatus()
  const [dialog, setDialog] = useState(null)

  if (center.isPending || center.isError) {
    return (
      <Drawer open onClose={onClose} title={center.isError ? 'Distribution center' : 'Loading…'}>
        {center.isError ? (
          <ErrorState
            title="Could not load this distribution center"
            error={center.error}
            onRetry={() => void center.refetch()}
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

  const c = center.data
  const active = c.status === 'active'

  return (
    <Drawer
      open
      onClose={onClose}
      title={
        <>
          {c.name}
          {c.short_code && <span className="ml-2 font-sans text-sm font-semibold text-muted">{c.short_code}</span>}
        </>
      }
      subtitle={<LocationStatusBadge status={c.status} />}
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
        </>
      }
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile
          label="Total sent here"
          value={formatNumber(Math.round(totals.data?.total_kg ?? 0))}
          unit="kg"
          icon={Archive}
          loading={totals.isPending}
        />
        <StatTile
          label="On the way"
          value={formatNumber(awaiting.data)}
          icon={Truck}
          loading={awaiting.isPending}
          tone={awaiting.data ? 'alert' : 'brand'}
        />
        <StatTile
          label="Received"
          value={formatNumber(reconciled.data)}
          icon={PackageCheck}
          loading={reconciled.isPending}
        />
      </div>

      <Card>
        <CardHeader title="Details" />
        <CardBody>
          <div className="flex gap-4">
            <DetailList className="flex-1 lg:grid-cols-2">
              <Detail label="Address" className="sm:col-span-2">
                {c.address}
              </Detail>
              <Detail label="Other contact person">{c.contact_person_name ?? '—'}</Detail>
              <Detail label="Their phone number">
                {c.contact_person_phone ? (
                  <a href={`tel:${c.contact_person_phone}`} className="hover:underline">
                    {c.contact_person_phone}
                  </a>
                ) : (
                  '—'
                )}
              </Detail>
              <Detail label="Added">{formatDate(c.created_at)}</Detail>
            </DetailList>
          </div>
        </CardBody>
      </Card>

      <LocationPhotoCard type="distribution_center" location={c} />
      <OfficerAssignmentCard type="distribution_center" location={c} />
      <StockStatusCard centerId={c.id} />
      <ShipmentHistoryCard type="distribution_center" locationId={c.id} />

      {dialog === 'edit' && (
        <LocationFormDialog type="distribution_center" existing={c} onClose={() => setDialog(null)} />
      )}
      <ConfirmDialog
        open={dialog === 'status'}
        onClose={() => setDialog(null)}
        busy={setStatus.isPending}
        tone={active ? 'danger' : 'primary'}
        title={active ? `Close ${c.name}?` : `Open ${c.name} again?`}
        confirmLabel={active ? 'Mark as closed' : 'Mark as open'}
        onConfirm={() =>
          setStatus.mutate(
            { type: 'distribution_center', id: c.id, active: !active, name: c.name },
            { onSuccess: () => setDialog(null) },
          )
        }
      >
        {active ? (
          <>
            Collection point officers will not be able to send items here. Items already on the way can still be
            received.
            {awaiting.data ? (
              <> There {awaiting.data === 1 ? 'is 1 shipment' : `are ${awaiting.data} shipments`} on the way.</>
            ) : null}
          </>
        ) : (
          'Collection point officers will be able to send items here again.'
        )}
      </ConfirmDialog>
    </Drawer>
  )
}

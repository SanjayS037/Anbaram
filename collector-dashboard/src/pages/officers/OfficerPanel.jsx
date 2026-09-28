import { Drawer } from '../../components/ui/Drawer'
import { Card, CardBody } from '../../components/ui/Card'
import { Detail, DetailList } from '../../components/ui/DetailList'
import { ErrorState, Skeleton } from '../../components/ui/States'
import { OfficerStatusBadge, RoleBadge } from '../../components/domain/StatusBadges'
import { useOfficer } from '../../hooks/useOfficers'
import { formatDateTime, initials } from '../../utils/format'
import { OfficerActions } from './OfficerActions'

/** One officer's full registration details and the actions for their current status. */
export function OfficerPanel({ officerId, onClose }) {
  const { data: officer, isPending, isError, error, refetch } = useOfficer(officerId)

  if (isPending || isError) {
    return (
      <Drawer open onClose={onClose} width="md" title={isError ? 'Officer' : 'Loading…'}>
        {isError ? (
          <ErrorState title="Could not load this officer" error={error} onRetry={() => void refetch()} />
        ) : (
          <Skeleton className="h-64" />
        )}
      </Drawer>
    )
  }

  const location = officer.collection_point ?? officer.distribution_center

  return (
    <Drawer
      open
      onClose={onClose}
      width="md"
      title={officer.full_name}
      subtitle={
        <>
          <OfficerStatusBadge status={officer.status} />
          <RoleBadge role={officer.role} />
        </>
      }
    >
      <div className="flex items-center gap-4">
        <span className="grid size-14 shrink-0 place-items-center rounded-full bg-brand-700 text-lg font-bold text-white">
          {initials(officer.full_name)}
        </span>
        <OfficerActions officer={officer} size="md" />
      </div>

      <Card>
        <CardBody className="pt-5">
          <DetailList className="lg:grid-cols-2">
            <Detail label="Phone">
              <a href={`tel:${officer.phone}`} className="hover:underline">
                {officer.phone}
              </a>
            </Detail>
            <Detail label="Email">
              <a href={`mailto:${officer.email}`} className="hover:underline">
                {officer.email}
              </a>
            </Detail>
            <Detail label="Office">{officer.organization_name}</Detail>
            <Detail label="Joined on">{formatDateTime(officer.created_at)}</Detail>
            <Detail label="Place">
              {location ? (
                <span className="font-semibold">
                  {location.name}
                  {location.short_code && <span className="ml-1 font-normal text-muted">({location.short_code})</span>}
                </span>
              ) : officer.status === 'approved' ? (
                <span className="font-semibold text-amber-800">No place yet. Use Move to give them a place.</span>
              ) : (
                <span className="text-muted">—</span>
              )}
            </Detail>
            {officer.approved_at && (
              <Detail label="Approved">
                {formatDateTime(officer.approved_at)}
                {officer.approver && <span className="text-muted"> by {officer.approver.full_name}</span>}
              </Detail>
            )}
            {officer.status === 'rejected' && (
              <Detail
                label={
                  officer.rejected_reason?.startsWith('Removed:') ? 'Why they were removed' : 'Why they were rejected'
                }
                className="sm:col-span-2"
              >
                {officer.rejected_reason ?? '—'}
              </Detail>
            )}
          </DetailList>
        </CardBody>
      </Card>
    </Drawer>
  )
}

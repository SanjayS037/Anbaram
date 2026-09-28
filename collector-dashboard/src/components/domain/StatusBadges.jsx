import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  CircleDashed,
  Clock,
  Hourglass,
  PackageSearch,
  Truck,
  Warehouse,
  XCircle,
} from 'lucide-react'
import { Badge } from '../ui/Badge'
import { CONDITION_LABELS, OFFICER_STATUS_LABELS, REQUEST_STATUS_LABELS, ROLE_LABELS } from '../../utils/labels'

const iconClass = 'mr-1 size-3'

export function ShipmentStatusBadge({ status }) {
  return status === 'received' ? (
    <Badge tone="success">
      <CheckCircle2 className={iconClass} aria-hidden />
      Received
    </Badge>
  ) : (
    <Badge tone="info">
      <Truck className={iconClass} aria-hidden />
      On the way
    </Badge>
  )
}

const conditionTone = {
  good: 'success',
  slightly_damaged: 'warning',
  damaged: 'danger',
}

export function ConditionBadge({ condition }) {
  if (!condition) return <span className="text-xs text-muted">—</span>
  return <Badge tone={conditionTone[condition]}>{CONDITION_LABELS[condition]}</Badge>
}

export function ComplianceBadge({ result }) {
  switch (result.state) {
    case 'overdue':
      return (
        <Badge tone="danger">
          <AlertTriangle className={iconClass} aria-hidden />
          Late by {Math.abs(result.daysUntilDue ?? 0)} {Math.abs(result.daysUntilDue ?? 0) === 1 ? 'day' : 'days'}
        </Badge>
      )
    case 'never':
      return (
        <Badge tone="neutral">
          <CircleDashed className={iconClass} aria-hidden />
          Not collected yet
        </Badge>
      )
    case 'due_soon':
      return (
        <Badge tone="warning">
          <Clock className={iconClass} aria-hidden />
          {result.daysUntilDue === 0
            ? 'Due today'
            : `Due in ${result.daysUntilDue} ${result.daysUntilDue === 1 ? 'day' : 'days'}`}
        </Badge>
      )
    case 'on_schedule':
      return (
        <Badge tone="success">
          <CheckCircle2 className={iconClass} aria-hidden />
          On time
        </Badge>
      )
  }
}

const officerStatusMeta = {
  pending: { tone: 'warning', icon: Hourglass },
  approved: { tone: 'success', icon: CheckCircle2 },
  rejected: { tone: 'danger', icon: Ban },
}

export function OfficerStatusBadge({ status }) {
  const { tone, icon: Icon } = officerStatusMeta[status]
  return (
    <Badge tone={tone}>
      <Icon className={iconClass} aria-hidden />
      {OFFICER_STATUS_LABELS[status]}
    </Badge>
  )
}

export function RoleBadge({ role }) {
  const Icon = role === 'collection_point' ? Warehouse : Truck
  return (
    <Badge tone={role === 'collection_point' ? 'brand' : 'info'}>
      <Icon className={iconClass} aria-hidden />
      {ROLE_LABELS[role]}
    </Badge>
  )
}

export function LocationStatusBadge({ status }) {
  return status === 'active' ? <Badge tone="success">Open</Badge> : <Badge tone="neutral">Closed</Badge>
}

const requestStatusMeta = {
  pending: { tone: 'warning', icon: PackageSearch },
  in_progress: { tone: 'info', icon: Truck },
  completed: { tone: 'success', icon: CheckCircle2 },
  cancelled: { tone: 'neutral', icon: XCircle },
}

/** Collection request state. "Requested" = waiting for the officer, "Collecting" = officer has started. */
export function RequestStatusBadge({ status }) {
  const { tone, icon: Icon } = requestStatusMeta[status]
  return (
    <Badge tone={tone}>
      <Icon className={iconClass} aria-hidden />
      {REQUEST_STATUS_LABELS[status]}
    </Badge>
  )
}

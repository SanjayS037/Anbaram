import { useMemo } from 'react'
import { Link } from 'react-router'
import { Card, CardBody, CardHeader } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { EmptyState, Skeleton } from '../../components/ui/States'
import { ComplianceBadge } from '../../components/domain/StatusBadges'
import { complianceRank, getCompliance } from '../../utils/compliance'
import { formatDate } from '../../utils/format'

const VISIBLE_ROWS = 6

export function ComplianceCard({ points, loading }) {
  const rows = useMemo(
    () =>
      (points ?? [])
        .map((p) => ({ ...p, compliance: getCompliance(p.last_collected_at, p.cycle_frequency_days) }))
        .sort(
          (a, b) =>
            complianceRank[a.compliance.state] - complianceRank[b.compliance.state] ||
            (a.compliance.daysUntilDue ?? 0) - (b.compliance.daysUntilDue ?? 0),
        ),
    [points],
  )
  const attention = rows.filter((r) => r.compliance.state === 'overdue' || r.compliance.state === 'never').length

  return (
    <Card>
      <CardHeader
        title="Collection schedule"
        subtitle="Is each collection point being collected on time?"
        action={attention > 0 && <Badge tone="danger">{attention} need action</Badge>}
      />
      <CardBody>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-11" />
            ))}
          </div>
        ) : !rows.length ? (
          <EmptyState title="No open collection points" />
        ) : (
          <ul className="divide-y divide-line">
            {rows.slice(0, VISIBLE_ROWS).map((p) => (
              <li key={p.id} className="flex items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {p.name}
                    {p.short_code && <span className="ml-1 font-normal text-muted">({p.short_code})</span>}
                  </p>
                  <p className="truncate text-xs text-muted">
                    {p.officer_name ?? 'No officer yet'} · Last collected {formatDate(p.last_collected_at)}
                  </p>
                </div>
                <ComplianceBadge result={p.compliance} />
              </li>
            ))}
          </ul>
        )}
        {rows.length > VISIBLE_ROWS && (
          <Link
            to="/collection-points"
            className="mt-3 inline-block text-xs font-semibold text-brand-700 hover:underline"
          >
            View all {rows.length} collection points
          </Link>
        )}
      </CardBody>
    </Card>
  )
}

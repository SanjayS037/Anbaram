import { useState } from 'react'
import { Link } from 'react-router'
import { ArrowRight, PackageCheck, Truck, TriangleAlert } from 'lucide-react'
import { Card, CardBody, CardHeader } from '../../components/ui/Card'
import { EmptyState, Skeleton } from '../../components/ui/States'
import { formatKg, formatRelative } from '../../utils/format'
import { BatchPanel } from '../batches/BatchPanel'

function describe(s) {
  if (s.status === 'dispatched') {
    return {
      icon: Truck,
      iconClass: 'text-sky-700 bg-sky-50',
      text: `sent from ${s.collection_point_name} to ${s.distribution_center_name}`,
      when: s.dispatched_at,
    }
  }
  const damaged = s.condition === 'damaged' || s.condition === 'slightly_damaged'
  return {
    icon: damaged ? TriangleAlert : PackageCheck,
    iconClass: damaged ? 'text-amber-800 bg-amber-50' : 'text-brand-700 bg-brand-50',
    text: `received at ${s.distribution_center_name}${damaged ? ' (arrived damaged)' : ''}`,
    when: s.received_at ?? s.dispatched_at,
  }
}

export function RecentActivityCard({ shipments, loading }) {
  const [openBatch, setOpenBatch] = useState(null)
  return (
    <Card>
      <CardHeader title="Latest shipments" subtitle="Shipments sent and received recently" />
      <CardBody>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-9" />
            ))}
          </div>
        ) : !shipments?.length ? (
          <EmptyState title="No shipments yet" description="Shipments show here when a collection point sends items." />
        ) : (
          <ul className="divide-y divide-line">
            {shipments.map((s) => {
              const { icon: Icon, iconClass, text, when } = describe(s)
              return (
                <li key={s.id} className="flex items-center gap-3 py-2.5">
                  <span className={`grid size-8 shrink-0 place-items-center rounded-md ${iconClass}`}>
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <p className="min-w-0 flex-1 truncate text-sm">
                    <button
                      type="button"
                      onClick={() => setOpenBatch(s.id)}
                      className="font-semibold text-brand-800 hover:underline"
                    >
                      {s.batch_code ?? 'Shipment'}
                    </button>{' '}
                    <span className="text-muted">
                      ({formatKg(s.total_kg)}) {text}
                    </span>
                  </p>
                  <time dateTime={when} className="shrink-0 text-xs text-muted">
                    {formatRelative(when)}
                  </time>
                </li>
              )
            })}
          </ul>
        )}
        <Link
          to="/batches"
          className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline"
        >
          See all shipments <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </CardBody>
      {openBatch && <BatchPanel shipmentId={openBatch} onClose={() => setOpenBatch(null)} />}
    </Card>
  )
}

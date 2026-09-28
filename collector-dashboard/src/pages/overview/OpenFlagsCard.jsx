import { useState } from 'react'
import { Link } from 'react-router'
import { Card, CardBody, CardHeader } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { EmptyState, Skeleton } from '../../components/ui/States'
import { issueTypeLabel } from '../../utils/labels'
import { formatDate } from '../../utils/format'
import { BatchPanel } from '../batches/BatchPanel'

export function OpenFlagsCard({ flags, total, loading }) {
  const [openBatch, setOpenBatch] = useState(null)
  return (
    <Card>
      <CardHeader
        title="Open flags"
        subtitle="Created by itself when a shipment arrives damaged"
        action={
          <Link to="/flags" className="text-xs font-semibold text-brand-700 hover:underline">
            See all flags
          </Link>
        }
      />
      <CardBody className="px-0">
        {loading ? (
          <div className="space-y-2 px-5">
            <Skeleton className="h-8" />
            <Skeleton className="h-8" />
          </div>
        ) : !flags?.length ? (
          <EmptyState title="No open flags" description="All received shipments arrived in good condition." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-y border-line bg-brand-50/60 text-[11px] tracking-wide text-muted uppercase">
                <tr>
                  <th scope="col" className="px-5 py-2 font-semibold">
                    Shipment No.
                  </th>
                  <th scope="col" className="px-3 py-2 font-semibold">
                    Reason
                  </th>
                  <th scope="col" className="px-3 py-2 font-semibold">
                    From → To
                  </th>
                  <th scope="col" className="px-3 py-2 font-semibold">
                    Note
                  </th>
                  <th scope="col" className="px-5 py-2 text-right font-semibold">
                    Reported
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {flags.map((f) => (
                  <tr key={f.id} className="hover:bg-brand-50/40">
                    <td className="px-5 py-2.5 font-semibold whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setOpenBatch(f.shipment_id)}
                        className="text-brand-800 hover:underline"
                      >
                        {f.batch_code ?? '—'}
                      </button>
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge tone={f.issue_type === 'damaged' ? 'danger' : 'warning'}>
                        {issueTypeLabel(f.issue_type)}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5 text-muted">
                      {f.collection_point_name} → {f.distribution_center_name}
                    </td>
                    <td className="max-w-xs truncate px-3 py-2.5 text-muted">{f.note ?? '—'}</td>
                    <td className="px-5 py-2.5 text-right whitespace-nowrap text-muted">{formatDate(f.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {total !== undefined && total > flags.length && (
              <p className="px-5 pt-3 text-xs text-muted">
                Showing {flags.length} of {total}.{' '}
                <Link to="/flags" className="font-semibold text-brand-700 hover:underline">
                  View all
                </Link>
              </p>
            )}
          </div>
        )}
      </CardBody>
      {openBatch && <BatchPanel shipmentId={openBatch} onClose={() => setOpenBatch(null)} />}
    </Card>
  )
}

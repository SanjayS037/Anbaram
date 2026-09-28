import { Card, CardBody, CardHeader } from '../../components/ui/Card'
import { ErrorState, Skeleton } from '../../components/ui/States'
import { useCenterStock, useOpenRequestSummaries } from '../../hooks/useRequests'
import { cn } from '../../utils/cn'
import { formatRelative } from '../../utils/format'

/**
 * Stock state reported by the center's officer (inventory_status). The center is
 * out of stock when anything is marked out; that arrives as one request on the
 * Requests page.
 */
export function StockStatusCard({ centerId }) {
  const stock = useCenterStock(centerId)
  const open = useOpenRequestSummaries()

  const rows = stock.data ?? []
  const isOut = rows.some((s) => s.is_out_of_stock)
  const latest = [...rows].sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0]
  const assignedTo = open.data?.find((r) => r.distribution_center_id === centerId)?.collection_point?.name

  return (
    <Card>
      <CardHeader title="Stock" subtitle="Updated by this center's officer in the app" />
      <CardBody>
        {stock.isError ? (
          <ErrorState error={stock.error} onRetry={() => void stock.refetch()} />
        ) : stock.isPending ? (
          <Skeleton className="h-16" />
        ) : (
          <div
            className={cn(
              'rounded-md border px-4 py-3',
              isOut ? 'border-red-200 bg-red-50/70' : 'border-line bg-surface',
            )}
          >
            <p className={cn('font-semibold', isOut ? 'text-red-800' : latest ? 'text-emerald-800' : 'text-muted')}>
              {isOut ? 'Out of stock' : latest ? 'Available' : 'No update'}
            </p>
            {latest && <p className="text-xs text-muted">updated {formatRelative(latest.updated_at)}</p>}
            {isOut &&
              (assignedTo ? (
                <p className="mt-1 text-xs font-semibold text-sky-800">Assigned to {assignedTo}</p>
              ) : (
                <p className="mt-1 text-xs font-semibold text-red-800">Waiting. Assign it on the Requests page.</p>
              ))}
          </div>
        )}
      </CardBody>
    </Card>
  )
}

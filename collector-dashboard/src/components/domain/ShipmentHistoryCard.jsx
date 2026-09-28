import { useState } from 'react'
import { Card, CardHeader } from '../ui/Card'
import { Tabs } from '../ui/Tabs'
import { EmptyState, ErrorState, Skeleton } from '../ui/States'
import { Pagination } from '../ui/Table'
import { ShipmentTable } from './ShipmentTable'
import { BatchPanel } from '../../pages/batches/BatchPanel'
import { useShipmentList } from '../../hooks/useShipments'
const PAGE_SIZE = 10

/** Shipment history for one collection point or distribution center. */
export function ShipmentHistoryCard({ type, locationId }) {
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState({ column: 'dispatched_at', ascending: false })
  const isCp = type === 'collection_point'
  const filters = isCp ? { collectionPointId: locationId, status } : { distributionCenterId: locationId, status }
  const list = useShipmentList({ filters, page, pageSize: PAGE_SIZE, sort })
  const [openBatch, setOpenBatch] = useState(null)

  return (
    <Card>
      <CardHeader
        title="Shipment history"
        subtitle={
          isCp
            ? 'Shipments sent from this point. Click one to see more.'
            : 'Shipments sent to this center. Click one to see more.'
        }
      />
      <div className="px-4 pt-2">
        <Tabs
          label="Shipment status"
          value={status}
          onChange={(value) => {
            setStatus(value)
            setPage(1)
          }}
          items={[
            { value: 'all', label: 'All' },
            { value: 'dispatched', label: 'On the way' },
            { value: 'received', label: 'Received' },
          ]}
        />
      </div>
      {list.isError ? (
        <ErrorState error={list.error} onRetry={() => void list.refetch()} />
      ) : list.isPending ? (
        <div className="space-y-2 p-4">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </div>
      ) : !list.data.rows.length ? (
        <EmptyState
          title={status === 'all' ? 'No shipments yet' : 'No shipments here'}
          description={
            isCp
              ? 'Shipments show here when the officer sends items from the app.'
              : 'Shipments show here when a collection point sends items to this center.'
          }
        />
      ) : (
        <div className={list.isPlaceholderData ? 'opacity-60' : undefined}>
          <ShipmentTable
            rows={list.data.rows}
            sort={sort}
            onSort={(s) => {
              setSort(s)
              setPage(1)
            }}
            hide={[type, 'items']}
            onOpen={setOpenBatch}
          />
          <Pagination page={page} pageSize={PAGE_SIZE} total={list.data.total} onPageChange={setPage} />
        </div>
      )}
      {openBatch && <BatchPanel shipmentId={openBatch} onClose={() => setOpenBatch(null)} />}
    </Card>
  )
}

import { Archive, Flag, Truck, Warehouse } from 'lucide-react'
import { useOverview } from '../../hooks/useOverview'
import { StatTile } from '../../components/domain/StatTile'
import { Card, CardBody, CardHeader } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { ErrorState, Skeleton } from '../../components/ui/States'
import { CategoryBarChart } from '../../charts/CategoryBarChart'
import { TrendAreaChart } from '../../charts/TrendAreaChart'
import { formatKg, formatNumber } from '../../utils/format'
import { RecentActivityCard } from './RecentActivityCard'
import { ComplianceCard } from './ComplianceCard'
import { OpenFlagsCard } from './OpenFlagsCard'

export function OverviewPage() {
  const { data, isPending, isError, error, refetch } = useOverview()

  if (isError) {
    return (
      <Card>
        <ErrorState title="Could not load the Home page" error={error} onRetry={() => void refetch()} />
      </Card>
    )
  }

  const totalKg = data?.totalsByCategory.reduce((sum, row) => sum + Number(row.total_kg), 0) ?? 0

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Total collected"
          value={formatNumber(Math.round(totalKg))}
          unit="kg"
          icon={Archive}
          loading={isPending}
        />
        <StatTile
          label="Open collection points"
          value={formatNumber(data?.activeCollectionPoints)}
          icon={Warehouse}
          loading={isPending}
        />
        <StatTile
          label="Open distribution centers"
          value={formatNumber(data?.activeDistributionCenters)}
          icon={Truck}
          loading={isPending}
        />
        <StatTile
          label="Open flags"
          value={formatNumber(data?.openFlagsCount)}
          icon={Flag}
          tone={data?.openFlagsCount ? 'alert' : 'brand'}
          loading={isPending}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-5">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Collected by item"
            subtitle="Total weight of each item, from the start"
            action={data && <Badge tone="brand">{formatKg(totalKg)} total</Badge>}
          />
          <CardBody>
            {isPending ? <Skeleton className="h-72" /> : <CategoryBarChart data={data.totalsByCategory} />}
          </CardBody>
        </Card>

        <Card className="xl:col-span-3">
          <CardHeader title="Collected each month" subtitle="Weight sent from collection points in the last 6 months" />
          <CardBody>
            {isPending ? <Skeleton className="h-72" /> : <TrendAreaChart data={data.monthlyTrend} height={290} />}
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <RecentActivityCard shipments={data?.recentShipments} loading={isPending} />
        <ComplianceCard points={data?.compliance} loading={isPending} />
      </div>

      <OpenFlagsCard flags={data?.openFlags} total={data?.openFlagsCount} loading={isPending} />
    </div>
  )
}

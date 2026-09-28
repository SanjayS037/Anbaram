import { useMemo, useState } from 'react'
import { format, subMonths } from 'date-fns'
import { toast } from 'sonner'
import { ChevronDown, ChevronUp, Download, SlidersHorizontal, X } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input, Select } from '../../components/ui/Form'
import { ErrorState, Skeleton } from '../../components/ui/States'
import { useAdmin } from '../../hooks/authContext'
import { useReport } from '../../hooks/useReport'
import { useLocationOptions } from '../../hooks/useShipments'
import { fetchShipmentsForExport } from '../../services/reports'
import { CATEGORIES, categoryLabel } from '../../utils/categories'
import { exportReportToExcel } from '../../utils/excel'
import { formatKg, formatNumber } from '../../utils/format'
import { defaultSelection, resolveRange } from '../../utils/periods'
import { LocationBreakdownCard } from './LocationBreakdownCard'
import { CategoryTotalsCard, PeriodTableCard } from './ReportNumberTables'

/** The one question the page asks: which time period? */
const CHOICES = [
  { value: 'this-month', label: 'This month' },
  { value: 'last-month', label: 'Last month' },
  { value: 'pick-month', label: 'Choose a month…' },
  { value: 'this-quarter', label: 'This quarter (3 months)' },
  { value: 'this-year', label: 'This year' },
  { value: 'pick-year', label: 'Choose a year…' },
  { value: 'all', label: 'All time' },
  { value: 'dates', label: 'From one date to another…' },
]

const FIRST_YEAR = 2024
const YEARS = Array.from({ length: new Date().getFullYear() - FIRST_YEAR + 1 }, (_, i) => new Date().getFullYear() - i)

/** Used in the Excel file's "Report type" line. */
const PERIOD_NAMES = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
  overall: 'Overall',
  custom: 'Chosen dates',
}

/** Turns the dropdown choice (+ its extra month / year / dates) into the selection resolveRange() understands. */
function toSelection(choice, extra) {
  const base = defaultSelection()
  switch (choice) {
    case 'last-month':
      return { ...base, month: format(subMonths(new Date(), 1), 'yyyy-MM') }
    case 'pick-month':
      return { ...base, month: extra.month }
    case 'this-quarter':
      return { ...base, period: 'quarterly' }
    case 'this-year':
      return { ...base, period: 'yearly' }
    case 'pick-year':
      return { ...base, period: 'yearly', year: extra.year }
    case 'all':
      return { ...base, period: 'overall' }
    case 'dates':
      return { ...base, period: 'custom', from: extra.from, to: extra.to }
    default:
      return base // this month
  }
}

const NO_FILTERS = { category: 'all', collectionPointId: '', distributionCenterId: '', status: 'all' }

export function ReportsPage() {
  const admin = useAdmin()
  const options = useLocationOptions()
  const [choice, setChoice] = useState('this-month')
  const [extra, setExtra] = useState(() => {
    const d = defaultSelection()
    return { month: d.month, year: d.year, from: d.from, to: d.to }
  })
  const [filters, setFilters] = useState(NO_FILTERS)
  const [showFilters, setShowFilters] = useState(false)
  const [showPeriods, setShowPeriods] = useState(false)
  const [exporting, setExporting] = useState(false)

  const sel = toSelection(choice, extra)
  const rangeError =
    choice === 'dates' && (!extra.from || !extra.to)
      ? 'Choose both dates.'
      : choice === 'dates' && extra.from > extra.to
        ? 'The first date is after the second date.'
        : null
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const range = useMemo(() => (rangeError ? null : resolveRange(sel)), [choice, extra, rangeError])
  const report = useReport(range, filters)
  const data = report.data

  const cp = options.data?.collectionPoints.find((o) => o.id === filters.collectionPointId)
  const dc = options.data?.distributionCenters.find((o) => o.id === filters.distributionCenterId)
  const activeFilters = [
    filters.category !== 'all' && categoryLabel(filters.category),
    cp && cp.name,
    dc && `sent to ${dc.name}`,
  ].filter(Boolean)
  const categories = filters.category === 'all' ? CATEGORIES.map((c) => c.key) : [filters.category]
  const setFilter = (key, value) => setFilters((f) => ({ ...f, [key]: value }))

  async function handleDownload() {
    if (!data || !range) return
    setExporting(true)
    try {
      const shipments = await fetchShipmentsForExport({ from: range.start, to: range.end, filters })
      const periodType = PERIOD_NAMES[sel.period]
      const stamp = range.start
        ? format(range.start, sel.period === 'yearly' ? 'yyyy' : 'yyyy-MM')
        : format(new Date(), 'yyyy-MM-dd')
      await exportReportToExcel(data, shipments, {
        periodType,
        periodLabel: range.label,
        filterLines: activeFilters.length ? activeFilters : ['None (all shipments)'],
        generatedBy: `${admin.full_name}${admin.designation ? `, ${admin.designation}` : ''}`,
        fileStem: `Anbaram_Report_${periodType.replace(/\s+/g, '')}_${stamp}`,
      })
      toast.success('Excel file downloaded.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not download. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  const receivedPct = data?.shipments ? Math.round((data.receivedShipments / data.shipments) * 100) : 0
  const periodWord = range?.granularity === 'day' ? 'day' : range?.granularity === 'quarter' ? 'quarter' : 'month'

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      {/* ---------- 1. Choose the period ---------- */}
      <Card>
        <div className="flex flex-col gap-4 p-5 md:flex-row md:items-end">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-end">
            <label className="block sm:w-64">
              <span className="text-sm font-semibold text-ink">Show report for</span>
              <Select value={choice} onChange={(e) => setChoice(e.target.value)} className="mt-1 text-base">
                {CHOICES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </label>

            {choice === 'pick-month' && (
              <label className="block">
                <span className="text-sm font-medium text-ink">Month</span>
                <Input
                  type="month"
                  value={extra.month}
                  max={format(new Date(), 'yyyy-MM')}
                  onChange={(e) => e.target.value && setExtra((x) => ({ ...x, month: e.target.value }))}
                  className="mt-1"
                />
              </label>
            )}
            {choice === 'pick-year' && (
              <label className="block">
                <span className="text-sm font-medium text-ink">Year</span>
                <Select
                  value={extra.year}
                  onChange={(e) => setExtra((x) => ({ ...x, year: Number(e.target.value) }))}
                  className="mt-1"
                >
                  {YEARS.map((y) => (
                    <option key={y}>{y}</option>
                  ))}
                </Select>
              </label>
            )}
            {choice === 'dates' && (
              <>
                <label className="block">
                  <span className="text-sm font-medium text-ink">From</span>
                  <Input
                    type="date"
                    value={extra.from}
                    onChange={(e) => setExtra((x) => ({ ...x, from: e.target.value }))}
                    className="mt-1"
                    aria-invalid={!!rangeError}
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-ink">To</span>
                  <Input
                    type="date"
                    value={extra.to}
                    onChange={(e) => setExtra((x) => ({ ...x, to: e.target.value }))}
                    className="mt-1"
                    aria-invalid={!!rangeError}
                  />
                </label>
              </>
            )}
          </div>

          <Button
            onClick={() => void handleDownload()}
            loading={exporting}
            disabled={!data || !!rangeError}
            className="md:w-auto"
          >
            <Download className="size-4" aria-hidden /> Download Excel
          </Button>
        </div>

        {rangeError && <p className="px-5 pb-3 text-sm text-red-700">{rangeError}</p>}

        {/* optional filters, closed by default */}
        <div className="border-t border-line px-5 py-3">
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline"
            aria-expanded={showFilters}
          >
            <SlidersHorizontal className="size-4" aria-hidden />
            Show only one item or place (optional)
            {showFilters ? (
              <ChevronUp className="size-4" aria-hidden />
            ) : (
              <ChevronDown className="size-4" aria-hidden />
            )}
          </button>

          {activeFilters.length > 0 && !showFilters && (
            <span className="ml-3 inline-flex items-center gap-2 text-sm text-muted">
              Showing only: <strong className="text-ink">{activeFilters.join(', ')}</strong>
              <button
                type="button"
                onClick={() => setFilters(NO_FILTERS)}
                className="inline-flex items-center gap-0.5 text-red-800 hover:underline"
              >
                <X className="size-3.5" aria-hidden /> clear
              </button>
            </span>
          )}

          {showFilters && (
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <label className="block">
                <span className="text-sm font-medium text-ink">Item</span>
                <Select
                  value={filters.category}
                  onChange={(e) => setFilter('category', e.target.value)}
                  className="mt-1"
                >
                  <option value="all">All items</option>
                  {CATEGORIES.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.label}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="block">
                <span className="text-sm font-medium text-ink">Collection point</span>
                <Select
                  value={filters.collectionPointId}
                  onChange={(e) => setFilter('collectionPointId', e.target.value)}
                  className="mt-1"
                >
                  <option value="">All collection points</option>
                  {options.data?.collectionPoints.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="block">
                <span className="text-sm font-medium text-ink">Distribution center</span>
                <Select
                  value={filters.distributionCenterId}
                  onChange={(e) => setFilter('distributionCenterId', e.target.value)}
                  className="mt-1"
                >
                  <option value="">All distribution centers</option>
                  {options.data?.distributionCenters.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </Select>
              </label>
              {activeFilters.length > 0 && (
                <button
                  type="button"
                  onClick={() => setFilters(NO_FILTERS)}
                  className="text-left text-sm font-semibold text-red-800 hover:underline sm:col-span-3"
                >
                  Clear filters
                </button>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* ---------- 2. The answer ---------- */}
      {rangeError ? null : report.isError ? (
        <Card>
          <ErrorState title="Could not load the report" error={report.error} onRetry={() => void report.refetch()} />
        </Card>
      ) : !data ? (
        <Skeleton className="h-48" />
      ) : (
        <div className={report.isFetching ? 'space-y-5 opacity-60 transition-opacity' : 'space-y-5'}>
          <Card>
            <div className="p-6">
              <h2 className="font-serif text-2xl font-bold text-brand-900">{range.label}</h2>
              <p className="mt-1 text-base text-muted">
                {data.shipments === 0 ? (
                  'No donations were sent in this period.'
                ) : (
                  <>
                    <strong className="text-ink">{formatKg(data.totalKg)}</strong> of donations
                    {activeFilters.length ? ` (${activeFilters.join(', ')})` : ''} were sent in{' '}
                    <strong className="text-ink">{formatNumber(data.shipments)}</strong> shipment
                    {data.shipments === 1 ? '' : 's'}.{' '}
                    <strong className="text-ink">{formatNumber(data.receivedShipments)}</strong> of them have been
                    received.
                  </>
                )}
              </p>

              <dl className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {[
                  ['Total weight', formatKg(data.totalKg)],
                  ['Shipments sent', formatNumber(data.shipments)],
                  ['Received', data.shipments ? `${formatNumber(data.receivedShipments)} (${receivedPct}%)` : '0'],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-md bg-brand-50/70 px-4 py-3">
                    <dt className="text-sm text-muted">{label}</dt>
                    <dd className="font-serif text-3xl font-bold text-ink">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </Card>

          {data.shipments > 0 && (
            <>
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <CategoryTotalsCard byCategory={data.byCategory} totalKg={data.totalKg} categories={categories} />
                <LocationBreakdownCard
                  title="By collection point"
                  subtitle="Where donations were collected"
                  rows={data.byCollectionPoint}
                  totalKg={data.totalKg}
                />
              </div>
              <LocationBreakdownCard
                title="By distribution center"
                subtitle="Where donations were sent"
                rows={data.byDistributionCenter}
                totalKg={data.totalKg}
              />
            </>
          )}

          {data.trend.length > 1 && (
            <div>
              <Button variant="secondary" onClick={() => setShowPeriods((v) => !v)} aria-expanded={showPeriods}>
                {showPeriods ? (
                  <ChevronUp className="size-4" aria-hidden />
                ) : (
                  <ChevronDown className="size-4" aria-hidden />
                )}
                {showPeriods
                  ? `Hide ${periodWord}-by-${periodWord} numbers`
                  : `Show ${periodWord}-by-${periodWord} numbers`}
              </Button>
              {showPeriods && (
                <div className="mt-3">
                  <PeriodTableCard trend={data.trend} title={range.trendTitle} categories={categories} />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

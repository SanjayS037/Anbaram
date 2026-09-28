import { Card, CardHeader } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/States'
import { TableShell, Th, theadClass } from '../../components/ui/Table'
import { CATEGORIES } from '../../utils/categories'
import { cn } from '../../utils/cn'
import { formatKg } from '../../utils/format'

const pct = (part, whole) => (whole ? `${((part / whole) * 100).toFixed(1)}%` : '0%')

/** Weight per item for the selected period, as plain numbers. */
export function CategoryTotalsCard({ byCategory, totalKg, categories }) {
  const rows = CATEGORIES.filter((c) => categories.includes(c.key)).map((c) => ({
    ...c,
    kg: Number(byCategory.find((r) => r.category === c.key)?.total_kg ?? 0),
  }))

  return (
    <Card>
      <CardHeader title="By item" subtitle="Weight collected in this time" />
      <div className="pt-3">
        {totalKg === 0 ? (
          <EmptyState title="Nothing was collected in this time" />
        ) : (
          <TableShell minWidth={360}>
            <thead className={theadClass}>
              <tr>
                <Th className="pl-5">Item</Th>
                <Th className="text-right">Weight</Th>
                <Th className="pr-5 text-right">Part (%)</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => (
                <tr key={r.key}>
                  <td className="py-2.5 pr-3 pl-5">{r.label}</td>
                  <td className="px-4 py-2.5 text-right font-semibold tabular-nums">{formatKg(r.kg)}</td>
                  <td className="py-2.5 pr-5 pl-4 text-right text-muted tabular-nums">{pct(r.kg, totalKg)}</td>
                </tr>
              ))}
              <tr className="bg-brand-50/60 font-semibold">
                <td className="py-2.5 pr-3 pl-5">Total</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{formatKg(totalKg)}</td>
                <td className="py-2.5 pr-5 pl-4 text-right tabular-nums">100%</td>
              </tr>
            </tbody>
          </TableShell>
        )}
      </div>
    </Card>
  )
}

/** Period-by-period numbers (replaces the trend chart). The selected period's row is highlighted. */
export function PeriodTableCard({ trend, title, categories }) {
  const cols = CATEGORIES.filter((c) => categories.includes(c.key))
  const rows = [...trend].reverse() // newest first
  const hasData = trend.some((t) => t.total > 0)

  return (
    <Card>
      <CardHeader title="Each period" subtitle={`${title} · weight sent`} />
      <div className="pt-3">
        {!hasData ? (
          <EmptyState title="No shipments in this time" />
        ) : (
          <TableShell minWidth={620}>
            <thead className={theadClass}>
              <tr>
                <Th className="pl-5">Period</Th>
                {cols.map((c) => (
                  <Th key={c.key} className="text-right">
                    {c.label}
                  </Th>
                ))}
                <Th className="pr-5 text-right">Total</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((t) => (
                <tr key={t.key} className={cn(t.selected && 'bg-brand-50 font-semibold')}>
                  <td className="py-2.5 pr-3 pl-5 whitespace-nowrap">
                    {t.longLabel}
                    {t.selected && <span className="ml-2 text-xs font-semibold text-brand-700">(chosen)</span>}
                  </td>
                  {cols.map((c) => (
                    <td key={c.key} className={cn('px-4 py-2.5 text-right tabular-nums', !t[c.key] && 'text-muted')}>
                      {t[c.key] ? formatKg(t[c.key]) : '—'}
                    </td>
                  ))}
                  <td
                    className={cn('py-2.5 pr-5 pl-4 text-right font-semibold tabular-nums', !t.total && 'text-muted')}
                  >
                    {t.total ? formatKg(t.total) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        )}
      </div>
    </Card>
  )
}

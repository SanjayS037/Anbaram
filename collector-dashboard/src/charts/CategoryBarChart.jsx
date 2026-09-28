import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CATEGORIES } from '../utils/categories'
import { formatKg, formatNumber } from '../utils/format'
import { ChartTooltipCard } from './ChartTooltip'

export function CategoryBarChart({ data, height = 240 }) {
  const total = data.reduce((sum, d) => sum + Number(d.total_kg), 0)
  // Always render all five categories in fixed order so colours never shift.
  const rows = CATEGORIES.map((c) => {
    const kg = Number(data.find((d) => d.category === c.key)?.total_kg ?? 0)
    return { ...c, kg, share: total ? kg / total : 0 }
  })

  return (
    <figure>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 20, right: 4, bottom: 0, left: -8 }} barCategoryGap="28%">
            <CartesianGrid vertical={false} stroke="var(--color-line)" />
            <XAxis
              dataKey="label"
              interval={0}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: 'var(--color-muted)' }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={48}
              tick={{ fontSize: 11, fill: 'var(--color-muted)' }}
              tickFormatter={(v) => formatNumber(v)}
            />
            <Tooltip
              cursor={{ fill: 'var(--color-brand-50)' }}
              content={({ active, payload }) => {
                const row = active && payload?.[0]?.payload
                if (!row) return null
                return (
                  <ChartTooltipCard
                    title={row.label}
                    rows={[
                      { label: 'Collected', value: formatKg(row.kg), color: row.color },
                      { label: 'Part', value: `${(row.share * 100).toFixed(1)}%` },
                    ]}
                  />
                )
              }}
            />
            <Bar dataKey="kg" radius={[4, 4, 0, 0]} maxBarSize={56} isAnimationActive={false}>
              {rows.map((row) => (
                <Cell key={row.key} fill={row.color} />
              ))}
              <LabelList
                dataKey="kg"
                position="top"
                formatter={(v) => formatNumber(Number(v))}
                style={{ fontSize: 11, fontWeight: 600, fill: 'var(--color-ink)' }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <figcaption className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 rounded-md bg-brand-50 px-3 py-2.5">
        {rows.map((row) => (
          <span key={row.key} className="flex items-center gap-1.5 text-[11px] whitespace-nowrap text-muted">
            <span className="size-2.5 shrink-0 rounded-sm" style={{ background: row.color }} aria-hidden />
            <span className="text-ink">{row.label}</span>
            <span className="tabular-nums">{(row.share * 100).toFixed(1)}%</span>
          </span>
        ))}
      </figcaption>
    </figure>
  )
}

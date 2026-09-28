import { format, parse } from 'date-fns'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatKg, formatNumber } from '../utils/format'
import { ChartTooltipCard } from './ChartTooltip'

const monthLabel = (month, pattern) => format(parse(month, 'yyyy-MM', new Date()), pattern)

/** Single-series monthly total — the card title names the series, so no legend. */
export function TrendAreaChart({ data, height = 260 }) {
  const color = 'var(--color-brand-600)'
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 12, right: 12, bottom: 0, left: -8 }}>
          <defs>
            <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-brand-500)" stopOpacity={0.28} />
              <stop offset="100%" stopColor="var(--color-brand-500)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--color-line)" />
          <XAxis
            dataKey="month"
            tickFormatter={(m) => monthLabel(m, 'MMM')}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: 'var(--color-muted)' }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={52}
            tick={{ fontSize: 11, fill: 'var(--color-muted)' }}
            tickFormatter={(v) => formatNumber(v)}
          />
          <Tooltip
            cursor={{ stroke: 'var(--color-brand-300)', strokeWidth: 1 }}
            content={({ active, payload }) => {
              const row = active && payload?.[0]?.payload
              if (!row) return null
              return (
                <ChartTooltipCard
                  title={monthLabel(row.month, 'MMMM yyyy')}
                  rows={[{ label: 'Collected', value: formatKg(row.total_kg), color }]}
                />
              )
            }}
          />
          <Area
            type="monotone"
            dataKey="total_kg"
            stroke={color}
            strokeWidth={2}
            fill="url(#trend-fill)"
            dot={{ r: 4, fill: 'var(--color-surface)', stroke: color, strokeWidth: 2 }}
            activeDot={{ r: 5, fill: color, stroke: 'var(--color-surface)', strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

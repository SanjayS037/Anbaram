/** Shared tooltip card for Recharts `content` render props. Text stays in ink tokens. */
export function ChartTooltipCard({ title, rows }) {
  return (
    <div className="rounded-md border border-line bg-surface px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-semibold text-ink">{title}</p>
      {rows.map((row) => (
        <p key={row.label} className="flex items-center gap-2 text-muted">
          {row.color && <span className="size-2.5 rounded-sm" style={{ background: row.color }} aria-hidden />}
          <span>{row.label}</span>
          <span className="ml-auto pl-3 font-semibold text-ink tabular-nums">{row.value}</span>
        </p>
      ))}
    </div>
  )
}

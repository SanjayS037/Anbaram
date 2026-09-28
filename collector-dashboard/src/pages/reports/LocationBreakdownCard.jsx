import { useState } from 'react'
import { Card, CardHeader } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/States'
import { TableShell, Th, theadClass } from '../../components/ui/Table'
import { formatKg, formatNumber } from '../../utils/format'

const COLLAPSED_ROWS = 10

export function LocationBreakdownCard({ title, subtitle, rows, totalKg }) {
  const [expanded, setExpanded] = useState(false)
  const visible = expanded ? rows : rows.slice(0, COLLAPSED_ROWS)

  return (
    <Card>
      <CardHeader title={title} subtitle={subtitle} />
      <div className="pt-3">
        {!rows.length ? (
          <EmptyState title="No shipments in this time" />
        ) : (
          <>
            <TableShell minWidth={420}>
              <thead className={theadClass}>
                <tr>
                  <Th className="pl-5">Name</Th>
                  <Th className="text-right">Shipments</Th>
                  <Th className="text-right">Weight</Th>
                  <Th className="pr-5 text-right">Part (%)</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {visible.map((r) => (
                  <tr key={r.id}>
                    <td className="py-2.5 pr-3 pl-5">
                      <span className="font-medium">{r.name}</span>
                      {r.short_code && (
                        <span className="ml-1 text-xs whitespace-nowrap text-muted">({r.short_code})</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{formatNumber(r.shipments)}</td>
                    <td className="px-4 py-2.5 text-right font-semibold whitespace-nowrap tabular-nums">
                      {formatKg(r.total_kg)}
                    </td>
                    <td className="py-2.5 pr-5 pl-4 text-right text-muted tabular-nums">
                      {totalKg ? ((r.total_kg / totalKg) * 100).toFixed(1) : 0}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
            {rows.length > COLLAPSED_ROWS && (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="w-full border-t border-line px-5 py-2.5 text-left text-xs font-semibold text-brand-700 hover:bg-brand-50/50"
              >
                {expanded ? 'Show top 10 only' : `Show all ${rows.length}`}
              </button>
            )}
          </>
        )}
      </div>
    </Card>
  )
}

import { SortableTh, TableShell, Th, theadClass } from '../ui/Table'
import { ConditionBadge, ShipmentStatusBadge } from './StatusBadges'
import { CATEGORIES } from '../../utils/categories'
import { formatDate, formatKg } from '../../utils/format'

/** Small stacked bar showing the category mix of one shipment (colour = category, same as charts). */
function CategoryMix({ row }) {
  const total = Number(row.total_kg) || 0
  const parts = CATEGORIES.map((c) => ({ ...c, kg: Number(row[`${c.key}_kg`]) })).filter((p) => p.kg > 0)
  const summary = parts.map((p) => `${p.label} ${formatKg(p.kg)}`).join(', ')
  return (
    <div className="w-28" title={summary}>
      <div className="flex h-2 gap-px overflow-hidden rounded-full bg-brand-50" aria-hidden>
        {parts.map((p) => (
          <span key={p.key} style={{ width: `${(p.kg / (total || 1)) * 100}%`, background: p.color }} />
        ))}
      </div>
      <span className="sr-only">{summary || 'No weight recorded'}</span>
    </div>
  )
}

/** Shipment rows. Clicking a row (or its batch code) calls onOpen — the page shows the batch in a side panel. */
export function ShipmentTable({ rows, sort, onSort, onOpen, hide = [] }) {
  return (
    <TableShell minWidth={900}>
      <thead className={theadClass}>
        <tr>
          <SortableTh column="batch_code" sort={sort} onSort={onSort}>
            Shipment No.
          </SortableTh>
          {!hide.includes('collection_point') && <Th>From</Th>}
          {!hide.includes('distribution_center') && <Th>To</Th>}
          <SortableTh column="total_kg" sort={sort} onSort={onSort} className="text-right">
            Weight
          </SortableTh>
          <Th>Items</Th>
          <SortableTh column="dispatched_at" sort={sort} onSort={onSort}>
            Sent
          </SortableTh>
          <SortableTh column="received_at" sort={sort} onSort={onSort}>
            Received
          </SortableTh>
          <Th>Status</Th>
          <Th>Condition</Th>
        </tr>
      </thead>
      <tbody className="divide-y divide-line">
        {rows.map((s) => (
          <tr key={s.id} className="cursor-pointer hover:bg-brand-50/60" onClick={() => onOpen(s.id)}>
            <td className="px-4 py-3 font-semibold whitespace-nowrap">
              <button
                type="button"
                onClick={(e) => (e.stopPropagation(), onOpen(s.id))}
                className="text-brand-800 hover:underline"
              >
                {s.batch_code ?? '—'}
              </button>
            </td>
            {!hide.includes('collection_point') && <td className="px-4 py-3">{s.collection_point?.name ?? '—'}</td>}
            {!hide.includes('distribution_center') && (
              <td className="px-4 py-3">{s.distribution_center?.name ?? '—'}</td>
            )}
            <td className="px-4 py-3 text-right font-semibold whitespace-nowrap tabular-nums">
              {formatKg(s.total_kg)}
            </td>
            <td className="px-4 py-3">
              <CategoryMix row={s} />
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-muted">{formatDate(s.dispatched_at)}</td>
            <td className="px-4 py-3 whitespace-nowrap text-muted">{formatDate(s.received_at)}</td>
            <td className="px-4 py-3">
              <ShipmentStatusBadge status={s.status} />
            </td>
            <td className="px-4 py-3">
              <ConditionBadge condition={s.condition} />
            </td>
          </tr>
        ))}
      </tbody>
    </TableShell>
  )
}

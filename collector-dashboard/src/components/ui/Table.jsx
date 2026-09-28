import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '../../utils/cn'
import { formatNumber } from '../../utils/format'

export function Th({ className, children, ...rest }) {
  return (
    <th scope="col" className={cn('px-4 py-2.5 text-left font-semibold whitespace-nowrap', className)} {...rest}>
      {children}
    </th>
  )
}

export function SortableTh({ column, sort, onSort, children, className }) {
  const active = sort.column === column
  const Icon = !active ? ArrowUpDown : sort.ascending ? ArrowUp : ArrowDown
  return (
    <th
      scope="col"
      aria-sort={active ? (sort.ascending ? 'ascending' : 'descending') : 'none'}
      className={cn('px-4 py-2.5 text-left font-semibold whitespace-nowrap', className)}
    >
      <button
        type="button"
        onClick={() => onSort({ column, ascending: active ? !sort.ascending : true })}
        className={cn('inline-flex items-center gap-1 uppercase hover:text-ink', active && 'text-ink')}
      >
        {children}
        <Icon className="size-3" aria-hidden />
      </button>
    </th>
  )
}

export function TableShell({ children, minWidth = 760 }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm" style={{ minWidth }}>
        {children}
      </table>
    </div>
  )
}

export const theadClass = 'border-b border-line bg-brand-50/60 text-[11px] tracking-wide text-muted uppercase'

export function Pagination({ page, pageSize, total, onPageChange }) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  if (total === 0) return null
  const first = (page - 1) * pageSize + 1
  const last = Math.min(page * pageSize, total)
  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-between gap-3 border-t border-line px-4 py-3 text-xs text-muted"
    >
      <p>
        Showing <strong className="text-ink">{formatNumber(first)}</strong>–
        <strong className="text-ink">{formatNumber(last)}</strong> of{' '}
        <strong className="text-ink">{formatNumber(total)}</strong>
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="rounded-md border border-line bg-surface p-1.5 hover:bg-brand-50 disabled:opacity-40"
          aria-label="Previous page"
        >
          <ChevronLeft className="size-4" />
        </button>
        <span className="px-2 tabular-nums">
          Page {page} of {pages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pages}
          className="rounded-md border border-line bg-surface p-1.5 hover:bg-brand-50 disabled:opacity-40"
          aria-label="Next page"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    </nav>
  )
}

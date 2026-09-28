import { Link } from 'react-router'
import { cn } from '../../utils/cn'
import { Skeleton } from '../ui/States'

export function StatTile({ label, value, unit, icon: Icon, to, tone = 'brand', loading }) {
  const body = (
    <div className="flex items-start justify-between gap-3 p-5">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold tracking-[0.08em] text-muted uppercase">{label}</p>
        {loading ? (
          <Skeleton className="mt-3 h-8 w-24" />
        ) : (
          <p className={cn('mt-2 font-serif text-3xl font-bold', tone === 'alert' ? 'text-amber-800' : 'text-ink')}>
            {value}
            {unit && <span className="ml-1 font-sans text-sm font-medium text-muted">{unit}</span>}
          </p>
        )}
      </div>
      <span
        className={cn(
          'grid size-10 shrink-0 place-items-center rounded-md',
          tone === 'alert' ? 'bg-amber-100 text-amber-800' : 'bg-brand-50 text-brand-700',
        )}
      >
        <Icon className="size-5" aria-hidden />
      </span>
    </div>
  )

  const shell = 'block rounded-lg border border-line bg-surface shadow-xs'
  return to ? (
    <Link to={to} className={cn(shell, 'transition-colors hover:border-brand-300')}>
      {body}
    </Link>
  ) : (
    <div className={shell}>{body}</div>
  )
}

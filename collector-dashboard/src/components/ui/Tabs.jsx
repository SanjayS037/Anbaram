import { cn } from '../../utils/cn'

/** Filter-style tabs (each tab re-filters one list, so they are buttons with aria-pressed). */
export function Tabs({ items, value, onChange, label }) {
  return (
    <div role="group" aria-label={label} className="flex gap-1 overflow-x-auto border-b border-line">
      {items.map((item) => {
        const active = item.value === value
        return (
          <button
            key={item.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(item.value)}
            className={cn(
              '-mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold whitespace-nowrap transition-colors',
              active ? 'border-brand-700 text-brand-800' : 'border-transparent text-muted hover:text-ink',
            )}
          >
            {item.label}
            {item.count !== undefined && (
              <span
                className={cn(
                  'rounded-full px-1.5 text-[11px] tabular-nums',
                  active ? 'bg-brand-700 text-white' : 'bg-brand-100 text-brand-800',
                )}
              >
                {item.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

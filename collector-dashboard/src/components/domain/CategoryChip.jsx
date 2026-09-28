import { CATEGORIES } from '../../utils/categories'
import { cn } from '../../utils/cn'

/** Category label with its fixed colour dot (same colours as every chart). */
export function CategoryChip({ category, suffix, muted = false, className }) {
  const meta = CATEGORIES.find((c) => c.key === category)
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        muted ? 'border-line bg-surface text-muted' : 'border-line bg-brand-50/60 text-ink',
        className,
      )}
    >
      <span className="size-2 rounded-full" style={{ background: meta?.color }} aria-hidden />
      {meta?.label ?? category}
      {suffix}
    </span>
  )
}

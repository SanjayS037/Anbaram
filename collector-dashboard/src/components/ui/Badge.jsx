import { cn } from '../../utils/cn'

const tones = {
  neutral: 'bg-slate-100 text-slate-700 ring-slate-200',
  success: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  warning: 'bg-amber-50 text-amber-800 ring-amber-200',
  danger: 'bg-red-50 text-red-800 ring-red-200',
  info: 'bg-sky-50 text-sky-800 ring-sky-200',
  brand: 'bg-brand-50 text-brand-800 ring-brand-200',
}

export function Badge({ tone = 'neutral', className, children }) {
  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

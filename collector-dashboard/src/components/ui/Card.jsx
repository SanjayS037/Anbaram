import { cn } from '../../utils/cn'

export function Card({ className, children }) {
  return <section className={cn('rounded-lg border border-line bg-surface shadow-xs', className)}>{children}</section>
}

export function CardHeader({ title, subtitle, action }) {
  return (
    <header className="flex items-start justify-between gap-3 px-5 pt-5">
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  )
}

export function CardBody({ className, children }) {
  return <div className={cn('px-5 pb-5 pt-4', className)}>{children}</div>
}

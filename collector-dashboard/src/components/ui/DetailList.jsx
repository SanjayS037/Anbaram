import { cn } from '../../utils/cn'

export function DetailList({ children, className }) {
  return <dl className={cn('grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3', className)}>{children}</dl>
}

export function Detail({ label, children, className }) {
  return (
    <div className={className}>
      <dt className="text-[11px] font-semibold tracking-wide text-muted uppercase">{label}</dt>
      <dd className="mt-1 text-sm break-words">{children}</dd>
    </div>
  )
}

import { AlertTriangle, Inbox, Loader2 } from 'lucide-react'
import { cn } from '../../utils/cn'
import { Button } from './Button'

export function Spinner({ label = 'Loading…', className }) {
  return (
    <div role="status" className={cn('flex items-center justify-center gap-2 text-sm text-muted', className)}>
      <Loader2 className="size-4 animate-spin" aria-hidden />
      {label}
    </div>
  )
}

export function Skeleton({ className }) {
  return <div aria-hidden className={cn('animate-pulse rounded bg-brand-100/60', className)} />
}

export function ErrorState({ title = 'Could not load. Please check your internet.', error, onRetry, className }) {
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : undefined
  return (
    <div role="alert" className={cn('flex flex-col items-center gap-2 px-4 py-8 text-center', className)}>
      <AlertTriangle className="size-6 text-red-700" aria-hidden />
      <p className="text-sm font-semibold text-ink">{title}</p>
      {message && <p className="max-w-md text-xs text-muted">{message}</p>}
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry} className="mt-1">
          Try again
        </Button>
      )}
    </div>
  )
}

export function EmptyState({ title, description, action, className }) {
  return (
    <div className={cn('flex flex-col items-center gap-2 px-4 py-8 text-center', className)}>
      <Inbox className="size-6 text-brand-300" aria-hidden />
      <p className="text-sm font-semibold text-ink">{title}</p>
      {description && <p className="max-w-md text-xs text-muted">{description}</p>}
      {action}
    </div>
  )
}

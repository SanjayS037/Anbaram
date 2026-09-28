import { forwardRef } from 'react'
import { Search } from 'lucide-react'
import { cn } from '../../utils/cn'

const control =
  'w-full rounded-md border border-line bg-surface px-3 text-sm text-ink placeholder:text-muted/70 focus:border-brand-500 focus:outline-none disabled:bg-brand-50 disabled:text-muted aria-invalid:border-red-500'

export function Field({ label, htmlFor, hint, error, required, children, className }) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="text-sm font-medium text-ink">
        {label}
        {required && (
          <span className="text-red-700" aria-hidden>
            {' '}
            *
          </span>
        )}
      </label>
      <div className="mt-1">{children}</div>
      {error ? (
        <p id={`${htmlFor}-error`} className="mt-1 text-xs text-red-700">
          {error}
        </p>
      ) : (
        hint && <p className="mt-1 text-xs text-muted">{hint}</p>
      )}
    </div>
  )
}

export const Input = forwardRef(function Input({ className, ...rest }, ref) {
  return <input ref={ref} className={cn(control, 'h-10', className)} {...rest} />
})

export const Textarea = forwardRef(function Textarea({ className, ...rest }, ref) {
  return <textarea ref={ref} className={cn(control, 'min-h-24 py-2', className)} {...rest} />
})

export const Select = forwardRef(function Select({ className, children, ...rest }, ref) {
  return (
    <select ref={ref} className={cn(control, 'h-10 pr-8', className)} {...rest}>
      {children}
    </select>
  )
})

/** Two dates (from / to) inside one box. Values are 'YYYY-MM-DD' strings or ''. */
export function DateRangeInput({ from, to, onFromChange, onToChange, label = 'Dates', invalid, className }) {
  const inner = 'h-full min-w-0 flex-1 bg-transparent text-sm text-ink focus:outline-none'
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        control,
        'flex h-10 items-center gap-1.5 focus-within:border-brand-500',
        invalid && 'border-red-500',
        className,
      )}
    >
      <input
        type="date"
        aria-label={`${label}: from`}
        title="From"
        value={from}
        max={to || undefined}
        onChange={(e) => onFromChange(e.target.value)}
        className={inner}
      />
      <span className="shrink-0 text-xs text-muted">to</span>
      <input
        type="date"
        aria-label={`${label}: to`}
        title="To"
        value={to}
        min={from || undefined}
        onChange={(e) => onToChange(e.target.value)}
        className={inner}
      />
    </div>
  )
}

export function SearchInput({ value, onChange, placeholder = 'Search…', label = 'Search', className }) {
  return (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
      <input
        type="search"
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(control, 'h-10 pl-9')}
      />
    </div>
  )
}

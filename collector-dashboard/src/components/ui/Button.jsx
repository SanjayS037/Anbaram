import { forwardRef } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '../../utils/cn'

const variants = {
  primary: 'bg-brand-700 text-white hover:bg-brand-800 disabled:bg-brand-300',
  secondary: 'border border-line bg-surface text-ink hover:bg-brand-50 disabled:text-muted',
  ghost: 'text-muted hover:bg-brand-50 hover:text-ink',
  danger: 'bg-red-700 text-white hover:bg-red-800 disabled:bg-red-300',
}

const sizes = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
}

export const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', loading = false, disabled, className, children, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex items-center justify-center rounded-md font-semibold transition-colors disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    >
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  )
})

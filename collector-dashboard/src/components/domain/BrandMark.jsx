import { cn } from '../../utils/cn'
import { appConfig } from '../../lib/config'

/**
 * Official Anbaram logo (public/anbaram_logo.svg — a round badge with its own
 * white background). Pass `alt` when the logo stands alone; next to the
 * "Anbaram" wordmark it is decorative, so alt stays empty.
 */
export function BrandLogo({ className, alt = '' }) {
  return (
    <img
      src="/anbaram_logo.svg"
      alt={alt}
      width={44}
      height={44}
      decoding="async"
      className={cn('size-11 shrink-0 rounded-full bg-white shadow-xs ring-1 ring-black/5', className)}
    />
  )
}

export function BrandMark({ inverted = false }) {
  return (
    <div className="flex items-center gap-3">
      <BrandLogo />
      <div className="leading-tight">
        <p className={cn('text-sm font-bold tracking-[0.12em] uppercase', inverted ? 'text-white' : 'text-brand-800')}>
          {appConfig.appName}
        </p>
        <p className={cn('text-[11px] tracking-wide uppercase', inverted ? 'text-brand-100' : 'text-muted')}>
          {appConfig.office}
        </p>
      </div>
    </div>
  )
}

/**
 * Tamil Nadu Government emblem + name, shown at the top-left of the login
 * page. The emblem (public/tn_govt_logo.svg, public domain) sits on a white
 * circle so its green ring stays visible on the dark login panel.
 */
export function GovtMark({ inverted = false }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-12 shrink-0 place-items-center rounded-full bg-white p-1 shadow-xs ring-1 ring-black/5">
        <img
          src="/tn_govt_logo.svg"
          alt=""
          width={40}
          height={40}
          decoding="async"
          className="size-10 object-contain"
        />
      </span>
      <p className={cn('text-sm font-bold tracking-[0.12em] uppercase', inverted ? 'text-white' : 'text-brand-800')}>
        {appConfig.government}
      </p>
    </div>
  )
}

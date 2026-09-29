import { cn } from '../../utils/cn'
import { appConfig } from '../../lib/config'

// The PNG is square artwork that reaches its edges, so it is padded inside the
// white circle — otherwise the round crop cuts off the corners (the bottom text).
const LOGO_SIZES = {
  sm: { box: 'size-11 p-[3px]', px: 44 },
  lg: { box: 'size-36 p-2.5', px: 144 },
}

/**
 * Official Anbaram logo (public/Anbaram official logo.png) inside a white
 * circle. Pass `alt` when the logo stands alone; next to the "Anbaram"
 * wordmark it is decorative, so alt stays empty.
 */
export function BrandLogo({ className, alt = '', size = 'sm' }) {
  const { box, px } = LOGO_SIZES[size]
  return (
    <span
      className={cn(
        'grid shrink-0 place-items-center rounded-full bg-white shadow-xs ring-1 ring-black/5',
        box,
        className,
      )}
    >
      <img
        src="/Anbaram official logo.png"
        alt={alt}
        width={px}
        height={px}
        decoding="async"
        className="size-full object-contain"
      />
    </span>
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

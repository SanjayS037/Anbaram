import { useIsFetching, useQueryClient } from '@tanstack/react-query'
import { Menu, RefreshCw } from 'lucide-react'
import { useAdmin } from '../hooks/authContext'
import { appConfig } from '../lib/config'
import { cn } from '../utils/cn'
import { initials } from '../utils/format'

export function Header({ title, onOpenMenu }) {
  const admin = useAdmin()
  const queryClient = useQueryClient()
  const fetching = useIsFetching() > 0

  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-canvas/95 px-4 py-3 backdrop-blur sm:px-6">
      <button
        type="button"
        onClick={onOpenMenu}
        className="rounded p-1.5 text-muted hover:bg-brand-100 lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="size-5" />
      </button>

      <div className="min-w-0 flex-1">
        <p className="hidden truncate text-[10px] font-semibold tracking-[0.14em] text-muted uppercase sm:block">
          {appConfig.breadcrumb}
        </p>
        <h1 className="truncate font-serif text-lg font-bold text-brand-900 sm:text-xl">{title}</h1>
      </div>

      <button
        type="button"
        onClick={() => void queryClient.invalidateQueries()}
        className="rounded-md border border-line bg-surface p-2 text-muted hover:text-ink"
        aria-label="Reload"
        title="Reload"
      >
        <RefreshCw className={cn('size-4', fetching && 'animate-spin')} />
      </button>

      <div className="hidden items-center gap-2 border-l border-line pl-3 md:flex">
        <span className="grid size-8 place-items-center rounded-full bg-brand-700 text-[11px] font-bold text-white">
          {initials(admin.full_name)}
        </span>
        <div className="leading-tight">
          <p className="text-xs font-semibold">{admin.full_name}</p>
          <p className="text-[10px] text-muted">{admin.designation ?? 'Collector Office'}</p>
        </div>
      </div>
    </header>
  )
}

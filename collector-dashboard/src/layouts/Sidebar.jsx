import { NavLink } from 'react-router'
import { LogOut, X } from 'lucide-react'
import { useAdmin, useAuth } from '../hooks/authContext'
import { BrandMark } from '../components/domain/BrandMark'
import { cn } from '../utils/cn'
import { initials } from '../utils/format'
import { NAV_ITEMS } from './navigation'

export function Sidebar({ badges, onClose, onNavigate }) {
  const admin = useAdmin()
  const { signOut } = useAuth()

  return (
    <div className="flex h-full flex-col bg-surface">
      <div className="flex items-center justify-between border-b border-line bg-brand-50 px-5 py-5">
        <BrandMark />
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-muted hover:bg-brand-100 lg:hidden"
            aria-label="Close menu"
          >
            <X className="size-5" />
          </button>
        )}
      </div>

      <nav aria-label="Main" className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon, badgeKey }) => {
            const count = badgeKey ? badges[badgeKey] : undefined
            return (
              <li key={to}>
                <NavLink
                  to={to}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                      isActive ? 'bg-brand-700 text-white' : 'text-ink hover:bg-brand-50',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon className="size-4 shrink-0" aria-hidden />
                      <span className="flex-1">{label}</span>
                      {!!count && (
                        <span
                          className={cn(
                            'min-w-5 rounded-full px-1.5 text-center text-[11px] font-bold',
                            isActive ? 'bg-white text-brand-800' : 'bg-amber-600 text-white',
                          )}
                        >
                          {count}
                          <span className="sr-only"> waiting</span>
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="border-t border-line p-3">
        <div className="flex items-center gap-3 rounded-md bg-brand-50 p-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-700 text-xs font-bold text-white">
            {initials(admin.full_name)}
          </span>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-semibold">{admin.full_name}</p>
            {admin.designation && <p className="truncate text-[11px] text-muted">{admin.designation}</p>}
          </div>
          <button
            type="button"
            onClick={() => void signOut()}
            className="rounded p-1.5 text-muted hover:bg-brand-100 hover:text-ink"
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

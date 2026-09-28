import { useEffect, useState } from 'react'
import { Outlet, useMatches } from 'react-router'
import { appConfig } from '../lib/config'
import { useNavCounts } from '../hooks/useOverview'
import { Header } from './Header'
import { Sidebar } from './Sidebar'

export function DashboardLayout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const matches = useMatches()
  const title =
    [...matches]
      .reverse()
      .map((m) => m.handle?.title)
      .find(Boolean) ?? 'Dashboard'

  const { data: badges = {} } = useNavCounts()

  useEffect(() => {
    document.title = `${title} · ${appConfig.appName}`
  }, [title])

  return (
    <div className="flex min-h-full">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-line lg:block">
        <Sidebar badges={badges} />
      </aside>

      {menuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <div className="absolute inset-0 bg-brand-900/40" onClick={() => setMenuOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] shadow-xl">
            <Sidebar badges={badges} onClose={() => setMenuOpen(false)} onNavigate={() => setMenuOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <Header title={title} onOpenMenu={() => setMenuOpen(true)} />
        <main className="flex-1 px-4 py-6 sm:px-6">
          <div className="mx-auto max-w-[1400px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

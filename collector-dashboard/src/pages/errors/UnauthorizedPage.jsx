import { ShieldAlert } from 'lucide-react'
import { Button } from '../../components/ui/Button'

export function UnauthorizedPage({ email, onSignOut }) {
  return (
    <main className="flex min-h-full items-center justify-center px-4">
      <div className="max-w-md text-center">
        <ShieldAlert className="mx-auto size-10 text-red-700" aria-hidden />
        <h1 className="mt-4 font-serif text-2xl font-bold text-brand-900">You cannot open this dashboard</h1>
        <p className="mt-2 text-sm text-muted">
          {email ? <strong className="text-ink">{email}</strong> : 'This account'} is not a Collector Office account.
          Officers should use the Collection Point or Distribution Center mobile app.
        </p>
        <Button className="mt-6" onClick={() => void onSignOut()}>
          Sign out
        </Button>
      </div>
    </main>
  )
}

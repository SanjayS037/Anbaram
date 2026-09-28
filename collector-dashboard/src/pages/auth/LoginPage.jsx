import { useState } from 'react'
import { Navigate, useLocation } from 'react-router'
import { ShieldCheck } from 'lucide-react'
import { useAuth } from '../../hooks/authContext'
import { Button } from '../../components/ui/Button'
import { BrandLogo, GovtMark } from '../../components/domain/BrandMark'
import { appConfig } from '../../lib/config'

function describeError(err) {
  if (err instanceof Error) {
    if (err.name === 'NotAdminError') return err.message
    if (/invalid login credentials/i.test(err.message)) return 'Wrong email or password. Please try again.'
    return err.message
  }
  return 'Could not sign in. Please try again.'
}

export function LoginPage() {
  const { state, signIn } = useAuth()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  if (state.status === 'admin') {
    const from = location.state?.from ?? '/overview'
    return <Navigate to={from} replace />
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await signIn(email.trim(), password)
    } catch (err) {
      setError(describeError(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="grid min-h-full lg:grid-cols-[1.1fr_1fr]">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-brand-800 p-10 text-white lg:flex">
        <GovtMark inverted />
        <div className="max-w-md">
          <BrandLogo
            alt="Anbaram — Chengalpattu District Administration"
            className="mb-8 size-36 shadow-lg ring-4 ring-white/15"
          />
          <p className="text-xs font-semibold tracking-[0.18em] text-brand-200 uppercase">{appConfig.breadcrumb}</p>
          <h1 className="mt-3 font-serif text-4xl leading-tight font-bold">{appConfig.consoleTitle}</h1>
          <p className="mt-4 text-sm leading-relaxed text-brand-100">
            See donations moving from collection points to distribution centers, approve officers and see reports for
            the whole district.
          </p>
        </div>
        <p className="text-xs text-brand-200">For Collector Office staff only.</p>
        <div
          aria-hidden
          className="absolute -right-24 -bottom-24 size-80 rounded-full border-[40px] border-brand-700/60"
        />
      </aside>

      <main className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <GovtMark />
          </div>
          <h2 className="font-serif text-2xl font-bold text-brand-900">Sign in</h2>
          <p className="mt-1 text-sm text-muted">Use the email and password given to you by the Collector Office.</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4" noValidate>
            <div>
              <label htmlFor="email" className="text-sm font-medium text-ink">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 h-10 w-full rounded-md border border-line bg-surface px-3 text-sm focus:border-brand-500 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="password" className="text-sm font-medium text-ink">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 h-10 w-full rounded-md border border-line bg-surface px-3 text-sm focus:border-brand-500 focus:outline-none"
              />
            </div>

            {error && (
              <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800 ring-1 ring-red-200">
                {error}
              </p>
            )}

            <Button type="submit" loading={submitting} disabled={!email || !password} className="w-full">
              Sign in
            </Button>
          </form>

          <p className="mt-8 flex items-center gap-2 text-xs text-muted">
            <ShieldCheck className="size-4 text-brand-600" aria-hidden />
            Only Collector Office staff can sign in here.
          </p>
        </div>
      </main>
    </div>
  )
}

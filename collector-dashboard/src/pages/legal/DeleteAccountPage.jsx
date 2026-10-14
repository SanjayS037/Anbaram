import { useEffect, useId, useState } from 'react'
import { Link } from 'react-router'
import { createClient } from '@supabase/supabase-js'
import { CheckCircle2, ShieldCheck, Trash2 } from 'lucide-react'
import { GovtMark } from '../../components/domain/BrandMark'
import { Button } from '../../components/ui/Button'
import { Field, Input } from '../../components/ui/Form'
import { env } from '../../lib/env'
import { CONTACT_ADDRESS, CONTACT_EMAIL } from './contact'

/**
 * Public "Delete account" page (no dashboard login needed) — the link given
 * to Google Play. Address: /delete-account
 *
 * The officer signs in here with the email + password they use in the app,
 * so only the owner of an account can delete it. The actual deletion runs
 * on the server, in the `delete-account` Edge Function (see
 * supabase/migrations/005_delete_officer_account.sql for what is kept).
 */

// A separate, memory-only Supabase client: signing in here never touches the
// dashboard's own login, and nothing is saved in the browser.
function oneTimeClient() {
  return createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'anbaram-delete' },
  })
}

async function deleteMyAccount(email, password) {
  const client = oneTimeClient()
  const { error: signInError } = await client.auth.signInWithPassword({ email, password })
  if (signInError) {
    throw new Error(
      /invalid login credentials/i.test(signInError.message)
        ? 'Wrong email or password. Use the same ones you use in the Anbaram app.'
        : signInError.message,
    )
  }

  const { data, error } = await client.functions.invoke('delete-account', { method: 'POST' })
  if (error || !data?.deleted) {
    await client.auth.signOut().catch(() => {})
    const message = (await error?.context?.json?.().catch(() => null))?.error
    throw new Error(message ?? 'Could not delete the account right now. Please try again later.')
  }
  return data
}

function Bullets({ items }) {
  return (
    <ul className="list-disc space-y-2 pl-6">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  )
}

function Heading({ children }) {
  return <h2 className="border-l-4 border-brand-700 pl-3 text-lg font-bold text-brand-800">{children}</h2>
}

export function DeleteAccountPage() {
  const formId = useId()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(null)

  useEffect(() => {
    document.title = 'Delete Account — Anbaram'
  }, [])

  async function submit(event) {
    event.preventDefault()
    setError(null)
    setBusy(true)
    try {
      setDone(await deleteMyAccount(email.trim(), password))
      setPassword('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete the account. Please try again later.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-full bg-white">
      <div className="mx-auto max-w-3xl px-5 pt-10 pb-20 text-[15.5px] leading-relaxed text-ink">
        <header className="border-b-[3px] border-brand-700 pb-5">
          <GovtMark />
          <p className="mt-6 text-xs tracking-[0.06em] text-muted uppercase">Chengalpattu District Administration</p>
          <h1 className="mt-1 font-serif text-3xl font-bold text-brand-800">Anbaram — Delete Your Account</h1>
        </header>

        <p className="mt-8">
          If you are a Nodal Officer (Collection Point or Distribution Center) using the <strong>Anbaram</strong> app,
          you can delete your account on this page. Sign in with the same email and password you use in the app. Your
          account is deleted straight away.
        </p>

        <section className="mt-10 space-y-3">
          <Heading>What is deleted</Heading>
          <Bullets
            items={[
              'Your login (email and password). You will not be able to sign in to the app again.',
              'Your name, phone number, email address and organisation name.',
              'Your link to your collection point or distribution center.',
            ]}
          />
        </section>

        <section className="mt-10 space-y-3">
          <Heading>What is kept, and why</Heading>
          <p>
            Donation records you entered — shipments (weights, item photos, vehicle number, dates), flags and stock
            updates — are part of the district&apos;s official records, so they are kept. After deletion they show
            &quot;Deleted account&quot; instead of your name and do not contain your personal details. These records are
            kept for as long as the district needs them for its records and reports.
          </p>
        </section>

        <section className="mt-10">
          <Heading>Delete my account</Heading>

          {done ? (
            <div role="status" className="mt-4 flex gap-3 rounded-lg bg-brand-50 px-5 py-4 ring-1 ring-brand-200">
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-brand-700" aria-hidden />
              <div>
                <p className="font-semibold text-brand-800">Your account has been deleted.</p>
                <p className="mt-1 text-sm">
                  You can no longer sign in to the Anbaram app with this email.
                  {done.keptRecords &&
                    ' The donation records you entered are kept without your personal details, as explained above.'}
                </p>
              </div>
            </div>
          ) : (
            <form
              id={formId}
              onSubmit={submit}
              className="mt-4 space-y-4 rounded-lg border border-line bg-canvas p-5 sm:p-6"
            >
              <Field label="Email" htmlFor={`${formId}-email`}>
                <Input
                  id={`${formId}-email`}
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Field>
              <Field label="Password" htmlFor={`${formId}-password`} hint="The password you use in the Anbaram app.">
                <Input
                  id={`${formId}-password`}
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </Field>

              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-1 size-4 accent-red-700"
                />
                <span>I understand that my account will be deleted for good and this cannot be undone.</span>
              </label>

              {error && (
                <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800 ring-1 ring-red-200">
                  {error}
                </p>
              )}

              <Button type="submit" variant="danger" loading={busy} disabled={!email || !password || !agreed}>
                <Trash2 className="size-4" aria-hidden /> Delete my account
              </Button>

              <p className="flex items-center gap-2 text-xs text-muted">
                <ShieldCheck className="size-4 text-brand-600" aria-hidden />
                Your password is checked by our sign-in service and is not stored by this page.
              </p>
            </form>
          )}
        </section>

        <section className="mt-10 space-y-3">
          <Heading>Can&apos;t sign in?</Heading>
          <p>
            If you forgot your password or no longer have access to your email, ask the District Administration to
            delete your account. Write from the email linked to your account, or include your name, phone number and the
            place you were assigned to, so we can confirm it is you.
          </p>
          <div className="rounded-lg bg-brand-50 px-5 py-4">
            Chengalpattu District Administration
            <br />
            Anbaram Donation Drive Initiative
            <br />
            Email: <em>{CONTACT_EMAIL}</em>
            <br />
            Address: <em>{CONTACT_ADDRESS}</em>
          </div>
        </section>

        <footer className="mt-12 border-t border-line pt-5 text-sm text-muted">
          Anbaram — An initiative of the Chengalpattu District Administration, Government of Tamil Nadu.
          <span className="mx-2" aria-hidden>
            ·
          </span>
          <Link to="/privacy-policy" className="text-brand-700 underline">
            Privacy Policy
          </Link>
        </footer>
      </div>
    </div>
  )
}

import { useCallback, useEffect, useMemo, useState } from 'react'
import * as authService from '../services/auth'
import { queryClient } from '../lib/queryClient'
import { AuthContext } from './authContext'

export function AuthProvider({ children }) {
  // undefined = not yet known, null = signed out
  const [session, setSession] = useState(undefined)
  const [lookup, setLookup] = useState(null)
  const [attempt, setAttempt] = useState(0)

  // Track the Supabase session. Supabase warns against awaiting other
  // supabase calls inside onAuthStateChange, so the admin lookup runs in
  // the effect below instead.
  useEffect(() => {
    authService.getSession().then(setSession, () => setSession(null))
    return authService.onAuthChange((next) => {
      if (!next) queryClient.clear()
      setSession(next)
    })
  }, [])

  const userId = session?.user.id

  // Look up the admins row whenever the signed-in user changes. Token
  // refreshes keep the same user id, so they don't trigger a re-check.
  useEffect(() => {
    if (!userId) return
    let cancelled = false
    authService.fetchAdminProfile(userId).then(
      (admin) => !cancelled && setLookup({ userId, attempt, admin }),
      (error) => !cancelled && setLookup({ userId, attempt, error }),
    )
    return () => {
      cancelled = true
    }
  }, [userId, attempt])

  const state = useMemo(() => {
    if (session === undefined) return { status: 'loading' }
    if (!session) return { status: 'signed_out' }
    if (!lookup || lookup.userId !== session.user.id || lookup.attempt !== attempt) return { status: 'loading' }
    if ('error' in lookup) return { status: 'error', session, error: lookup.error }
    return lookup.admin ? { status: 'admin', session, admin: lookup.admin } : { status: 'not_admin', session }
  }, [session, lookup, attempt])

  const signIn = useCallback(async (email, password) => {
    await authService.signInAsAdmin(email, password)
  }, [])

  const signOut = useCallback(async () => {
    await authService.signOut()
  }, [])

  const retry = useCallback(() => setAttempt((n) => n + 1), [])

  const value = useMemo(() => ({ state, signIn, signOut, retry }), [state, signIn, signOut, retry])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

import { supabase } from '../lib/supabase'

export class NotAdminError extends Error {
  constructor() {
    super('This account cannot open the Collector Office dashboard.')
    this.name = 'NotAdminError'
  }
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  return data.session
}

/**
 * Returns the admins row for the signed-in user, or null if they have none.
 * RLS (admins_select) only returns a row when id = auth.uid() or the
 * caller is an admin, so a non-admin always gets null here.
 */
export async function fetchAdminProfile(userId) {
  const { data, error } = await supabase.from('admins').select('*').eq('id', userId).maybeSingle()
  if (error) throw error
  return data
}

/** Signs in and verifies admin access; signs straight back out if the user is not an admin. */
export async function signInAsAdmin(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error

  let profile
  try {
    profile = await fetchAdminProfile(data.user.id)
  } catch (err) {
    await supabase.auth.signOut()
    throw err
  }
  if (!profile) {
    await supabase.auth.signOut()
    throw new NotAdminError()
  }
  return profile
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export function onAuthChange(callback) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => callback(session))
  return () => data.subscription.unsubscribe()
}

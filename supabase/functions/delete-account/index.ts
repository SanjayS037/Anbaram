// =====================================================================
// ANBARAM — Edge Function: delete-account
//
// Called by the public "Delete account" page (/delete-account), which
// Google Play needs. The officer first signs in on that page with their
// own email + password; this function deletes ONLY that signed-in person.
// Nobody can delete someone else's account just by typing an email.
//
// Steps:
//   1. Check the login token -> who is asking.
//   2. delete_officer_account() (migration 005): frees their place and
//      either deletes the profile or erases its personal details when
//      shipments / flags / stock rows point at it (records are kept).
//   3. Delete the login. If records are kept, a "soft" delete is used: the
//      login row stays only as an anonymous id for those records, its email
//      and password are wiped and it can never sign in again.
//
// Uses SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, which Supabase provides
// automatically. The service role key never leaves the server.
// =====================================================================
import { createClient } from 'jsr:@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function reply(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return reply(405, { error: 'Use POST.' })

  const url = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !serviceKey) return reply(500, { error: 'The server is not set up yet.' })

  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (!token) return reply(401, { error: 'Please sign in first.' })

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })

  // 1. Who is asking? (the token must be a real, current login)
  const { data: userData, error: userError } = await admin.auth.getUser(token)
  const user = userData?.user
  if (userError || !user) return reply(401, { error: 'Your sign-in has expired. Please sign in again.' })

  // 2. Profile: free their place, then delete or anonymise it.
  const { data: outcome, error: dbError } = await admin.rpc('delete_officer_account', { p_user_id: user.id })
  if (dbError) {
    if (dbError.code === '42501') return reply(403, { error: dbError.message })
    console.error('delete_officer_account failed', dbError)
    return reply(500, { error: 'Could not delete the account. Please try again later.' })
  }

  // 3. Login. Soft delete when records still point at this person.
  const keptRecords = outcome === 'anonymized'
  const { error: authError } = await admin.auth.admin.deleteUser(user.id, keptRecords)
  if (authError) {
    console.error('auth deleteUser failed', authError)
    return reply(500, { error: 'Could not delete the account. Please try again later.' })
  }

  return reply(200, { deleted: true, keptRecords })
})

// =====================================================================
// ANBARAM — Edge Function: cloudinary-sign
//
// Gives the Collector dashboard a one-time signature so it can upload a
// photo of a collection point / distribution center straight to Cloudinary.
// The Cloudinary API SECRET stays here (a Supabase secret) and is never
// sent to the browser.
//
// Only Collector Office admins get a signature (checked with is_admin()).
// Each place has one fixed Cloudinary spot, so a new photo replaces the old:
//   anbaram/collection-points/<id>     anbaram/distribution-centers/<id>
//
// Secrets to set (Supabase → Edge Functions → Secrets):
//   CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
// =====================================================================
import { createClient } from 'jsr:@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const FOLDERS: Record<string, string> = { collection_point: 'collection-points', distribution_center: 'distribution-centers' }
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function reply(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })
}

/** Cloudinary signature: SHA-1 of "key=value&key=value…" (keys sorted) followed by the API secret. */
export async function cloudinarySignature(params: Record<string, string>, apiSecret: string) {
  const toSign =
    Object.keys(params)
      .sort()
      .map((k) => `${k}=${params[k]}`)
      .join('&') + apiSecret
  const hash = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(toSign))
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return reply(405, { error: 'Use POST.' })

  const cloudName = Deno.env.get('CLOUDINARY_CLOUD_NAME')
  const apiKey = Deno.env.get('CLOUDINARY_API_KEY')
  const apiSecret = Deno.env.get('CLOUDINARY_API_SECRET')
  if (!cloudName || !apiKey || !apiSecret) return reply(500, { error: 'Cloudinary secrets are not set in Supabase.' })

  // Act as the person calling, so is_admin() checks *their* login.
  // SUPABASE_URL and SUPABASE_ANON_KEY are provided automatically by Supabase.
  const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  })
  const { data: isAdmin, error } = await supabase.rpc('is_admin')
  if (error || isAdmin !== true) return reply(403, { error: 'Only Collector Office staff can upload photos.' })

  let body
  try {
    body = await req.json()
  } catch {
    return reply(400, { error: 'Bad request.' })
  }
  const folder = FOLDERS[body?.type]
  if (!folder || typeof body?.id !== 'string' || !UUID.test(body.id)) return reply(400, { error: 'Bad place type or id.' })

  const params = {
    public_id: `anbaram/${folder}/${body.id}`,
    overwrite: 'true', // replace this place's old photo
    invalidate: 'true', // clear Cloudinary's cached copy of the old photo
    timestamp: String(Math.floor(Date.now() / 1000)),
  }
  const signature = await cloudinarySignature(params, apiSecret)

  return reply(200, { cloudName, apiKey, signature, ...params })
})

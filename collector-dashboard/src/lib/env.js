function required(name, value) {
  if (!value) {
    throw new Error(`Missing ${name}. Copy .env.example to .env.local and fill it in.`)
  }
  return value
}

export const env = {
  supabaseUrl: required('VITE_SUPABASE_URL', import.meta.env.VITE_SUPABASE_URL),
  // The public (anon / publishable) key. Never put the service_role key here.
  supabaseAnonKey: required('VITE_SUPABASE_ANON_KEY', import.meta.env.VITE_SUPABASE_ANON_KEY),
}

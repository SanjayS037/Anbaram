import { createClient } from '@supabase/supabase-js'
import { env } from './env'

// Logins are kept in sessionStorage, not localStorage: the browser clears it
// when the tab or window is closed, so the next visit asks for login again.
// A page refresh keeps the login.
//
// Remove logins saved by older versions (localStorage), so an old session
// cannot skip the login screen.
try {
  for (const key of Object.keys(window.localStorage)) {
    if (key.startsWith('sb-') && key.endsWith('-auth-token')) window.localStorage.removeItem(key)
  }
} catch {
  // Storage blocked (private mode etc.) — nothing to clean.
}

export const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
  auth: { persistSession: true, autoRefreshToken: true, storage: window.sessionStorage },
})

import { createContext, useContext } from 'react'
export const AuthContext = createContext(null)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}

/** For components that only render inside RequireAdmin. */
export function useAdmin() {
  const { state } = useAuth()
  if (state.status !== 'admin') throw new Error('useAdmin used outside an admin session')
  return state.admin
}

import { Navigate, useLocation } from 'react-router'
import { useAuth } from '../hooks/authContext'
import { ErrorState, Spinner } from '../components/ui/States'
import { UnauthorizedPage } from '../pages/errors/UnauthorizedPage'

/**
 * UX guard only. Real authorization is enforced by Postgres RLS
 * (is_admin()) on every query, so bypassing this component exposes nothing.
 */
export function RequireAdmin({ children }) {
  const { state, retry, signOut } = useAuth()
  const location = useLocation()

  switch (state.status) {
    case 'loading':
      return <Spinner label="Checking your login…" className="h-full" />
    case 'signed_out':
      return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
    case 'not_admin':
      return <UnauthorizedPage email={state.session.user.email} onSignOut={signOut} />
    case 'error':
      return (
        <div className="flex h-full items-center justify-center">
          <ErrorState title="Could not check your login" error={state.error} onRetry={retry} />
        </div>
      )
    case 'admin':
      return <>{children}</>
  }
}

import { Link } from 'react-router'

export function NotFoundPage() {
  return (
    <div className="flex flex-col items-center gap-2 py-24 text-center">
      <p className="font-serif text-4xl font-bold text-brand-800">404</p>
      <p className="text-sm text-muted">This page is not available.</p>
      <Link to="/overview" className="mt-2 text-sm font-semibold text-brand-700 underline underline-offset-2">
        Go to Home
      </Link>
    </div>
  )
}

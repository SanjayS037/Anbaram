import { Navigate, useParams } from 'react-router'

/** Old detail-page URLs (e.g. /collection-points/<id>) now open that item's side panel on the list page. */
export function PanelRedirect({ to }) {
  const { id = '' } = useParams()
  return <Navigate to={`${to}?open=${encodeURIComponent(id)}`} replace />
}

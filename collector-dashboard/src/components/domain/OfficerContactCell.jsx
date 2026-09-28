import { Phone } from 'lucide-react'

/**
 * The person to call about a location = its currently assigned nodal officer,
 * read live from the officers table, so it updates the moment an officer is
 * reassigned. (The location's own "contact person" is a separate, manually
 * typed field shown only on the details page.)
 */
export function OfficerContactCell({ officer }) {
  if (!officer) return <span className="text-xs font-semibold text-amber-800">No officer assigned</span>
  return (
    <div className="whitespace-nowrap">
      <p>{officer.full_name}</p>
      <a
        href={`tel:${officer.phone}`}
        onClick={(e) => e.stopPropagation()}
        className="flex items-center gap-1 text-xs text-muted hover:underline"
      >
        <Phone className="size-3" aria-hidden />
        {officer.phone}
      </a>
    </div>
  )
}

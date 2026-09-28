import { useId, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { AlertTriangle, MapPin } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { SearchInput } from '../../components/ui/Form'
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/States'
import { useApproveOfficer, useAssignableLocations, useAssignOfficer } from '../../hooks/useOfficers'
import { locationTypeForRole } from '../../services/officers'
import { cn } from '../../utils/cn'

/**
 * Approve a pending officer (location required), or move an approved officer.
 * Only locations matching the officer's registered role are offered, which
 * mirrors the officer_role_location_match constraint in the schema.
 */
export function AssignLocationDialog({ officer, mode, open, onClose }) {
  const type = locationTypeForRole(officer.role)
  const noun = type === 'collection_point' ? 'collection point' : 'distribution center'
  const locations = useAssignableLocations(type, open)
  const approve = useApproveOfficer()
  const assign = useAssignOfficer()
  const busy = approve.isPending || assign.isPending
  const [selected, setSelected] = useState(null)
  const [search, setSearch] = useState('')
  const groupId = useId()

  const currentId = officer.assigned_collection_point_id ?? officer.assigned_distribution_center_id
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return (locations.data ?? []).filter((l) =>
      !term ? true : [l.name, l.short_code, l.zone, l.address].some((v) => v?.toLowerCase().includes(term)),
    )
  }, [locations.data, search])

  const chosen = locations.data?.find((l) => l.id === selected)
  const displaced = chosen?.officer && chosen.officer.id !== officer.id ? chosen.officer : null
  const freeCount = (locations.data ?? []).filter((l) => !l.officer).length

  function close() {
    setSelected(null)
    setSearch('')
    onClose()
  }

  function confirm() {
    if (!selected) return
    const done = { onSuccess: close }
    if (mode === 'approve') {
      approve.mutate({ officerId: officer.id, locationId: selected, officerName: officer.full_name }, done)
    } else {
      assign.mutate({ type, locationId: selected, officerId: officer.id, officerName: officer.full_name }, done)
    }
  }

  return (
    <Modal
      open={open}
      onClose={close}
      busy={busy}
      title={mode === 'approve' ? `Approve ${officer.full_name}` : `Move ${officer.full_name}`}
      description={
        mode === 'approve'
          ? `This officer signed up for a ${noun}. Choose the ${noun} they will look after.`
          : `Move this officer to a different ${noun}. The change works right away.`
      }
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={confirm} disabled={!selected || selected === currentId} loading={busy}>
            {mode === 'approve' ? 'Approve' : 'Move'}
          </Button>
        </>
      }
    >
      {locations.isPending ? (
        <div className="space-y-2">
          <Skeleton className="h-10" />
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
        </div>
      ) : locations.isError ? (
        <ErrorState error={locations.error} onRetry={() => void locations.refetch()} />
      ) : !locations.data.length || (mode === 'approve' && freeCount === 0) ? (
        <EmptyState
          title={locations.data.length ? `Every open ${noun} already has an officer` : `No open ${noun}s yet`}
          description={`First add a new ${noun}, or remove an officer from one, then approve this officer.`}
          action={
            <Link
              to={type === 'collection_point' ? '/collection-points' : '/distribution-centers'}
              className="text-sm font-semibold text-brand-700 hover:underline"
            >
              Go to {noun}s
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder={`Search ${noun}s by name, code or taluk`}
            label={`Search ${noun}s`}
          />
          <fieldset>
            <legend className="sr-only">Choose a {noun}</legend>
            <ul className="max-h-80 space-y-1.5 overflow-y-auto pr-1">
              {filtered.map((loc) => {
                const occupiedByOther = !!loc.officer && loc.officer.id !== officer.id
                const disabled = (mode === 'approve' && occupiedByOther) || loc.id === currentId
                const inputId = `${groupId}-${loc.id}`
                return (
                  <li key={loc.id}>
                    <label
                      htmlFor={inputId}
                      className={cn(
                        'flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2.5 transition-colors',
                        selected === loc.id ? 'border-brand-600 bg-brand-50' : 'border-line hover:bg-brand-50/50',
                        disabled && 'cursor-not-allowed opacity-55 hover:bg-transparent',
                      )}
                    >
                      <input
                        id={inputId}
                        type="radio"
                        name={groupId}
                        value={loc.id}
                        checked={selected === loc.id}
                        disabled={disabled}
                        onChange={() => setSelected(loc.id)}
                        className="mt-1 accent-brand-700"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold">
                          {loc.name}
                          {loc.short_code && <span className="ml-1 font-normal text-muted">({loc.short_code})</span>}
                        </span>
                        <span className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted">
                          <MapPin className="size-3 shrink-0" aria-hidden />
                          {[loc.zone, loc.address].filter(Boolean).join(' · ')}
                        </span>
                      </span>
                      <span className="shrink-0 text-[11px] font-semibold">
                        {loc.id === currentId ? (
                          <span className="text-brand-700">Current</span>
                        ) : loc.officer ? (
                          <span className="text-amber-800">Officer: {loc.officer.full_name}</span>
                        ) : (
                          <span className="text-emerald-700">Free</span>
                        )}
                      </span>
                    </label>
                  </li>
                )
              })}
              {!filtered.length && (
                <li className="py-6 text-center text-sm text-muted">
                  No {noun}s match “{search}”.
                </li>
              )}
            </ul>
          </fieldset>

          {displaced && (
            <p
              role="alert"
              className="flex gap-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900 ring-1 ring-amber-200"
            >
              <AlertTriangle className="size-4 shrink-0" aria-hidden />
              {displaced.full_name} is the officer here now. They will stay approved, but will have no place (and cannot
              see its data) until you move them.
            </p>
          )}
        </div>
      )}
    </Modal>
  )
}

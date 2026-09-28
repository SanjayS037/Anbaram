import { useId, useMemo, useState } from 'react'
import { AlertTriangle, ArrowLeftRight, Phone, UserMinus, UserPlus } from 'lucide-react'
import { Card, CardBody, CardHeader } from '../ui/Card'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { SearchInput } from '../ui/Form'
import { EmptyState, ErrorState, Skeleton } from '../ui/States'
import { useAssignableOfficers, useUnassignLocation } from '../../hooks/useLocations'
import { useAssignOfficer } from '../../hooks/useOfficers'
import { cn } from '../../utils/cn'
import { initials } from '../../utils/format'

/** Shows the officer responsible for a location and lets the admin assign / change / unassign. */
export function OfficerAssignmentCard({ type, location }) {
  const [dialog, setDialog] = useState(null)
  const unassign = useUnassignLocation()
  const officer = location.officer
  const inactive = location.status !== 'active'

  return (
    <Card>
      <CardHeader title="Officer" subtitle="The officer who looks after this place using the mobile app" />
      <CardBody>
        {officer ? (
          <div className="flex items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-brand-700 text-sm font-bold text-white">
              {initials(officer.full_name)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{officer.full_name}</p>
              <p className="flex items-center gap-1 text-xs text-muted">
                <Phone className="size-3" aria-hidden />
                <a href={`tel:${officer.phone}`} className="hover:underline">
                  {officer.phone}
                </a>
                <span aria-hidden>·</span>
                <span className="truncate">{officer.email}</span>
              </p>
            </div>
          </div>
        ) : (
          <p className="flex items-center gap-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900 ring-1 ring-amber-200">
            <AlertTriangle className="size-4 shrink-0" aria-hidden />
            No officer yet. Nobody can record {type === 'collection_point' ? 'collections' : 'deliveries'} here until
            you add one.
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={officer ? 'secondary' : 'primary'}
            onClick={() => setDialog('assign')}
            disabled={inactive}
          >
            {officer ? <ArrowLeftRight className="size-4" aria-hidden /> : <UserPlus className="size-4" aria-hidden />}
            {officer ? 'Change officer' : 'Add officer'}
          </Button>
          {officer && (
            <Button size="sm" variant="secondary" className="text-red-800" onClick={() => setDialog('unassign')}>
              <UserMinus className="size-4" aria-hidden />
              Remove officer
            </Button>
          )}
        </div>
        {inactive && <p className="mt-2 text-xs text-muted">Open this place first, then add an officer.</p>}
      </CardBody>

      {dialog === 'assign' && <AssignOfficerDialog type={type} location={location} onClose={() => setDialog(null)} />}

      {officer && (
        <ConfirmDialog
          open={dialog === 'unassign'}
          onClose={() => setDialog(null)}
          busy={unassign.isPending}
          title={`Remove ${officer.full_name} from this place?`}
          confirmLabel="Remove"
          onConfirm={() =>
            unassign.mutate(
              { type, id: location.id, officerName: officer.full_name },
              { onSuccess: () => setDialog(null) },
            )
          }
        >
          They can no longer see <strong className="text-ink">{location.name}</strong> in their app. Their account stays
          approved, so you can give them another place later from the Officers page.
        </ConfirmDialog>
      )}
    </Card>
  )
}

function AssignOfficerDialog({ type, location, onClose }) {
  const role = type === 'collection_point' ? 'collection_point' : 'distribution_point'
  const noun = type === 'collection_point' ? 'collection point' : 'distribution center'
  const officers = useAssignableOfficers(role)
  const assign = useAssignOfficer()
  const [selected, setSelected] = useState(null)
  const [search, setSearch] = useState('')
  const groupId = useId()

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return (officers.data ?? []).filter((o) =>
      !term ? true : [o.full_name, o.phone, o.organization_name].some((v) => v.toLowerCase().includes(term)),
    )
  }, [officers.data, search])

  const chosen = officers.data?.find((o) => o.id === selected)
  const chosenCurrent = chosen ? (chosen.collection_point ?? chosen.distribution_center) : null

  return (
    <Modal
      open
      onClose={onClose}
      busy={assign.isPending}
      title={`Add an officer to ${location.name}`}
      description={`Only approved ${noun} officers are shown.`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={assign.isPending}>
            Cancel
          </Button>
          <Button
            disabled={!selected || selected === location.officer?.id}
            loading={assign.isPending}
            onClick={() =>
              chosen &&
              assign.mutate(
                { type, locationId: location.id, officerId: chosen.id, officerName: chosen.full_name },
                { onSuccess: onClose },
              )
            }
          >
            Assign
          </Button>
        </>
      }
    >
      {officers.isPending ? (
        <div className="space-y-2">
          <Skeleton className="h-10" />
          <Skeleton className="h-14" />
        </div>
      ) : officers.isError ? (
        <ErrorState error={officers.error} onRetry={() => void officers.refetch()} />
      ) : !officers.data.length ? (
        <EmptyState
          title={`No approved ${noun} officers`}
          description="First approve a new officer on the Officers page. While approving, you can choose this place."
        />
      ) : (
        <div className="space-y-3">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search by name, phone or office"
            label="Search officers"
          />
          <fieldset>
            <legend className="sr-only">Choose an officer</legend>
            <ul className="max-h-80 space-y-1.5 overflow-y-auto pr-1">
              {filtered.map((o) => {
                const current = o.collection_point ?? o.distribution_center
                const here = o.id === location.officer?.id
                const inputId = `${groupId}-${o.id}`
                return (
                  <li key={o.id}>
                    <label
                      htmlFor={inputId}
                      className={cn(
                        'flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2.5',
                        selected === o.id ? 'border-brand-600 bg-brand-50' : 'border-line hover:bg-brand-50/50',
                        here && 'cursor-not-allowed opacity-55',
                      )}
                    >
                      <input
                        id={inputId}
                        type="radio"
                        name={groupId}
                        checked={selected === o.id}
                        disabled={here}
                        onChange={() => setSelected(o.id)}
                        className="mt-1 accent-brand-700"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold">{o.full_name}</span>
                        <span className="block truncate text-xs text-muted">
                          {o.organization_name} · {o.phone}
                        </span>
                      </span>
                      <span className="shrink-0 text-[11px] font-semibold">
                        {here ? (
                          <span className="text-brand-700">Current</span>
                        ) : current ? (
                          <span className="text-amber-800">At {current.name}</span>
                        ) : (
                          <span className="text-emerald-700">Free</span>
                        )}
                      </span>
                    </label>
                  </li>
                )
              })}
              {!filtered.length && (
                <li className="py-6 text-center text-sm text-muted">No officers match “{search}”.</li>
              )}
            </ul>
          </fieldset>
          {(chosenCurrent || location.officer) && selected && (
            <p
              role="alert"
              className="flex gap-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900 ring-1 ring-amber-200"
            >
              <AlertTriangle className="size-4 shrink-0" aria-hidden />
              <span>
                {chosenCurrent && (
                  <>
                    {chosen?.full_name} will leave {chosenCurrent.name}, so that place will have no officer.{' '}
                  </>
                )}
                {location.officer && (
                  <>
                    {location.officer.full_name} will be removed from this {noun}.
                  </>
                )}
              </span>
            </p>
          )}
        </div>
      )}
    </Modal>
  )
}

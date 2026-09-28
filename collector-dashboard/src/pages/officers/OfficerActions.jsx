import { useState } from 'react'
import { ArrowLeftRight, Check, UserMinus, X } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { ReasonDialog } from '../../components/domain/ReasonDialog'
import { useRejectOfficer, useRemoveOfficer } from '../../hooks/useOfficers'
import { AssignLocationDialog } from './AssignLocationDialog'

/** Status-appropriate actions for one officer: pending → approve/reject, approved → reassign/remove. */
export function OfficerActions({ officer, size = 'sm' }) {
  const [dialog, setDialog] = useState(null)
  const reject = useRejectOfficer()
  const remove = useRemoveOfficer()
  const close = () => setDialog(null)

  if (officer.status === 'rejected') return null

  return (
    <div className={size === 'sm' ? 'flex items-center gap-2' : 'flex flex-wrap items-center gap-2'}>
      {officer.status === 'pending' ? (
        <>
          <Button size={size} onClick={() => setDialog('approve')}>
            <Check className="size-4" aria-hidden />
            Approve
          </Button>
          <Button size={size} variant="secondary" onClick={() => setDialog('reject')} className="text-red-800">
            <X className="size-4" aria-hidden />
            Reject
          </Button>
        </>
      ) : (
        <>
          <Button size={size} variant="secondary" onClick={() => setDialog('reassign')}>
            <ArrowLeftRight className="size-4" aria-hidden />
            Move
          </Button>
          <Button size={size} variant="secondary" onClick={() => setDialog('remove')} className="text-red-800">
            <UserMinus className="size-4" aria-hidden />
            Remove
          </Button>
        </>
      )}

      {(dialog === 'approve' || dialog === 'reassign') && (
        <AssignLocationDialog officer={officer} mode={dialog} open onClose={close} />
      )}

      <ReasonDialog
        open={dialog === 'reject'}
        onClose={close}
        title={`Reject ${officer.full_name}?`}
        description="This officer will not be able to use the app. They will see the reason you write below."
        label="Why are you rejecting?"
        placeholder="For example: Office details could not be checked"
        confirmLabel="Reject"
        busy={reject.isPending}
        onConfirm={(reason) =>
          reject.mutate({ officerId: officer.id, reason, officerName: officer.full_name }, { onSuccess: close })
        }
      />

      <ReasonDialog
        open={dialog === 'remove'}
        onClose={close}
        title={`Remove ${officer.full_name}?`}
        description={
          <>
            They will be removed from{' '}
            <strong className="text-ink">
              {officer.collection_point?.name ?? officer.distribution_center?.name ?? 'their location'}
            </strong>{' '}
            and cannot use the app anymore. Their old shipments are kept.
          </>
        }
        label="Why are you removing them?"
        placeholder="For example: Moved to another taluk"
        confirmLabel="Remove officer"
        busy={remove.isPending}
        onConfirm={(reason) =>
          remove.mutate({ officerId: officer.id, reason, officerName: officer.full_name }, { onSuccess: close })
        }
      />
    </div>
  )
}

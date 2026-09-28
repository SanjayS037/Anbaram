import { useId, useState } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Field, Textarea } from '../ui/Form'

const MIN_LENGTH = 5

/** Confirmation dialog for destructive actions that must record a reason (reject / remove). */
export function ReasonDialog({ open, onClose, title, description, label, placeholder, confirmLabel, busy, onConfirm }) {
  const [reason, setReason] = useState('')
  const [touched, setTouched] = useState(false)
  const id = useId()
  const trimmed = reason.trim()
  const error =
    touched && trimmed.length < MIN_LENGTH ? `Please write a reason (at least ${MIN_LENGTH} letters).` : null

  function close() {
    setReason('')
    setTouched(false)
    onClose()
  }

  function submit(event) {
    event.preventDefault()
    setTouched(true)
    if (trimmed.length >= MIN_LENGTH) onConfirm(trimmed)
  }

  return (
    <Modal
      open={open}
      onClose={close}
      busy={busy}
      size="sm"
      title={title}
      description={description}
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={busy}>
            Cancel
          </Button>
          <Button variant="danger" type="submit" form={id} loading={busy}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <form id={id} onSubmit={submit} noValidate>
        <Field
          label={label}
          htmlFor={`${id}-reason`}
          required
          error={error}
          hint="The officer will see this reason in their app."
        >
          <Textarea
            id={`${id}-reason`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            onBlur={() => setTouched(true)}
            placeholder={placeholder}
            maxLength={500}
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-reason-error` : undefined}
            autoFocus
          />
        </Field>
      </form>
    </Modal>
  )
}

import { Modal } from './Modal'
import { Button } from './Button'

/** Yes/no confirmation for actions that change access or visibility. */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  children,
  confirmLabel,
  tone = 'danger',
  busy = false,
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      busy={busy}
      size="sm"
      title={title}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant={tone} onClick={onConfirm} loading={busy}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="text-sm text-muted">{children}</div>
    </Modal>
  )
}

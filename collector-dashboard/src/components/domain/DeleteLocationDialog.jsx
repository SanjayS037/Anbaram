import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { useDeleteLocation } from '../../hooks/useLocations'

/**
 * Delete a collection point or distribution center. A place with shipments
 * cannot be deleted (records and reports need it), so the dialog explains that
 * and points to "Mark as closed" instead. The database checks this too.
 */
export function DeleteLocationDialog({ open, type, location, shipmentCount, onClose, onDeleted }) {
  const remove = useDeleteLocation()
  const kind = type === 'collection_point' ? 'collection point' : 'distribution center'
  const blocked = shipmentCount > 0

  if (blocked) {
    return (
      <Modal
        open={open}
        onClose={onClose}
        size="sm"
        title={`${location.name} cannot be deleted`}
        footer={<Button onClick={onClose}>OK</Button>}
      >
        <p className="text-sm text-muted">
          This {kind} has {shipmentCount === 1 ? '1 shipment' : `${shipmentCount} shipments`}. They are needed for
          records and reports, so the {kind} must stay. Use <strong className="text-ink">Mark as closed</strong>{' '}
          instead. A closed {kind} cannot be used by officers.
        </p>
      </Modal>
    )
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      busy={remove.isPending}
      size="sm"
      title={`Delete ${location.name}?`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={remove.isPending}>
            Cancel
          </Button>
          <Button
            variant="danger"
            loading={remove.isPending}
            onClick={() =>
              remove.mutate({ type, id: location.id, name: location.name }, { onSuccess: () => onDeleted() })
            }
          >
            Yes, delete
          </Button>
        </>
      }
    >
      <div className="space-y-2 text-sm text-muted">
        <p>This {kind} will be removed from the dashboard for good. This cannot be undone.</p>
        {location.officer && (
          <p>
            <strong className="text-ink">{location.officer.full_name}</strong> will stay approved but will have no
            place. You can give them a new place from the Officers page.
          </p>
        )}
      </div>
    </Modal>
  )
}

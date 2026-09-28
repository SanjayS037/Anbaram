import { useEffect, useId, useRef } from 'react'
import { X } from 'lucide-react'
import { cn } from '../../utils/cn'

const widths = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl' }

/** Native <dialog>: gives focus trapping, Escape handling and inert background for free. */
export function Modal({ open, onClose, title, description, children, footer, size = 'md', busy = false }) {
  const ref = useRef(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault()
        if (!busy) onClose()
      }}
      onClick={(e) => {
        if (e.target === ref.current && !busy) onClose()
      }}
      className={cn(
        'm-auto w-[calc(100%-2rem)] rounded-lg border border-line bg-surface p-0 text-ink shadow-xl backdrop:bg-brand-900/40',
        widths[size],
      )}
    >
      {open && (
        <div className="flex max-h-[85vh] flex-col">
          <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div>
              <h2 id={titleId} className="font-serif text-lg font-bold text-brand-900">
                {title}
              </h2>
              {description && <div className="mt-1 text-sm text-muted">{description}</div>}
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="rounded p-1 text-muted hover:bg-brand-50 hover:text-ink disabled:opacity-40"
              aria-label="Close"
            >
              <X className="size-5" />
            </button>
          </header>
          <div className="overflow-y-auto px-5 py-4">{children}</div>
          {footer && (
            <footer className="flex justify-end gap-2 border-t border-line bg-brand-50/50 px-5 py-3">{footer}</footer>
          )}
        </div>
      )}
    </dialog>
  )
}

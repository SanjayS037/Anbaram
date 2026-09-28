import { useEffect, useId, useRef } from 'react'
import { X } from 'lucide-react'
import { cn } from '../../utils/cn'

/**
 * Right-hand side panel for viewing / managing one item without leaving the
 * list. Native <dialog>: focus trap, Escape and backdrop-click close for free.
 * Dialogs opened from inside it (Edit, Assign…) stack on top automatically.
 */
export function Drawer({ open, onClose, title, subtitle, actions, children, width = 'lg' }) {
  const ref = useRef(null)
  const closeRef = useRef(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
      // showModal() focuses the first button (Edit); move focus to Close so nothing looks pre-selected.
      closeRef.current?.focus()
    }
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose()
      }}
      className={cn(
        'fixed inset-y-0 right-0 left-auto m-0 h-dvh max-h-none w-full bg-canvas p-0 text-ink shadow-2xl backdrop:bg-brand-900/35',
        width === 'lg' ? 'max-w-3xl' : 'max-w-xl',
        'open:animate-[drawer-in_180ms_ease-out]',
      )}
    >
      {open && (
        <div className="flex h-full flex-col">
          <header className="flex items-start gap-3 border-b border-line bg-surface px-5 py-4">
            <div className="min-w-0 flex-1">
              <h2 id={titleId} className="font-serif text-xl font-bold text-brand-900">
                {title}
              </h2>
              {subtitle && <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">{subtitle}</div>}
            </div>
            {actions && <div className="flex shrink-0 flex-wrap justify-end gap-2">{actions}</div>}
            <button
              type="button"
              ref={closeRef}
              onClick={onClose}
              className="rounded-md p-1.5 text-muted hover:bg-brand-50 hover:text-ink"
              aria-label="Close"
              title="Close (Esc)"
            >
              <X className="size-5" />
            </button>
          </header>
          <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">{children}</div>
        </div>
      )}
    </dialog>
  )
}

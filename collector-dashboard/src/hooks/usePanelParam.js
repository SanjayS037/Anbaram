import { useCallback } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router'

/**
 * Which item's side panel is open, kept in the URL (?open=<id>) so a refresh
 * or a shared link reopens it. Opening pushes a history entry, so the
 * browser's Back button closes the panel instead of leaving the page.
 */
export function usePanelParam(key = 'open') {
  const [params, setParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const openId = params.get(key)

  const open = useCallback(
    (id) =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          next.set(key, id)
          return next
        },
        { state: { panel: true } },
      ),
    [key, setParams],
  )

  const close = useCallback(() => {
    // Opened from the list → step back (restores the list URL exactly).
    // Opened from a shared link / refresh → just drop the parameter.
    if (location.state?.panel) {
      void navigate(-1)
    } else {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          next.delete(key)
          return next
        },
        { replace: true },
      )
    }
  }, [key, location.state, navigate, setParams])

  return { openId, open, close }
}

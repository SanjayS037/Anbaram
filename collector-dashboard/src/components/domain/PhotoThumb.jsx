import { ImageOff } from 'lucide-react'
import { cn } from '../../utils/cn'
import { isSafePhotoUrl } from '../../utils/urls'

export function PhotoThumb({ url, alt, className }) {
  if (!isSafePhotoUrl(url)) {
    return (
      <span
        className={cn(
          'grid place-items-center rounded-md border border-dashed border-line bg-brand-50/50 text-muted',
          className ?? 'size-16',
        )}
        title="No photo"
      >
        <ImageOff className="size-4" aria-hidden />
        <span className="sr-only">No photo</span>
      </span>
    )
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'block overflow-hidden rounded-md border border-line bg-brand-50 hover:ring-2 hover:ring-brand-300',
        className ?? 'size-16',
      )}
      title="Open big photo"
    >
      <img src={url} alt={alt} loading="lazy" className="size-full object-cover" />
    </a>
  )
}

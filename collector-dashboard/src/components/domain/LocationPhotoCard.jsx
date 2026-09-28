import { useEffect, useRef, useState } from 'react'
import { Camera, ImageOff, Trash2, Upload } from 'lucide-react'
import { Card, CardBody, CardHeader } from '../ui/Card'
import { Button } from '../ui/Button'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { useRemoveLocationPhoto, useUploadLocationPhoto } from '../../hooks/useLocations'
import { checkPhotoFile, cloudinaryThumb } from '../../services/photos'
import { isSafePhotoUrl } from '../../utils/urls'

/**
 * Photo of a collection point / distribution center. The admin uploads it
 * here; it is stored in Cloudinary and its link is saved in `photo_url`,
 * so the place's officer sees the same photo in the mobile app.
 */
export function LocationPhotoCard({ type, location }) {
  const upload = useUploadLocationPhoto()
  const remove = useRemoveLocationPhoto()
  const inputRef = useRef(null)
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [fileError, setFileError] = useState(null)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const hasPhoto = isSafePhotoUrl(location.photo_url)

  // The preview is a temporary in-browser link to the chosen file; free it when replaced or when the panel closes.
  const previewRef = useRef(null)
  const setPreviewUrl = (url) => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current)
    previewRef.current = url
    setPreview(url)
  }
  useEffect(() => () => previewRef.current && URL.revokeObjectURL(previewRef.current), [])

  function choose(event) {
    const picked = event.target.files?.[0]
    event.target.value = '' // allow choosing the same file again
    if (!picked) return
    const error = checkPhotoFile(picked)
    setFileError(error)
    setFile(error ? null : picked)
    setPreviewUrl(error ? null : URL.createObjectURL(picked))
  }

  function cancel() {
    setFile(null)
    setPreviewUrl(null)
    setFileError(null)
  }

  function save() {
    upload.mutate({ type, id: location.id, file, name: location.name }, { onSuccess: cancel })
  }

  const shown = preview ?? (hasPhoto ? cloudinaryThumb(location.photo_url, 800) : null)

  return (
    <Card>
      <CardHeader title="Photo" subtitle="Officers see this photo in their app" />
      <CardBody>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="aspect-[3/2] w-full shrink-0 overflow-hidden rounded-md border border-line bg-brand-50 sm:w-72">
            {shown ? (
              preview ? (
                <img src={shown} alt={`New photo of ${location.name}`} className="size-full object-cover" />
              ) : (
                <a href={location.photo_url} target="_blank" rel="noopener noreferrer" title="Open big photo">
                  <img
                    src={shown}
                    alt={`Photo of ${location.name}`}
                    loading="lazy"
                    className="size-full object-cover"
                  />
                </a>
              )
            ) : (
              <div className="grid size-full place-items-center text-center text-sm text-muted">
                <div>
                  <ImageOff className="mx-auto mb-1 size-6" aria-hidden />
                  No photo yet
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-1 flex-col gap-2">
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={choose}
              className="hidden"
            />

            {file ? (
              <>
                <p className="text-sm">
                  New photo chosen: <strong className="break-all">{file.name}</strong>
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={save} loading={upload.isPending}>
                    <Upload className="size-4" aria-hidden /> Save photo
                  </Button>
                  <Button variant="secondary" onClick={cancel} disabled={upload.isPending}>
                    Cancel
                  </Button>
                </div>
                {upload.isPending && <p className="text-xs text-muted">Uploading… please wait.</p>}
              </>
            ) : (
              <div className="flex flex-wrap gap-2">
                <Button variant={hasPhoto ? 'secondary' : 'primary'} onClick={() => inputRef.current?.click()}>
                  <Camera className="size-4" aria-hidden /> {hasPhoto ? 'Change photo' : 'Upload photo'}
                </Button>
                {hasPhoto && (
                  <Button variant="secondary" className="text-red-800" onClick={() => setConfirmRemove(true)}>
                    <Trash2 className="size-4" aria-hidden /> Remove photo
                  </Button>
                )}
              </div>
            )}

            {fileError && <p className="text-sm text-red-700">{fileError}</p>}
            <p className="text-xs text-muted">JPG, PNG or WEBP, up to 5 MB. A new photo replaces the old one.</p>
          </div>
        </div>
      </CardBody>

      <ConfirmDialog
        open={confirmRemove}
        onClose={() => setConfirmRemove(false)}
        busy={remove.isPending}
        title={`Remove the photo of ${location.name}?`}
        confirmLabel="Yes, remove"
        onConfirm={() =>
          remove.mutate({ type, id: location.id, name: location.name }, { onSuccess: () => setConfirmRemove(false) })
        }
      >
        Officers will no longer see a photo of this place in their app. You can upload a new one at any time.
      </ConfirmDialog>
    </Card>
  )
}

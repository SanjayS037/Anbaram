import { supabase } from '../lib/supabase'
import { updateCollectionPoint, updateDistributionCenter } from './locations'

const MAX_MB = 5
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp']

/** Checks the chosen file before uploading. Returns an error message, or null if the file is fine. */
export function checkPhotoFile(file) {
  if (!file) return 'Please choose a photo.'
  if (!ALLOWED.includes(file.type)) return 'Please choose a JPG, PNG or WEBP photo.'
  if (file.size > MAX_MB * 1024 * 1024) return `The photo is too big. Please choose one under ${MAX_MB} MB.`
  return null
}

// Cloudinary settings from .env.local (see README → Photos).
const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET
const FOLDERS = { collection_point: 'collection-points', distribution_center: 'distribution-centers' }

/**
 * Builds the upload for Cloudinary. Two ways, chosen automatically:
 * - Upload preset (VITE_CLOUDINARY_CLOUD_NAME + VITE_CLOUDINARY_UPLOAD_PRESET in
 *   .env.local): the photo goes straight to Cloudinary. Simple; no API secret needed.
 * - Otherwise: asks the `cloudinary-sign` Edge Function for a one-time signature
 *   (it checks you are an admin; the Cloudinary secret stays on Supabase).
 */
async function prepareUpload(type, id, file) {
  const form = new FormData()
  form.append('file', file)

  if (CLOUD_NAME && UPLOAD_PRESET) {
    form.append('upload_preset', UPLOAD_PRESET)
    form.append('folder', `anbaram/${FOLDERS[type]}/${id}`) // one folder per place, easy to find in Cloudinary
    return { cloudName: CLOUD_NAME, form }
  }

  const { data: sign, error } = await supabase.functions.invoke('cloudinary-sign', { body: { type, id } })
  if (error || !sign?.signature) {
    const message = (await error?.context?.json?.().catch(() => null))?.error
    throw new Error(message ?? 'Photo upload is not set up yet. Please add the Cloudinary details (see README).')
  }
  form.append('api_key', sign.apiKey)
  form.append('timestamp', sign.timestamp)
  form.append('signature', sign.signature)
  form.append('public_id', sign.public_id)
  form.append('overwrite', sign.overwrite)
  form.append('invalidate', sign.invalidate)
  return { cloudName: sign.cloudName, form }
}

/**
 * Uploads a photo of a collection point or distribution center to Cloudinary,
 * then saves Cloudinary's link in the place's `photo_url`, which the officers'
 * mobile apps read too. Returns the new photo link.
 */
export async function uploadLocationPhoto(type, id, file) {
  const problem = checkPhotoFile(file)
  if (problem) throw new Error(problem)

  const { cloudName, form } = await prepareUpload(type, id, file)
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: form,
  })
  const uploaded = await res.json().catch(() => ({}))
  if (!res.ok || !uploaded.secure_url) {
    throw new Error(
      uploaded?.error?.message ? `Upload failed: ${uploaded.error.message}` : 'Upload failed. Please try again.',
    )
  }

  // 3. save the link
  const save = type === 'collection_point' ? updateCollectionPoint : updateDistributionCenter
  await save(id, { photo_url: uploaded.secure_url })
  return uploaded.secure_url
}

/** Removes the photo from the place (the officers' apps stop showing it). */
export async function removeLocationPhoto(type, id) {
  const save = type === 'collection_point' ? updateCollectionPoint : updateDistributionCenter
  await save(id, { photo_url: null })
}

/**
 * A smaller, faster version of a Cloudinary photo for thumbnails
 * (the saved link stays the full photo). Non-Cloudinary links are returned unchanged.
 */
export function cloudinaryThumb(url, width) {
  if (!url || !url.includes('res.cloudinary.com') || !url.includes('/image/upload/')) return url
  return url.replace('/image/upload/', `/image/upload/c_fill,w_${width},h_${Math.round(width * 0.66)},f_auto,q_auto/`)
}

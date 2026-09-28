/**
 * Photo URLs are written by the mobile apps (Cloudinary). Only https URLs are
 * rendered or linked, so a malformed or javascript: URL can never execute.
 */
export const isSafePhotoUrl = (url) => {
  if (!url) return false
  try {
    return new URL(url).protocol === 'https:'
  } catch {
    return false
  }
}

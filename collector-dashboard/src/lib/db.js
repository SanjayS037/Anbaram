/** A PostgREST/Postgres error turned into a real Error with a readable message. */
export class DbError extends Error {
  code
  details
  hint

  constructor(error) {
    super(friendlyMessage(error))
    this.name = 'DbError'
    this.code = error.code
    this.details = error.details
    this.hint = error.hint
  }
}

function friendlyMessage(error) {
  switch (error.code) {
    case '42501':
      return 'You are not allowed to do this. Your admin access may have been removed.'
    case '23505':
      return 'This value is already used. Please use a different one.'
    case '23503':
      return 'Something linked to this was deleted. Please reload the page and try again.'
    case '23514':
      return `This change is not allowed. ${error.message}`
    case 'PGRST116':
      return 'This item was not found. It may have been deleted.'
    default:
      return error.message
  }
}

export function unwrap(result) {
  if (result.error) throw new DbError(result.error)
  return result.data
}

export function unwrapCount(result) {
  if (result.error) throw new DbError(result.error)
  return result.count ?? 0
}

/**
 * Supabase returns at most 1,000 rows per request by default. For reports
 * and trends, keep requesting pages until a short page comes back.
 */
export async function fetchAllPages(page, pageSize = 1000) {
  const rows = []
  for (let from = 0; ; from += pageSize) {
    const batch = unwrap(await page(from, from + pageSize - 1)) ?? []
    rows.push(...batch)
    if (batch.length < pageSize) return rows
  }
}

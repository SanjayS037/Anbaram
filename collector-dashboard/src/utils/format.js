import { format, formatDistanceToNowStrict } from 'date-fns'

const kgFormatter = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 1 })
const intFormatter = new Intl.NumberFormat('en-IN')

export const formatKg = (value) => `${kgFormatter.format(Number(value ?? 0))} kg`

export const formatNumber = (value) => intFormatter.format(Number(value ?? 0))

export const formatDate = (iso) => (iso ? format(new Date(iso), 'dd MMM yyyy') : '—')

export const formatDateTime = (iso) => (iso ? format(new Date(iso), 'dd MMM yyyy, h:mm a') : '—')

export const formatRelative = (iso) => (iso ? `${formatDistanceToNowStrict(new Date(iso))} ago` : '—')

/** "S. Arunmozhi, IAS" -> "SA" (ignores post-nominals after a comma). */
export const initials = (name) =>
  name
    .split(',')[0]
    .split(/[\s.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('')

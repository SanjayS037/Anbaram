import {
  addDays,
  addMonths,
  addQuarters,
  addYears,
  differenceInCalendarDays,
  differenceInCalendarMonths,
  format,
  getQuarter,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfQuarter,
  startOfYear,
  subMonths,
  subQuarters,
} from 'date-fns'

export function defaultSelection(today = new Date()) {
  return {
    period: 'monthly',
    month: format(today, 'yyyy-MM'),
    quarterYear: today.getFullYear(),
    quarter: getQuarter(today),
    year: today.getFullYear(),
    from: format(subMonths(today, 1), 'yyyy-MM-dd'),
    to: format(today, 'yyyy-MM-dd'),
  }
}

/**
 * Turns the period picker into date ranges. Quarters are calendar quarters,
 * matching date_trunc('quarter', dispatched_at) in Postgres.
 */
export function resolveRange(sel) {
  switch (sel.period) {
    case 'monthly': {
      const start = startOfMonth(parseISO(`${sel.month}-01`))
      return {
        start,
        end: addMonths(start, 1),
        label: format(start, 'MMMM yyyy'),
        trendStart: subMonths(start, 11),
        granularity: 'month',
        trendTitle: 'The last 12 months',
      }
    }
    case 'quarterly': {
      const start = startOfQuarter(new Date(sel.quarterYear, (sel.quarter - 1) * 3, 1))
      return {
        start,
        end: addQuarters(start, 1),
        label: `Q${sel.quarter} ${sel.quarterYear} (${format(start, 'MMM')}–${format(addMonths(start, 2), 'MMM yyyy')})`,
        trendStart: subQuarters(start, 7),
        granularity: 'quarter',
        trendTitle: 'The last 8 quarters (3 months each)',
      }
    }
    case 'yearly': {
      const start = startOfYear(new Date(sel.year, 0, 1))
      return {
        start,
        end: addYears(start, 1),
        label: String(sel.year),
        trendStart: start,
        granularity: 'month',
        trendTitle: `Each month of ${sel.year}`,
      }
    }
    case 'custom': {
      const start = startOfDay(parseISO(sel.from))
      const end = addDays(startOfDay(parseISO(sel.to)), 1)
      return {
        start,
        end,
        label: `${format(start, 'dd MMM yyyy')} – ${format(parseISO(sel.to), 'dd MMM yyyy')}`,
        trendStart: start,
        granularity: autoGranularity(start, end),
        trendTitle: 'Between the chosen dates',
      }
    }
    case 'overall':
      return {
        start: null,
        end: null,
        label: 'All time',
        trendStart: null,
        granularity: null,
        trendTitle: 'From the first shipment until now',
      }
  }
}

export function autoGranularity(start, end) {
  if (differenceInCalendarDays(end, start) <= 62) return 'day'
  if (differenceInCalendarMonths(end, start) <= 36) return 'month'
  return 'quarter'
}

export function bucketStart(date, g) {
  switch (g) {
    case 'day':
      return startOfDay(date)
    case 'month':
      return startOfMonth(date)
    case 'quarter':
      return startOfQuarter(date)
    case 'year':
      return startOfYear(date)
  }
}

const step = (date, g) =>
  g === 'day'
    ? addDays(date, 1)
    : g === 'month'
      ? addMonths(date, 1)
      : g === 'quarter'
        ? addQuarters(date, 1)
        : addYears(date, 1)

export function bucketKey(date, g) {
  const d = bucketStart(date, g)
  switch (g) {
    case 'day':
      return format(d, 'yyyy-MM-dd')
    case 'month':
      return format(d, 'yyyy-MM')
    case 'quarter':
      return `${format(d, 'yyyy')}-Q${getQuarter(d)}`
    case 'year':
      return format(d, 'yyyy')
  }
}

export function bucketLabel(date, g, long = false) {
  const d = bucketStart(date, g)
  switch (g) {
    case 'day':
      return format(d, long ? 'dd MMM yyyy' : 'dd MMM')
    case 'month':
      return format(d, long ? 'MMMM yyyy' : "MMM ''yy")
    case 'quarter':
      return `Q${getQuarter(d)} ${format(d, long ? 'yyyy' : "''yy")}`
    case 'year':
      return format(d, 'yyyy')
  }
}

/** Every bucket from start (inclusive) to end (exclusive), so empty periods still show as zero. */
export function bucketsBetween(start, end, g) {
  const out = []
  for (let d = bucketStart(start, g); d < end && out.length < 400; d = step(d, g))
    out.push({ key: bucketKey(d, g), start: d })
  return out
}

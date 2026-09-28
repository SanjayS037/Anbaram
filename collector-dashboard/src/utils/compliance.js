import { addDays, differenceInCalendarDays, startOfDay } from 'date-fns'

/** How many days ahead counts as "due soon" (mapping: "Due This Week"). */
export const DUE_SOON_WINDOW_DAYS = 7

/**
 * Overdue rule from the feature mapping:
 * next due = last_collected_at + cycle_frequency_days, compared to today.
 */
export function getCompliance(lastCollectedAt, cycleFrequencyDays, today = new Date()) {
  if (!lastCollectedAt) return { state: 'never', dueDate: null, daysUntilDue: null }

  const dueDate = startOfDay(addDays(new Date(lastCollectedAt), cycleFrequencyDays))
  const daysUntilDue = differenceInCalendarDays(dueDate, startOfDay(today))

  const state = daysUntilDue < 0 ? 'overdue' : daysUntilDue <= DUE_SOON_WINDOW_DAYS ? 'due_soon' : 'on_schedule'

  return { state, dueDate, daysUntilDue }
}

/** Lower = more urgent. Used to sort compliance lists. */
export const complianceRank = {
  overdue: 0,
  never: 1,
  due_soon: 2,
  on_schedule: 3,
}

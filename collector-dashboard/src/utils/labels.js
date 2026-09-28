export const CONDITION_LABELS = {
  good: 'Good',
  slightly_damaged: 'Slightly damaged',
  damaged: 'Damaged',
}

/** flags.issue_type is free text; the trigger writes the condition value. */
export const issueTypeLabel = (issueType) =>
  issueType in CONDITION_LABELS ? CONDITION_LABELS[issueType] : issueType.replace(/_/g, ' ')

export const ROLE_LABELS = {
  collection_point: 'Collection Point',
  distribution_point: 'Distribution Center',
}

export const OFFICER_STATUS_LABELS = {
  pending: 'Waiting',
  approved: 'Approved',
  rejected: 'Rejected',
}

export const REQUEST_STATUS_LABELS = {
  pending: 'Assigned',
  in_progress: 'Collecting',
  completed: 'Sent',
  cancelled: 'Cancelled',
}

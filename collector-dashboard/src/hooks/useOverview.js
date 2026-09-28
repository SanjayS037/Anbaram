import { useQuery } from '@tanstack/react-query'
import { fetchNavCounts, fetchOverview } from '../services/overview'

export const overviewKeys = {
  all: ['overview'],
  navCounts: ['nav-counts'],
}

export function useOverview() {
  return useQuery({ queryKey: overviewKeys.all, queryFn: fetchOverview })
}

export function useNavCounts() {
  return useQuery({ queryKey: overviewKeys.navCounts, queryFn: fetchNavCounts, refetchInterval: 120_000 })
}

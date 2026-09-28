import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import * as officers from '../services/officers'

export const officerKeys = {
  all: ['officers'],
  list: (params) => ['officers', 'list', params],
  counts: ['officers', 'counts'],
  detail: (id) => ['officers', 'detail', id],
  locations: (type) => ['assignable-locations', type],
}

export function useOfficerList(params) {
  return useQuery({
    queryKey: officerKeys.list(params),
    queryFn: () => officers.listOfficers(params),
    placeholderData: keepPreviousData,
  })
}

export function useOfficerCounts() {
  return useQuery({ queryKey: officerKeys.counts, queryFn: officers.countOfficersByStatus })
}

export function useOfficer(id) {
  return useQuery({ queryKey: officerKeys.detail(id), queryFn: () => officers.getOfficer(id) })
}

export function useAssignableLocations(type, enabled = true) {
  return useQuery({
    queryKey: officerKeys.locations(type),
    queryFn: () => officers.listAssignableLocations(type),
    enabled,
  })
}

/**
 * Every officer action changes officers + a location + dashboard counts,
 * so refresh all of them after success.
 */
function useOfficerMutation(fn, successMessage) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: (_data, vars) => {
      toast.success(successMessage(vars))
      void queryClient.invalidateQueries({ queryKey: officerKeys.all })
      void queryClient.invalidateQueries({ queryKey: ['assignable-locations'] })
      void queryClient.invalidateQueries({ queryKey: ['collection-points'] })
      void queryClient.invalidateQueries({ queryKey: ['distribution-centers'] })
      void queryClient.invalidateQueries({ queryKey: ['overview'] })
      void queryClient.invalidateQueries({ queryKey: ['nav-counts'] })
    },
    onError: (error) => toast.error(error.message),
  })
}

export const useApproveOfficer = () =>
  useOfficerMutation(
    (v) => officers.approveOfficer(v.officerId, v.locationId),
    (v) => `${v.officerName} is approved and given a place.`,
  )

export const useRejectOfficer = () =>
  useOfficerMutation(
    (v) => officers.rejectOfficer(v.officerId, v.reason),
    (v) => `${v.officerName}'s request was rejected.`,
  )

export const useRemoveOfficer = () =>
  useOfficerMutation(
    (v) => officers.removeOfficer(v.officerId, v.reason),
    (v) => `${v.officerName} is removed.`,
  )

export const useAssignOfficer = () =>
  useOfficerMutation(
    (v) => officers.assignOfficer(v.type, v.locationId, v.officerId),
    (v) => `${v.officerName} is given this place.`,
  )

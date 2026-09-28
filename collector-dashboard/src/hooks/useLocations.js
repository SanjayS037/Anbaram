import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import * as locations from '../services/locations'
import * as photos from '../services/photos'
import { unassignLocation } from '../services/officers'

export const locationKeys = {
  cpAll: ['collection-points'],
  cpList: ['collection-points', 'list'],
  cpDetail: (id) => ['collection-points', 'detail', id],
  dcAll: ['distribution-centers'],
  dcList: ['distribution-centers', 'list'],
  dcDetail: (id) => ['distribution-centers', 'detail', id],
  totals: (type, id) => ['location-totals', type, id],
  assignableOfficers: (role) => ['officers', 'assignable', role],
}

export const useCollectionPoints = () =>
  useQuery({ queryKey: locationKeys.cpList, queryFn: locations.listCollectionPoints })
export const useCollectionPoint = (id) =>
  useQuery({ queryKey: locationKeys.cpDetail(id), queryFn: () => locations.getCollectionPoint(id) })

export const useDistributionCenters = () =>
  useQuery({ queryKey: locationKeys.dcList, queryFn: locations.listDistributionCenters })
export const useDistributionCenter = (id) =>
  useQuery({ queryKey: locationKeys.dcDetail(id), queryFn: () => locations.getDistributionCenter(id) })

export const useLocationTotals = (type, id) =>
  useQuery({ queryKey: locationKeys.totals(type, id), queryFn: () => locations.getLocationTotals(type, id) })

export const useAssignableOfficers = (role, enabled = true) =>
  useQuery({
    queryKey: locationKeys.assignableOfficers(role),
    queryFn: () => locations.listAssignableOfficers(role),
    enabled,
  })

/** Location changes touch lists, details, dropdowns, officers and the overview. */
function useInvalidateLocations() {
  const queryClient = useQueryClient()
  return () => {
    for (const key of [
      ['collection-points'],
      ['distribution-centers'],
      ['officers'],
      ['assignable-locations'],
      ['location-options'],
      ['overview'],
      ['nav-counts'],
    ]) {
      void queryClient.invalidateQueries({ queryKey: key })
    }
  }
}

export function useSaveCollectionPoint() {
  const invalidate = useInvalidateLocations()
  return useMutation({
    mutationFn: async ({ id, input }) => {
      if (id) await locations.updateCollectionPoint(id, input)
      else return (await locations.createCollectionPoint(input)).id
    },
    onSuccess: (_d, { id, input }) => {
      toast.success(id ? `${input.name} saved.` : `${input.name} added.`)
      invalidate()
    },
    onError: (error) => toast.error(error.message),
  })
}

export function useSaveDistributionCenter() {
  const invalidate = useInvalidateLocations()
  return useMutation({
    mutationFn: async ({ id, input }) => {
      if (id) await locations.updateDistributionCenter(id, input)
      else return (await locations.createDistributionCenter(input)).id
    },
    onSuccess: (_d, { id, input }) => {
      toast.success(id ? `${input.name} saved.` : `${input.name} added.`)
      invalidate()
    },
    onError: (error) => toast.error(error.message),
  })
}

export function useSetLocationStatus() {
  const invalidate = useInvalidateLocations()
  return useMutation({
    mutationFn: ({ type, id, active }) =>
      type === 'collection_point'
        ? locations.updateCollectionPoint(id, { status: active ? 'active' : 'inactive' })
        : locations.updateDistributionCenter(id, { status: active ? 'active' : 'inactive' }),
    onSuccess: (_d, { active, name }) => {
      toast.success(`${name} is now ${active ? 'open' : 'closed'}.`)
      invalidate()
    },
    onError: (error) => toast.error(error.message),
  })
}

export function useUnassignLocation() {
  const invalidate = useInvalidateLocations()
  return useMutation({
    mutationFn: ({ type, id }) => unassignLocation(type, id),
    onSuccess: (_d, { officerName }) => {
      toast.success(`${officerName} removed from this place.`)
      invalidate()
    },
    onError: (error) => toast.error(error.message),
  })
}

export function useUploadLocationPhoto() {
  const invalidate = useInvalidateLocations()
  return useMutation({
    mutationFn: ({ type, id, file }) => photos.uploadLocationPhoto(type, id, file),
    onSuccess: (_d, { name }) => {
      toast.success(`Photo of ${name} saved. Officers will see it in their app.`)
      invalidate()
    },
    onError: (error) => toast.error(error.message),
  })
}

export function useRemoveLocationPhoto() {
  const invalidate = useInvalidateLocations()
  return useMutation({
    mutationFn: ({ type, id }) => photos.removeLocationPhoto(type, id),
    onSuccess: (_d, { name }) => {
      toast.success(`Photo of ${name} removed.`)
      invalidate()
    },
    onError: (error) => toast.error(error.message),
  })
}

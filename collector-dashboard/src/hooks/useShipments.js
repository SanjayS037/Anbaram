import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import * as shipments from '../services/shipments'
import * as flags from '../services/flags'

export const shipmentKeys = {
  list: (params) => ['shipments', 'list', params],
  detail: (id) => ['shipments', 'detail', id],
  locationOptions: ['location-options'],
}

export const flagKeys = {
  all: ['flags'],
  list: (params) => ['flags', 'list', params],
  counts: ['flags', 'counts'],
}

export const useShipmentList = (params) =>
  useQuery({
    queryKey: shipmentKeys.list(params),
    queryFn: () => shipments.listShipments(params),
    placeholderData: keepPreviousData,
  })

export const useShipment = (id) =>
  useQuery({ queryKey: shipmentKeys.detail(id), queryFn: () => shipments.getShipment(id) })

export const useLocationOptions = () =>
  useQuery({ queryKey: shipmentKeys.locationOptions, queryFn: shipments.listLocationOptions, staleTime: 5 * 60_000 })

export const useFlagList = (params) =>
  useQuery({
    queryKey: flagKeys.list(params),
    queryFn: () => flags.listFlags(params),
    placeholderData: keepPreviousData,
  })

export const useFlagCounts = () => useQuery({ queryKey: flagKeys.counts, queryFn: flags.countFlagsByStatus })

export function useResolveFlag() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ flagId, adminId, note }) => flags.resolveFlag(flagId, adminId, note),
    onSuccess: (_d, { batchCode }) => {
      toast.success(`Flag on ${batchCode ?? 'shipment'} marked as done.`)
      for (const key of [['flags'], ['shipments'], ['overview'], ['nav-counts']])
        void queryClient.invalidateQueries({ queryKey: key })
    },
    onError: (error) => {
      toast.error(error.message)
      void queryClient.invalidateQueries({ queryKey: ['flags'] })
    },
  })
}

export const useShipmentCount = (filters) =>
  useQuery({ queryKey: ['shipments', 'count', filters], queryFn: () => shipments.countShipments(filters) })

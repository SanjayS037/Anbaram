import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import * as requests from '../services/requests'

export const requestKeys = {
  all: ['requests'],
  list: (params) => ['requests', 'list', params],
  counts: ['requests', 'counts'],
  open: ['requests', 'open-summaries'],
  alerts: ['requests', 'stock-alerts'],
  centerStock: (id) => ['requests', 'center-stock', id],
  inventory: ['requests', 'inventory'],
}

export const useStockAlerts = () =>
  useQuery({ queryKey: requestKeys.alerts, queryFn: requests.listStockAlerts, refetchInterval: 120_000 })
export const useOpenRequestSummaries = () =>
  useQuery({ queryKey: requestKeys.open, queryFn: requests.listOpenRequestSummaries })
export const useRequestCounts = () => useQuery({ queryKey: requestKeys.counts, queryFn: requests.countRequestsByTab })
export const useInventory = () =>
  useQuery({ queryKey: requestKeys.inventory, queryFn: requests.listInventory, refetchInterval: 120_000 })
export const useCenterStock = (id) =>
  useQuery({ queryKey: requestKeys.centerStock(id), queryFn: () => requests.getCenterStock(id) })

export const useRequestList = (params) =>
  useQuery({
    queryKey: requestKeys.list(params),
    queryFn: () => requests.listRequests(params),
    placeholderData: keepPreviousData,
  })

function useInvalidateRequests() {
  const queryClient = useQueryClient()
  return () => {
    for (const key of [['requests'], ['collection-points'], ['nav-counts']])
      void queryClient.invalidateQueries({ queryKey: key })
  }
}

export function useCreateRequest() {
  const invalidate = useInvalidateRequests()
  return useMutation({
    mutationFn: (v) => requests.createRequest(v),
    onSuccess: (_d, v) => {
      toast.success(`Assigned to ${v.pointName}.`)
      invalidate()
    },
    onError: (error) => toast.error(error.message),
  })
}

export function useCancelRequest() {
  const invalidate = useInvalidateRequests()
  return useMutation({
    mutationFn: ({ id }) => requests.cancelRequest(id),
    onSuccess: (_d, v) => {
      toast.success(`Removed from ${v.pointName}. The request is back in the list.`)
      invalidate()
    },
    onError: (error) => {
      toast.error(error.message)
      invalidate()
    },
  })
}

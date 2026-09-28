import { useQuery } from '@tanstack/react-query'
import { fetchCategoryRows, fetchOverallViews, noFilters } from '../services/reports'
import { listLocationOptions } from '../services/shipments'
import { buildReport } from '../utils/reportAggregate'

export function useReport(range, filters) {
  const useViews = !!range && range.start === null && noFilters(filters)
  return useQuery({
    queryKey: [
      'report',
      range?.granularity ?? null,
      range?.start?.toISOString() ?? null,
      range?.end?.toISOString() ?? null,
      range?.trendStart?.toISOString() ?? null,
      filters,
    ],
    enabled: !!range,
    queryFn: async () => {
      if (!range) throw new Error('No report range')
      const [rows, names, views] = await Promise.all([
        // One fetch covers both the period and the (possibly earlier) trend window.
        fetchCategoryRows({ from: range.trendStart ?? range.start, to: range.end, filters }),
        listLocationOptions(),
        useViews ? fetchOverallViews() : Promise.resolve(undefined),
      ])
      return buildReport({ rows, range, filters, names, views })
    },
    placeholderData: (previous) => previous,
  })
}

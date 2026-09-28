import { useMemo, useState } from 'react'

/**
 * Search / sort / paginate a list that is already fully loaded. Used for
 * collection points and distribution centers — a district has tens of these,
 * and filters like "overdue" are computed client-side anyway.
 */
export function useClientTable({ rows, searchText, initialSort, sortValue, pageSize = 20 }) {
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState(initialSort)
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    const matched = (rows ?? []).filter((row) => !term || searchText(row).toLowerCase().includes(term))
    const dir = sort.ascending ? 1 : -1
    return [...matched].sort((a, b) => {
      const va = sortValue(a, sort.column)
      const vb = sortValue(b, sort.column)
      if (va === vb) return 0
      if (va === null) return 1 // nulls last regardless of direction
      if (vb === null) return -1
      return (va < vb ? -1 : 1) * dir
    })
    // searchText / sortValue are expected to be stable module-level functions
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, search, sort])

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const current = Math.min(page, pages)

  return {
    search,
    setSearch: (value) => {
      setSearch(value)
      setPage(1)
    },
    sort,
    setSort: (value) => {
      setSort(value)
      setPage(1)
    },
    page: current,
    setPage,
    pageSize,
    total: filtered.length,
    pageRows: filtered.slice((current - 1) * pageSize, current * pageSize),
  }
}

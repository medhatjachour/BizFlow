// features/settings/users-roles/hooks/useUserFilters.ts

import { useMemo, useState } from 'react'
import type { User, UserFilters } from '../types'
import { DEFAULT_PAGE_SIZE } from '../constants'
import { filterUsers, paginate } from '../utils'

export function useUserFilters(users: User[]) {
  const [filters, setFilters] = useState<UserFilters>({
    search: '', role: 'all', status: 'all',
    page: 1, pageSize: DEFAULT_PAGE_SIZE,
  })

  const filtered = useMemo(() => filterUsers(users, filters), [users, filters])
  const pageItems = useMemo(
    () => paginate(filtered, filters.page, filters.pageSize),
    [filtered, filters.page, filters.pageSize],
  )

  const totalPages = Math.max(1, Math.ceil(filtered.length / filters.pageSize))

  const setSearch = (s: string) => setFilters(f => ({ ...f, search: s, page: 1 }))
  const setRole = (role: UserFilters['role']) => setFilters(f => ({ ...f, role, page: 1 }))
  const setStatus = (status: UserFilters['status']) => setFilters(f => ({ ...f, status, page: 1 }))
  const setPage = (page: number) => setFilters(f => ({ ...f, page: Math.min(Math.max(1, page), totalPages) }))
  const setPageSize = (pageSize: number) => setFilters(f => ({ ...f, pageSize, page: 1 }))

  return {
    filters, filtered, pageItems, totalPages,
    setSearch, setRole, setStatus, setPage, setPageSize,
  }
}

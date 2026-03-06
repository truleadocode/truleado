"use client"

import { useState, useMemo, useCallback } from 'react'
import { useGraphQLQuery } from '@/hooks/use-graphql-query'
import { queries } from '@/lib/graphql/client'

// ----- Types -----

export interface ProjectListItem {
  id: string
  name: string
  description: string | null
  startDate: string | null
  endDate: string | null
  isArchived: boolean
  createdAt: string
  projectType: string | null
  status: string | null
  priority: string | null
  currency: string | null
  influencerBudget: number | null
  agencyFee: number | null
  agencyFeeType: string | null
  productionBudget: number | null
  boostingBudget: number | null
  contingency: number | null
  platforms: string[] | null
  renewalDate: string | null
  tags: string[] | null
  client: {
    id: string
    name: string
    logoUrl: string | null
    industry: string | null
  }
  campaigns: Array<{
    id: string
    name: string
    status: string
    totalBudget: number | null
    startDate: string | null
    endDate: string | null
  }>
  projectManager: {
    id: string
    name: string | null
    email: string
  } | null
}

export interface ProjectFilters {
  status: string[]
  clientId: string | null
  projectType: string | null
  platforms: string[]
  projectManagerId: string | null
  startDateRange: { from: Date | undefined; to: Date | undefined }
  endDateRange: { from: Date | undefined; to: Date | undefined }
  priority: string | null
}

export type SortField = 'startDate' | 'name' | 'budget' | 'endDate' | 'campaigns' | 'createdAt'
export type GroupField = 'client' | 'projectManager' | 'status' | 'projectType'

export interface ProjectStats {
  total: number
  active: number
  totalBudget: number
  currency: string
}

const EMPTY_FILTERS: ProjectFilters = {
  status: [],
  clientId: null,
  projectType: null,
  platforms: [],
  projectManagerId: null,
  startDateRange: { from: undefined, to: undefined },
  endDateRange: { from: undefined, to: undefined },
  priority: null,
}

function getProjectBudget(p: ProjectListItem): number {
  return (p.influencerBudget || 0) + (p.agencyFee || 0) +
    (p.productionBudget || 0) + (p.boostingBudget || 0) + (p.contingency || 0)
}

// ----- Hook -----

export function useProjectsList(agencyId: string | undefined) {
  // Server data
  const { data, isLoading, error, refetch } = useGraphQLQuery<{ agencyProjects: ProjectListItem[] }>(
    ['agencyProjects', agencyId],
    queries.agencyProjects,
    { agencyId: agencyId ?? '' },
    { enabled: !!agencyId }
  )

  const rawProjects = data?.agencyProjects ?? []

  // UI state
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState<ProjectFilters>({ ...EMPTY_FILTERS })
  const [sortBy, setSortBy] = useState<SortField>('createdAt')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [view, setView] = useState<'table' | 'card' | 'board'>('table')
  const [groupBy, setGroupBy] = useState<GroupField | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Helpers
  const setFilter = useCallback(<K extends keyof ProjectFilters>(key: K, value: ProjectFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
    setPage(1)
  }, [])

  const clearFilter = useCallback((key: keyof ProjectFilters) => {
    setFilters((prev) => ({ ...prev, [key]: EMPTY_FILTERS[key] }))
    setPage(1)
  }, [])

  const clearAllFilters = useCallback(() => {
    setFilters({ ...EMPTY_FILTERS })
    setPage(1)
  }, [])

  const handleSetSearchQuery = useCallback((q: string) => {
    setSearchQuery(q)
    setPage(1)
  }, [])

  const handleSetSortBy = useCallback((field: SortField) => {
    setSortBy((prev) => {
      if (prev === field) {
        setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
      } else {
        setSortDirection('desc')
      }
      return field
    })
    setPage(1)
  }, [])

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const clearSelection = useCallback(() => setSelectedIds(new Set()), [])

  // ----- Derived data pipeline -----

  // 1. Search filter
  const searchFiltered = useMemo(() => {
    if (!searchQuery.trim()) return rawProjects
    const q = searchQuery.toLowerCase()
    return rawProjects.filter((p) =>
      p.name.toLowerCase().includes(q) ||
      p.client.name.toLowerCase().includes(q)
    )
  }, [rawProjects, searchQuery])

  // 2. Apply filters
  const filtered = useMemo(() => {
    return searchFiltered.filter((p) => {
      if (filters.status.length > 0 && !filters.status.includes(p.status || 'active')) return false
      if (filters.clientId && p.client.id !== filters.clientId) return false
      if (filters.projectType && p.projectType !== filters.projectType) return false
      if (filters.platforms.length > 0 && !(p.platforms || []).some((pl) => filters.platforms.includes(pl))) return false
      if (filters.projectManagerId && p.projectManager?.id !== filters.projectManagerId) return false
      if (filters.priority && p.priority !== filters.priority) return false

      if (filters.startDateRange.from && p.startDate) {
        const d = new Date(p.startDate)
        if (d < filters.startDateRange.from) return false
      }
      if (filters.startDateRange.to && p.startDate) {
        const d = new Date(p.startDate)
        if (d > filters.startDateRange.to) return false
      }
      if (filters.endDateRange.from && p.endDate) {
        const d = new Date(p.endDate)
        if (d < filters.endDateRange.from) return false
      }
      if (filters.endDateRange.to && p.endDate) {
        const d = new Date(p.endDate)
        if (d > filters.endDateRange.to) return false
      }

      return true
    })
  }, [searchFiltered, filters])

  // 3. Sort
  const sorted = useMemo(() => {
    const arr = [...filtered]
    const dir = sortDirection === 'asc' ? 1 : -1

    arr.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return dir * a.name.localeCompare(b.name)
        case 'startDate':
          return dir * ((a.startDate ?? '').localeCompare(b.startDate ?? ''))
        case 'endDate':
          return dir * ((a.endDate ?? '').localeCompare(b.endDate ?? ''))
        case 'budget':
          return dir * (getProjectBudget(a) - getProjectBudget(b))
        case 'campaigns':
          return dir * (a.campaigns.length - b.campaigns.length)
        case 'createdAt':
          return dir * a.createdAt.localeCompare(b.createdAt)
        default:
          return 0
      }
    })
    return arr
  }, [filtered, sortBy, sortDirection])

  // 4. Stats (from all raw data, not filtered)
  const stats = useMemo<ProjectStats>(() => {
    const total = rawProjects.length
    const active = rawProjects.filter((p) => (p.status || 'active') === 'active').length
    const totalBudget = rawProjects.reduce((sum, p) => sum + getProjectBudget(p), 0)
    const currencies = rawProjects.map((p) => p.currency).filter(Boolean)
    const currency = currencies[0] || 'USD'
    return { total, active, totalBudget, currency }
  }, [rawProjects])

  // 5. Grouping
  const groupedProjects = useMemo(() => {
    if (!groupBy) return null
    const map = new Map<string, ProjectListItem[]>()

    for (const p of sorted) {
      let key: string
      switch (groupBy) {
        case 'client': key = p.client.name; break
        case 'projectManager': key = p.projectManager?.name || 'Unassigned'; break
        case 'status': key = p.status || 'active'; break
        case 'projectType': key = p.projectType || 'Unspecified'; break
      }
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(p)
    }

    return map
  }, [sorted, groupBy])

  // 6. Pagination
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const paginatedProjects = useMemo(() => {
    const start = (page - 1) * pageSize
    return sorted.slice(start, start + pageSize)
  }, [sorted, page, pageSize])

  // 7. Renewal alerts
  const renewalAlerts = useMemo(() => {
    const now = Date.now()
    const thirtyDays = 30 * 24 * 60 * 60 * 1000
    return rawProjects.filter((p) => {
      if (p.projectType !== 'retainer' || !p.renewalDate) return false
      const renewal = new Date(p.renewalDate).getTime()
      return renewal > now && renewal - now <= thirtyDays
    })
  }, [rawProjects])

  // 8. Unique values for filter dropdowns
  const uniqueClients = useMemo(() => {
    const map = new Map<string, string>()
    for (const p of rawProjects) map.set(p.client.id, p.client.name)
    return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name))
  }, [rawProjects])

  const uniquePMs = useMemo(() => {
    const map = new Map<string, string>()
    for (const p of rawProjects) {
      if (p.projectManager) map.set(p.projectManager.id, p.projectManager.name || p.projectManager.email)
    }
    return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name))
  }, [rawProjects])

  // Select all (current page)
  const selectAll = useCallback(() => {
    setSelectedIds(new Set(paginatedProjects.map((p) => p.id)))
  }, [paginatedProjects])

  const isAllSelected = paginatedProjects.length > 0 && paginatedProjects.every((p) => selectedIds.has(p.id))

  // Active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (filters.status.length > 0) count++
    if (filters.clientId) count++
    if (filters.projectType) count++
    if (filters.platforms.length > 0) count++
    if (filters.projectManagerId) count++
    if (filters.priority) count++
    if (filters.startDateRange.from || filters.startDateRange.to) count++
    if (filters.endDateRange.from || filters.endDateRange.to) count++
    return count
  }, [filters])

  return {
    // Data
    loading: isLoading,
    error: error?.message ?? null,
    refetch,

    // Search
    searchQuery,
    setSearchQuery: handleSetSearchQuery,

    // Filters
    filters,
    setFilter,
    clearFilter,
    clearAllFilters,
    activeFilterCount,

    // Sort
    sortBy,
    sortDirection,
    setSortBy: handleSetSortBy,

    // Pagination
    page,
    setPage,
    pageSize,
    setPageSize: useCallback((s: number) => { setPageSize(s); setPage(1) }, []),
    totalPages,

    // View
    view,
    setView,

    // Grouping
    groupBy,
    setGroupBy,

    // Selection
    selectedIds,
    toggleSelection,
    selectAll,
    clearSelection,
    isAllSelected,

    // Computed
    filteredProjects: sorted,
    paginatedProjects,
    groupedProjects,
    stats,
    renewalAlerts,
    uniqueClients,
    uniquePMs,
    getProjectBudget,
  }
}

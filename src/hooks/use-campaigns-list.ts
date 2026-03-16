"use client"

import { useState, useMemo, useCallback } from 'react'
import { useGraphQLQuery } from '@/hooks/use-graphql-query'
import { queries } from '@/lib/graphql/client'

// ----- Types -----

export interface CampaignListDeliverable {
  id: string
  deliverableType: string
  status: string
  dueDate: string | null
  creator: { id: string; displayName: string } | null
  trackingRecord: { id: string; urls: { url: string }[] } | null
  approvals: { id: string; decision: string }[]
}

export interface CampaignListCreator {
  id: string
  status: string
  rateAmount: number | null
  rateCurrency: string | null
  creator: {
    id: string
    displayName: string
    profilePictureUrl: string | null
    followers: number | null
    engagementRate: number | null
    instagramHandle: string | null
    youtubeHandle: string | null
    tiktokHandle: string | null
  }
}

export interface CampaignListItem {
  id: string
  name: string
  description: string | null
  status: string
  objective: string | null
  campaignType: string
  startDate: string | null
  endDate: string | null
  totalBudget: number | null
  currency: string | null
  budgetControlType: string | null
  clientContractValue: number | null
  createdAt: string
  project: {
    id: string
    name: string
    client: {
      id: string
      name: string
      logoUrl: string | null
      industry: string | null
    }
  }
  deliverables: CampaignListDeliverable[]
  creators: CampaignListCreator[]
  users: Array<{
    id: string
    role: string
    user: { id: string; name: string | null; email: string }
  }>
}

export interface CampaignFilters {
  status: string[]
  clientId: string | null
  projectId: string | null
  platforms: string[]
  objective: string[]
  influencerTier: string[]
  goLiveDateRange: { from: Date | undefined; to: Date | undefined }
  projectManagerId: string | null
  hasOverdue: boolean
  hasUnpaid: boolean
}

export type CampaignSortField = 'goLiveDate' | 'name' | 'budget' | 'influencers' | 'createdAt' | 'approvalDeadline'
export type CampaignGroupField = 'client' | 'project' | 'status' | 'platform' | 'goLiveMonth'
export type CampaignViewMode = 'table' | 'card' | 'board'

export interface CampaignStats {
  total: number
  liveNow: number
  goingLiveThisWeek: number
  totalInfluencers: number
  totalBudget: number
  currency: string
}

export interface CampaignAlert {
  type: 'overdue_submissions' | 'pending_approvals' | 'going_live_unapproved' | 'unpaid_fees'
  count: number
  label: string
}

const EMPTY_FILTERS: CampaignFilters = {
  status: [],
  clientId: null,
  projectId: null,
  platforms: [],
  objective: [],
  influencerTier: [],
  goLiveDateRange: { from: undefined, to: undefined },
  projectManagerId: null,
  hasOverdue: false,
  hasUnpaid: false,
}

// ----- Helpers -----

function getCampaignPlatforms(c: CampaignListItem): string[] {
  const platforms = new Set<string>()
  for (const d of c.deliverables) {
    const type = d.deliverableType.toLowerCase()
    if (type.includes('instagram') || type.includes('reel') || type.includes('story')) platforms.add('instagram')
    if (type.includes('youtube') || type.includes('video')) platforms.add('youtube')
    if (type.includes('tiktok')) platforms.add('tiktok')
    if (type.includes('twitter') || type.includes('tweet')) platforms.add('twitter')
    if (type.includes('facebook')) platforms.add('facebook')
    if (type.includes('linkedin')) platforms.add('linkedin')
  }
  // Also check creator handles
  for (const cc of c.creators) {
    if (cc.creator.instagramHandle) platforms.add('instagram')
    if (cc.creator.youtubeHandle) platforms.add('youtube')
    if (cc.creator.tiktokHandle) platforms.add('tiktok')
  }
  return Array.from(platforms)
}

function getInfluencerTier(followers: number | null): string {
  if (!followers) return 'unknown'
  if (followers >= 1_000_000) return 'mega'
  if (followers >= 500_000) return 'macro'
  if (followers >= 100_000) return 'mid-tier'
  if (followers >= 10_000) return 'micro'
  return 'nano'
}

function isOverdue(dueDate: string | null, status: string): boolean {
  if (!dueDate) return false
  if (status === 'APPROVED' || status === 'REJECTED') return false
  return new Date(dueDate).getTime() < Date.now()
}

function isLiveNow(c: CampaignListItem): boolean {
  return c.status === 'ACTIVE' || c.status === 'IN_REVIEW'
}

function isGoingLiveThisWeek(c: CampaignListItem): boolean {
  if (!c.startDate) return false
  const start = new Date(c.startDate).getTime()
  const now = Date.now()
  const weekFromNow = now + 7 * 24 * 60 * 60 * 1000
  return start >= now && start <= weekFromNow && c.status === 'DRAFT'
}

// ----- Hook -----

export function useCampaignsList(agencyId: string | undefined) {
  const { data, isLoading, error, refetch } = useGraphQLQuery<{ allCampaigns: CampaignListItem[] }>(
    ['allCampaigns', agencyId],
    queries.allCampaigns,
    { agencyId: agencyId ?? '' },
    { enabled: !!agencyId }
  )

  const rawCampaigns = data?.allCampaigns ?? []

  // UI state
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState<CampaignFilters>({ ...EMPTY_FILTERS })
  const [sortBy, setSortBy] = useState<CampaignSortField>('goLiveDate')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [view, setView] = useState<CampaignViewMode>('table')
  const [groupBy, setGroupBy] = useState<CampaignGroupField | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Filter helpers
  const setFilter = useCallback(<K extends keyof CampaignFilters>(key: K, value: CampaignFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
    setPage(1)
  }, [])

  const clearFilter = useCallback((key: keyof CampaignFilters) => {
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

  const handleSetSortBy = useCallback((field: CampaignSortField) => {
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

  // Enrich campaigns with computed fields
  const enriched = useMemo(() => {
    return rawCampaigns.map((c) => ({
      ...c,
      _platforms: getCampaignPlatforms(c),
      _overdueCount: c.deliverables.filter((d) => isOverdue(d.dueDate, d.status)).length,
      _pendingApprovalCount: c.deliverables.filter((d) =>
        ['SUBMITTED', 'INTERNAL_REVIEW', 'PENDING_PROJECT_APPROVAL', 'CLIENT_REVIEW'].includes(d.status)
      ).length,
      _liveCount: c.deliverables.filter((d) => d.trackingRecord && d.trackingRecord.urls.length > 0).length,
      _approvedCount: c.deliverables.filter((d) => d.status === 'APPROVED').length,
      _totalFees: c.creators.reduce((sum, cc) => sum + (cc.rateAmount || 0), 0),
      _pm: c.users.find((u) => u.role === 'CAMPAIGN_MANAGER' || u.role === 'ACCOUNT_MANAGER'),
    }))
  }, [rawCampaigns])

  type EnrichedCampaign = (typeof enriched)[number]

  // 1. Search
  const searchFiltered = useMemo(() => {
    if (!searchQuery.trim()) return enriched
    const q = searchQuery.toLowerCase()
    return enriched.filter((c) =>
      c.name.toLowerCase().includes(q) ||
      c.project.name.toLowerCase().includes(q) ||
      c.project.client.name.toLowerCase().includes(q) ||
      c.creators.some((cc) => cc.creator.displayName.toLowerCase().includes(q))
    )
  }, [enriched, searchQuery])

  // 2. Filters
  const filtered = useMemo(() => {
    return searchFiltered.filter((c) => {
      if (filters.status.length > 0 && !filters.status.includes(c.status)) return false
      if (filters.clientId && c.project.client.id !== filters.clientId) return false
      if (filters.projectId && c.project.id !== filters.projectId) return false
      if (filters.platforms.length > 0 && !c._platforms.some((p) => filters.platforms.includes(p))) return false
      if (filters.objective.length > 0 && (!c.objective || !filters.objective.includes(c.objective))) return false
      if (filters.influencerTier.length > 0) {
        const hasTier = c.creators.some((cc) =>
          filters.influencerTier.includes(getInfluencerTier(cc.creator.followers))
        )
        if (!hasTier) return false
      }
      if (filters.projectManagerId) {
        const pm = c.users.find((u) => u.role === 'CAMPAIGN_MANAGER' || u.role === 'ACCOUNT_MANAGER')
        if (pm?.user.id !== filters.projectManagerId) return false
      }
      if (filters.goLiveDateRange.from && c.startDate) {
        if (new Date(c.startDate) < filters.goLiveDateRange.from) return false
      }
      if (filters.goLiveDateRange.to && c.startDate) {
        if (new Date(c.startDate) > filters.goLiveDateRange.to) return false
      }
      if (filters.hasOverdue && c._overdueCount === 0) return false
      if (filters.hasUnpaid) return false // No payment data in list query

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
        case 'goLiveDate':
          return dir * ((a.startDate ?? '').localeCompare(b.startDate ?? ''))
        case 'budget':
          return dir * ((a.totalBudget || 0) - (b.totalBudget || 0))
        case 'influencers':
          return dir * (a.creators.length - b.creators.length)
        case 'createdAt':
          return dir * a.createdAt.localeCompare(b.createdAt)
        case 'approvalDeadline': {
          const aDue = a.deliverables.filter((d) => d.dueDate).map((d) => d.dueDate!).sort()[0] ?? ''
          const bDue = b.deliverables.filter((d) => d.dueDate).map((d) => d.dueDate!).sort()[0] ?? ''
          return dir * aDue.localeCompare(bDue)
        }
        default:
          return 0
      }
    })
    return arr
  }, [filtered, sortBy, sortDirection])

  // 4. Stats
  const stats = useMemo<CampaignStats>(() => {
    const total = rawCampaigns.length
    const liveNow = rawCampaigns.filter(isLiveNow).length
    const goingLiveThisWeek = rawCampaigns.filter(isGoingLiveThisWeek).length
    const totalInfluencers = new Set(
      rawCampaigns.flatMap((c) => c.creators.map((cc) => cc.creator.id))
    ).size
    const totalBudget = rawCampaigns.reduce((sum, c) => sum + (c.totalBudget || 0), 0)
    const currencies = rawCampaigns.map((c) => c.currency).filter(Boolean)
    const currency = currencies[0] || 'INR'
    return { total, liveNow, goingLiveThisWeek, totalInfluencers, totalBudget, currency }
  }, [rawCampaigns])

  // 5. Alerts
  const alerts = useMemo<CampaignAlert[]>(() => {
    const result: CampaignAlert[] = []
    const overdueCount = enriched.reduce((sum, c) => sum + c._overdueCount, 0)
    if (overdueCount > 0) {
      result.push({ type: 'overdue_submissions', count: overdueCount, label: `${overdueCount} overdue submissions` })
    }
    const pendingCount = enriched.reduce((sum, c) => sum + c._pendingApprovalCount, 0)
    if (pendingCount > 0) {
      result.push({ type: 'pending_approvals', count: pendingCount, label: `${pendingCount} pending approvals` })
    }
    // Going live with unapproved content
    const goingLiveUnapproved = enriched.filter((c) => {
      if (!isGoingLiveThisWeek(c)) return false
      return c.deliverables.some((d) => d.status !== 'APPROVED')
    }).length
    if (goingLiveUnapproved > 0) {
      result.push({ type: 'going_live_unapproved', count: goingLiveUnapproved, label: `${goingLiveUnapproved} going live with unapproved content` })
    }
    return result
  }, [enriched])

  // 6. Grouping
  const groupedCampaigns = useMemo(() => {
    if (!groupBy) return null
    const map = new Map<string, EnrichedCampaign[]>()

    for (const c of sorted) {
      let key: string
      switch (groupBy) {
        case 'client': key = c.project.client.name; break
        case 'project': key = c.project.name; break
        case 'status': key = c.status; break
        case 'platform': key = c._platforms[0] || 'Unknown'; break
        case 'goLiveMonth': {
          if (c.startDate) {
            const d = new Date(c.startDate)
            key = `${d.toLocaleString('en-US', { month: 'long' })} ${d.getFullYear()}`
          } else {
            key = 'No Date'
          }
          break
        }
      }
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(c)
    }
    return map
  }, [sorted, groupBy])

  // 7. Pagination
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const paginatedCampaigns = useMemo(() => {
    const start = (page - 1) * pageSize
    return sorted.slice(start, start + pageSize)
  }, [sorted, page, pageSize])

  // 8. Unique values for filters
  const uniqueClients = useMemo(() => {
    const map = new Map<string, { name: string; logoUrl: string | null }>()
    for (const c of rawCampaigns) {
      map.set(c.project.client.id, { name: c.project.client.name, logoUrl: c.project.client.logoUrl })
    }
    return Array.from(map, ([id, v]) => ({ id, ...v })).sort((a, b) => a.name.localeCompare(b.name))
  }, [rawCampaigns])

  const uniqueProjects = useMemo(() => {
    const map = new Map<string, { name: string; clientId: string }>()
    for (const c of rawCampaigns) {
      map.set(c.project.id, { name: c.project.name, clientId: c.project.client.id })
    }
    return Array.from(map, ([id, v]) => ({ id, ...v })).sort((a, b) => a.name.localeCompare(b.name))
  }, [rawCampaigns])

  const uniquePMs = useMemo(() => {
    const map = new Map<string, string>()
    for (const c of rawCampaigns) {
      const pm = c.users.find((u) => u.role === 'CAMPAIGN_MANAGER' || u.role === 'ACCOUNT_MANAGER')
      if (pm) map.set(pm.user.id, pm.user.name || pm.user.email)
    }
    return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name))
  }, [rawCampaigns])

  // Selection
  const selectAll = useCallback(() => {
    setSelectedIds(new Set(paginatedCampaigns.map((c) => c.id)))
  }, [paginatedCampaigns])

  const isAllSelected = paginatedCampaigns.length > 0 && paginatedCampaigns.every((c) => selectedIds.has(c.id))

  // Active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (filters.status.length > 0) count++
    if (filters.clientId) count++
    if (filters.projectId) count++
    if (filters.platforms.length > 0) count++
    if (filters.objective.length > 0) count++
    if (filters.influencerTier.length > 0) count++
    if (filters.goLiveDateRange.from || filters.goLiveDateRange.to) count++
    if (filters.projectManagerId) count++
    if (filters.hasOverdue) count++
    if (filters.hasUnpaid) count++
    return count
  }, [filters])

  return {
    // Data
    loading: isLoading,
    error: error?.message ?? null,
    refetch,
    rawCampaigns,

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
    filteredCampaigns: sorted,
    paginatedCampaigns,
    groupedCampaigns,
    stats,
    alerts,
    uniqueClients,
    uniqueProjects,
    uniquePMs,
    getCampaignPlatforms,
  }
}

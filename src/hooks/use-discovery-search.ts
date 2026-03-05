"use client"

import { useState, useCallback, useEffect } from 'react'
import { graphqlRequest, queries } from '@/lib/graphql/client'
import { useDebounce } from './use-debounce'

export type DiscoveryPlatform = 'INSTAGRAM' | 'YOUTUBE' | 'TIKTOK'

export interface DiscoveryInfluencer {
  userId: string
  username: string
  fullname: string | null
  followers: number
  engagementRate: number | null
  engagements: number | null
  avgViews: number | null
  avgLikes: number | null
  isVerified: boolean
  picture: string | null
  url: string | null
  searchResultId: string
  isHidden: boolean
  platform: string
}

export interface DiscoverySearchResult {
  accounts: DiscoveryInfluencer[]
  total: number
}

interface UseDiscoverySearchOptions {
  agencyId: string | undefined
}

export function useDiscoverySearch({ agencyId }: UseDiscoverySearchOptions) {
  const [platform, setPlatform] = useState<DiscoveryPlatform>('INSTAGRAM')
  const [filters, setFilters] = useState<Record<string, unknown>>({})
  const [sort, setSort] = useState<{ field: string; direction: string }>({
    field: 'followers',
    direction: 'desc',
  })
  const [page, setPage] = useState(1)
  const [limit] = useState(30)
  const [data, setData] = useState<DiscoverySearchResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const debouncedFilters = useDebounce(filters, 300)

  const search = useCallback(async () => {
    if (!agencyId) return

    setLoading(true)
    setError(null)

    try {
      const result = await graphqlRequest<{ discoverySearch: DiscoverySearchResult }>(
        queries.discoverySearch,
        {
          agencyId,
          platform,
          filters: debouncedFilters,
          sort,
          skip: (page - 1) * limit,
          limit,
        }
      )
      setData(result.discoverySearch)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed')
    } finally {
      setLoading(false)
    }
  }, [agencyId, platform, debouncedFilters, sort, page, limit])

  // Auto-search when params change
  useEffect(() => {
    if (agencyId) {
      search()
    }
  }, [search, agencyId])

  const changePlatform = useCallback((p: DiscoveryPlatform) => {
    setPlatform(p)
    setFilters({})
    setPage(1)
    setData(null)
  }, [])

  const updateFilter = useCallback((key: string, value: unknown) => {
    setFilters((prev) => {
      if (value === undefined || value === null || value === '') {
        const next = { ...prev }
        delete next[key]
        return next
      }
      return { ...prev, [key]: value }
    })
    setPage(1)
  }, [])

  const removeFilter = useCallback((key: string) => {
    setFilters((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
    setPage(1)
  }, [])

  const clearFilters = useCallback(() => {
    setFilters({})
    setPage(1)
  }, [])

  const loadSavedSearch = useCallback((savedFilters: Record<string, unknown>, savedPlatform: string, savedSortField?: string, savedSortOrder?: string) => {
    setPlatform(savedPlatform.toUpperCase() as DiscoveryPlatform)
    setFilters(savedFilters)
    if (savedSortField) {
      setSort({ field: savedSortField, direction: savedSortOrder || 'desc' })
    }
    setPage(1)
  }, [])

  return {
    platform,
    setPlatform: changePlatform,
    filters,
    updateFilter,
    removeFilter,
    clearFilters,
    sort,
    setSort,
    page,
    setPage,
    limit,
    data,
    loading,
    error,
    search,
    loadSavedSearch,
  }
}

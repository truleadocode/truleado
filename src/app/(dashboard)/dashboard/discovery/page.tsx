"use client"

import { useState, useCallback, useMemo } from 'react'
import {
  Search,
  Upload,
  Save,
  FolderOpen,
  FileDown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Header } from '@/components/layout/header'
import { useAuth } from '@/contexts/auth-context'
import { useToast } from '@/hooks/use-toast'
import {
  useDiscoverySearch,
  DiscoveryPlatform,
  DiscoveryInfluencer,
} from '@/hooks/use-discovery-search'
import { TokenBalanceBanner } from '@/components/discovery/token-balance-banner'
import { FilterBar } from '@/components/discovery/filter-bar'
import { ActiveFilterChips } from '@/components/discovery/active-filter-chips'
import { ResultsTable } from '@/components/discovery/results-table'
import { UnlockDialog } from '@/components/discovery/unlock-dialog'
import { ExportDialog } from '@/components/discovery/export-dialog'
import { ImportDialog } from '@/components/discovery/import-dialog'
import { SavedSearchDialog } from '@/components/discovery/saved-search-dialog'
import { ExportsDrawer } from '@/components/discovery/exports-drawer'

const SORT_OPTIONS = [
  { value: 'followers', label: 'Followers' },
  { value: 'engagements', label: 'Engagements' },
  { value: 'engagement_rate', label: 'Engagement Rate' },
  { value: 'views', label: 'Views' },
]

export default function DiscoveryPage() {
  const { currentAgency } = useAuth()
  const { toast } = useToast()
  const agencyId = currentAgency?.id

  const {
    platform,
    setPlatform,
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
  } = useDiscoverySearch({ agencyId })

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Dialog states
  const [unlockOpen, setUnlockOpen] = useState(false)
  const [unlockTargets, setUnlockTargets] = useState<DiscoveryInfluencer[]>([])
  const [exportOpen, setExportOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [saveSearchOpen, setSaveSearchOpen] = useState(false)
  const [loadSearchOpen, setLoadSearchOpen] = useState(false)
  const [exportsDrawerOpen, setExportsDrawerOpen] = useState(false)

  // Topic search (separate from structured filters)
  const handleTopicSearch = useCallback(
    (value: string) => {
      if (value.trim()) {
        updateFilter('text', value.trim())
      } else {
        removeFilter('text')
      }
    },
    [updateFilter, removeFilter]
  )

  // Selection handlers — only visible (non-hidden) accounts can be selected
  const toggleSelect = useCallback((userId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(userId)) {
        next.delete(userId)
      } else {
        next.add(userId)
      }
      return next
    })
  }, [])

  const selectAll = useCallback(() => {
    if (!data?.accounts) return
    // Only select visible (non-hidden) accounts
    const visibleIds = data.accounts
      .filter((a) => !a.isHidden)
      .map((a) => a.userId)
    setSelectedIds((prev) => {
      const allSelected = visibleIds.every((id) => prev.has(id))
      if (allSelected) {
        const next = new Set(prev)
        visibleIds.forEach((id) => next.delete(id))
        return next
      }
      return new Set([...prev, ...visibleIds])
    })
  }, [data?.accounts])

  // Selected influencers — only non-hidden
  const selectedInfluencers = useMemo(() => {
    if (!data?.accounts) return []
    return data.accounts.filter(
      (a) => !a.isHidden && selectedIds.has(a.userId)
    )
  }, [data?.accounts, selectedIds])

  // Banner: Unlock triggers — only hidden accounts that have search_result_ids
  const handleBannerUnlock = useCallback(() => {
    const hidden = (data?.accounts || []).filter(
      (a) => a.isHidden && a.searchResultId
    )
    setUnlockTargets(hidden)
    setUnlockOpen(true)
  }, [data?.accounts])

  // Banner: Export triggers — full search export
  const handleBannerExport = useCallback(() => {
    setExportOpen(true)
  }, [])

  // Analyze placeholder
  const handleAnalyze = useCallback(
    (account: DiscoveryInfluencer) => {
      toast({
        title: 'Coming soon',
        description: `Analyze for @${account.username} will be available in a future update.`,
      })
    },
    [toast]
  )

  const handleUnlockSuccess = useCallback(() => {
    setSelectedIds(new Set())
    search()
  }, [search])

  const handleExportSuccess = useCallback(() => {
    toast({
      title: 'Export started',
      description: 'Check Downloads for your file.',
    })
  }, [toast])

  const handleImportSuccess = useCallback(() => {
    setSelectedIds(new Set())
    toast({
      title: 'Import complete',
      description: 'Creators added to your roster.',
    })
  }, [toast])

  // Clear selection when platform changes
  const handlePlatformChange = useCallback(
    (p: string) => {
      setSelectedIds(new Set())
      setPlatform(p as DiscoveryPlatform)
    },
    [setPlatform]
  )

  if (!agencyId) {
    return (
      <>
        <Header
          title="Creator Discovery"
          subtitle="Find influencers across platforms"
        />
        <div className="p-6">
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Select an agency to start discovering creators.
            </CardContent>
          </Card>
        </div>
      </>
    )
  }

  return (
    <>
      <Header
        title="Creator Discovery"
        subtitle="Find influencers across platforms"
      />

      <div className="p-6 space-y-4">
        {/* Token Balance Banner */}
        <TokenBalanceBanner agencyId={agencyId} />

        {/* Platform Tabs */}
        <Tabs value={platform} onValueChange={handlePlatformChange}>
          <TabsList>
            <TabsTrigger value="INSTAGRAM">Instagram</TabsTrigger>
            <TabsTrigger value="YOUTUBE">YouTube</TabsTrigger>
            <TabsTrigger value="TIKTOK">TikTok</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Search Bar */}
        <div className="flex gap-3">
          <div className="relative flex-1 max-w-lg">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by topic, keyword, or username..."
              className="pl-9"
              defaultValue={(filters.text as string) || ''}
              onChange={(e) => handleTopicSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Filter Bar */}
        <FilterBar
          platform={platform}
          filters={filters}
          onFilterChange={updateFilter}
        />

        {/* Active Filter Chips */}
        <ActiveFilterChips
          filters={filters}
          onRemove={removeFilter}
          onClear={clearFilters}
        />

        {/* Action Bar */}
        <div className="flex flex-wrap items-center gap-2 justify-between">
          <div className="flex items-center gap-2">
            {/* Sort */}
            <Select
              value={sort.field}
              onValueChange={(field) =>
                setSort({ field, direction: sort.direction })
              }
            >
              <SelectTrigger className="w-[160px] h-9">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setSort({
                  field: sort.field,
                  direction: sort.direction === 'desc' ? 'asc' : 'desc',
                })
              }
            >
              {sort.direction === 'desc' ? 'Desc' : 'Asc'}
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {/* Saved Searches */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLoadSearchOpen(true)}
            >
              <FolderOpen className="mr-1.5 h-4 w-4" />
              Load
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSaveSearchOpen(true)}
            >
              <Save className="mr-1.5 h-4 w-4" />
              Save
            </Button>

            {/* Downloads (Export History) */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setExportsDrawerOpen(true)}
            >
              <FileDown className="mr-1.5 h-4 w-4" />
              Downloads
            </Button>

            {/* Import to Creator DB — primary action */}
            <Button
              size="sm"
              onClick={() => setImportOpen(true)}
              disabled={selectedInfluencers.length === 0}
            >
              <Upload className="mr-1.5 h-4 w-4" />
              Import to Creator DB
              {selectedInfluencers.length > 0 &&
                ` (${selectedInfluencers.length})`}
            </Button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <Card className="border-destructive bg-destructive/10">
            <CardContent className="p-4 text-destructive text-sm">
              {error}
            </CardContent>
          </Card>
        )}

        {/* Results Table */}
        <ResultsTable
          accounts={data?.accounts || []}
          total={data?.total || 0}
          page={page}
          limit={limit}
          onPageChange={setPage}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onSelectAll={selectAll}
          loading={loading}
          onUnlock={handleBannerUnlock}
          onExport={handleBannerExport}
          onAnalyze={handleAnalyze}
        />
      </div>

      {/* Dialogs */}
      <UnlockDialog
        open={unlockOpen}
        onOpenChange={setUnlockOpen}
        selectedInfluencers={unlockTargets}
        platform={platform}
        onSuccess={handleUnlockSuccess}
      />
      <ExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        platform={platform}
        filters={filters}
        sort={sort}
        totalResults={data?.total || 0}
        onSuccess={handleExportSuccess}
      />
      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        selectedInfluencers={selectedInfluencers}
        onSuccess={handleImportSuccess}
      />
      <SavedSearchDialog
        open={saveSearchOpen}
        onOpenChange={setSaveSearchOpen}
        mode="save"
        platform={platform}
        currentFilters={filters}
        currentSortField={sort.field}
        currentSortOrder={sort.direction}
        onLoadSearch={loadSavedSearch}
      />
      <SavedSearchDialog
        open={loadSearchOpen}
        onOpenChange={setLoadSearchOpen}
        mode="load"
        platform={platform}
        currentFilters={filters}
        currentSortField={sort.field}
        currentSortOrder={sort.direction}
        onLoadSearch={loadSavedSearch}
      />
      <ExportsDrawer
        open={exportsDrawerOpen}
        onOpenChange={setExportsDrawerOpen}
      />
    </>
  )
}

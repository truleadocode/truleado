"use client"

import { useState } from 'react'
import { Plus, Download, Megaphone, AlertCircle, Archive, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Header } from '@/components/layout/header'
import { ViewToggle } from '@/components/ui/view-toggle'
import { BulkActionBar } from '@/components/ui/bulk-action-bar'
import { useAuth } from '@/contexts/auth-context'
import { useCampaignsList } from '@/hooks/use-campaigns-list'
import { CampaignsStatsBar } from '@/components/campaigns/campaigns-stats-bar'
import { CampaignsAlertBanner } from '@/components/campaigns/campaigns-alert-banner'
import { CampaignsFilterBar } from '@/components/campaigns/campaigns-filter-bar'
import { CampaignFilterChips } from '@/components/campaigns/campaign-filter-chips'
import { CampaignsTableView } from '@/components/campaigns/campaigns-table-view'
import { CampaignsCardView } from '@/components/campaigns/campaigns-card-view'
import { CampaignsCalendarView } from '@/components/campaigns/campaigns-calendar-view'
import { CampaignsPagination } from '@/components/campaigns/campaigns-pagination'
import { exportCampaignsToCSV } from '@/components/campaigns/campaigns-csv-export'
import { CreateCampaignDrawer } from '@/components/campaigns/create-campaign-drawer'

// Map ViewToggle values to campaign view modes
const VIEW_MAP = {
  table: 'table' as const,
  card: 'card' as const,
  board: 'calendar' as const,
}
const REVERSE_VIEW_MAP = {
  table: 'table' as const,
  card: 'card' as const,
  calendar: 'board' as const,
}

export default function CampaignsPage() {
  const { currentAgency } = useAuth()
  const list = useCampaignsList(currentAgency?.id)
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Loading state
  if (list.loading) {
    return (
      <>
        <Header title="Campaigns" />
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
          <div className="h-10 bg-muted rounded animate-pulse w-full max-w-sm" />
          <div className="h-64 bg-muted rounded-lg animate-pulse" />
        </div>
      </>
    )
  }

  // Error state
  if (list.error) {
    return (
      <>
        <Header title="Campaigns" />
        <div className="p-6">
          <Card className="border-destructive bg-destructive/10">
            <CardContent className="p-6 flex flex-col items-center text-center">
              <AlertCircle className="h-12 w-12 text-destructive mb-4" />
              <h3 className="text-lg font-semibold">Failed to load campaigns</h3>
              <p className="text-muted-foreground mt-2">{list.error}</p>
              <Button variant="outline" className="mt-4" onClick={() => list.refetch()}>
                Retry
              </Button>
            </CardContent>
          </Card>
        </div>
      </>
    )
  }

  // Empty state
  if (list.rawCampaigns.length === 0) {
    return (
      <>
        <Header title="Campaigns" subtitle="Manage influencer campaigns" />
        <div className="p-6">
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Megaphone className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">No campaigns yet</h3>
              <p className="text-muted-foreground text-center mt-2 max-w-sm">
                Campaigns are the core of your influencer work. Create a project first, then launch campaigns within it.
              </p>
              <Button className="mt-4" onClick={() => setDrawerOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                New Campaign
              </Button>
            </CardContent>
          </Card>
        </div>
        <CreateCampaignDrawer
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          onSuccess={() => {
            setDrawerOpen(false)
            list.refetch()
          }}
        />
      </>
    )
  }

  return (
    <>
      <Header
        title="Campaigns"
        subtitle={`${list.stats.total} total · ${list.stats.liveNow} live`}
      />

      <div className="p-6 space-y-4">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <Button onClick={() => setDrawerOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Campaign
          </Button>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportCampaignsToCSV(list.filteredCampaigns)}
            >
              <Download className="mr-1.5 h-4 w-4" />
              Export CSV
            </Button>
            <ViewToggle
              view={REVERSE_VIEW_MAP[list.view]}
              onViewChange={(v) => list.setView(VIEW_MAP[v])}
            />
          </div>
        </div>

        {/* Stats */}
        <CampaignsStatsBar stats={list.stats} />

        {/* Alert banner */}
        {list.alerts.length > 0 && <CampaignsAlertBanner alerts={list.alerts} />}

        {/* Filter bar */}
        <CampaignsFilterBar
          searchQuery={list.searchQuery}
          onSearchChange={list.setSearchQuery}
          filters={list.filters}
          onFilterChange={list.setFilter}
          sortBy={list.sortBy}
          sortDirection={list.sortDirection}
          onSortChange={list.setSortBy}
          groupBy={list.groupBy}
          onGroupByChange={list.setGroupBy}
          activeFilterCount={list.activeFilterCount}
          clients={list.uniqueClients}
          projects={list.uniqueProjects}
          projectManagers={list.uniquePMs}
        />

        {/* Filter chips */}
        <CampaignFilterChips
          filters={list.filters}
          onClearFilter={list.clearFilter}
          onClearAll={list.clearAllFilters}
          activeFilterCount={list.activeFilterCount}
          clients={list.uniqueClients}
          projects={list.uniqueProjects}
          projectManagers={list.uniquePMs}
        />

        {/* Views */}
        {list.filteredCampaigns.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center py-12">
              <Megaphone className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm font-medium">No campaigns match your filters</p>
              <p className="text-xs text-muted-foreground mt-1">Try adjusting your search or filter criteria.</p>
              <Button variant="ghost" size="sm" className="mt-3" onClick={list.clearAllFilters}>
                Clear all filters
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {list.view === 'table' && (
              <CampaignsTableView
                campaigns={list.paginatedCampaigns}
                groupedCampaigns={list.groupedCampaigns}
                groupBy={list.groupBy}
                selectedIds={list.selectedIds}
                onToggleSelection={list.toggleSelection}
                onSelectAll={list.selectAll}
                isAllSelected={list.isAllSelected}
              />
            )}

            {list.view === 'card' && (
              <CampaignsCardView
                campaigns={list.paginatedCampaigns}
                groupedCampaigns={list.groupedCampaigns}
                groupBy={list.groupBy}
                selectedIds={list.selectedIds}
                onToggleSelection={list.toggleSelection}
              />
            )}

            {list.view === 'calendar' && (
              <CampaignsCalendarView campaigns={list.filteredCampaigns} />
            )}
          </>
        )}

        {/* Pagination (not for calendar) */}
        {list.view !== 'calendar' && (
          <CampaignsPagination
            page={list.page}
            totalPages={list.totalPages}
            pageSize={list.pageSize}
            totalItems={list.filteredCampaigns.length}
            onPageChange={list.setPage}
            onPageSizeChange={list.setPageSize}
          />
        )}

        {/* Bulk actions */}
        <BulkActionBar
          selectedCount={list.selectedIds.size}
          onClearSelection={list.clearSelection}
          actions={[
            {
              label: 'Change Status',
              icon: RefreshCw,
              onClick: () => {
                // TODO: Open status change dialog
              },
            },
            {
              label: 'Export Selected',
              icon: Download,
              onClick: () => {
                const selected = list.filteredCampaigns.filter((c) => list.selectedIds.has(c.id))
                exportCampaignsToCSV(selected)
              },
            },
            {
              label: 'Archive',
              icon: Archive,
              onClick: () => {
                // TODO: Archive selected campaigns
              },
              variant: 'destructive',
            },
          ]}
        />
      </div>

      {/* Create Campaign Drawer */}
      <CreateCampaignDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onSuccess={() => {
          setDrawerOpen(false)
          list.refetch()
        }}
      />
    </>
  )
}

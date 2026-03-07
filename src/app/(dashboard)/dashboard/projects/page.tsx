"use client"

import { useState } from 'react'
import { Briefcase, Download, Plus, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Header } from '@/components/layout/header'
import { ViewToggle } from '@/components/ui/view-toggle'
import { useAuth } from '@/contexts/auth-context'
import { graphqlRequest, mutations } from '@/lib/graphql/client'
import { useToast } from '@/hooks/use-toast'
import { useProjectsList } from '@/hooks/use-projects-list'
import { CreateProjectSheet } from '@/components/projects/create-project-sheet'
import { ProjectsStatsBar } from '@/components/projects/projects-stats-bar'
import { ProjectsFilterBar } from '@/components/projects/projects-filter-bar'
import { ProjectFilterChips } from '@/components/projects/project-filter-chips'
import { ProjectsTableView } from '@/components/projects/projects-table-view'
import { ProjectsCardView } from '@/components/projects/projects-card-view'
import { ProjectsBoardView } from '@/components/projects/projects-board-view'
import { ProjectsPagination } from '@/components/projects/projects-pagination'
import { ProjectsBulkActions } from '@/components/projects/projects-bulk-actions'
import { ProjectsRenewalBanner } from '@/components/projects/projects-renewal-banner'
import { exportProjectsToCSV } from '@/components/projects/projects-csv-export'

export default function ProjectsPage() {
  const { currentAgency } = useAuth()
  const { toast } = useToast()
  const list = useProjectsList(currentAgency?.id)

  const [sheetOpen, setSheetOpen] = useState(false)
  const [bannerDismissed, setBannerDismissed] = useState(false)

  // ----- Mutation handlers -----
  const handleStatusChange = async (projectId: string, status: string) => {
    try {
      await graphqlRequest(mutations.updateProjectStatus, { id: projectId, status })
      toast({ title: 'Status updated' })
      list.refetch()
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : 'Failed to update status', variant: 'destructive' })
    }
  }

  const handleArchive = async (projectId: string) => {
    try {
      await graphqlRequest(mutations.bulkArchiveProjects, { projectIds: [projectId] })
      toast({ title: 'Project archived' })
      list.refetch()
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : 'Failed to archive', variant: 'destructive' })
    }
  }

  const handleBulkStatusChange = async (status: string) => {
    try {
      await graphqlRequest(mutations.bulkUpdateProjectStatus, {
        projectIds: Array.from(list.selectedIds),
        status,
      })
      toast({ title: `${list.selectedIds.size} projects updated` })
      list.clearSelection()
      list.refetch()
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : 'Bulk update failed', variant: 'destructive' })
    }
  }

  const handleBulkArchive = async () => {
    try {
      await graphqlRequest(mutations.bulkArchiveProjects, {
        projectIds: Array.from(list.selectedIds),
      })
      toast({ title: `${list.selectedIds.size} projects archived` })
      list.clearSelection()
      list.refetch()
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : 'Bulk archive failed', variant: 'destructive' })
    }
  }

  const handleBulkExport = () => {
    const selected = list.filteredProjects.filter((p) => list.selectedIds.has(p.id))
    exportProjectsToCSV(selected, 'selected-projects.csv')
    toast({ title: `Exported ${selected.length} projects` })
  }

  const handleExportAll = () => {
    exportProjectsToCSV(list.filteredProjects, 'projects.csv')
    toast({ title: 'Projects exported' })
  }

  const handleViewRenewals = () => {
    list.setFilter('projectType', 'retainer')
    setBannerDismissed(true)
  }

  // ----- Loading state -----
  if (list.loading) {
    return (
      <>
        <Header title="Projects" />
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
          <div className="h-10 bg-muted rounded animate-pulse" />
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-14 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </div>
      </>
    )
  }

  // ----- Error state -----
  if (list.error) {
    return (
      <>
        <Header title="Projects" />
        <div className="p-6">
          <Card className="border-destructive bg-destructive/10">
            <CardContent className="p-6 flex flex-col items-center text-center">
              <AlertCircle className="h-12 w-12 text-destructive mb-4" />
              <h3 className="text-lg font-semibold">Failed to load projects</h3>
              <p className="text-muted-foreground mt-2">{list.error}</p>
            </CardContent>
          </Card>
        </div>
      </>
    )
  }

  return (
    <>
      <Header
        title="Projects"
        subtitle={`${list.stats.total} total projects · ${list.stats.active} active`}
      />

      <div className="p-6 space-y-4">
        {/* Header row: Add Project + Export + View Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button onClick={() => setSheetOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              Add Project
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportAll}>
              <Download className="mr-1.5 h-4 w-4" />
              Export CSV
            </Button>
          </div>
          <ViewToggle view={list.view} onViewChange={list.setView} />
        </div>

        {/* Stats */}
        <ProjectsStatsBar stats={list.stats} />

        {/* Filters */}
        <ProjectsFilterBar
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
          projectManagers={list.uniquePMs}
        />

        {/* Active filter chips */}
        <ProjectFilterChips
          filters={list.filters}
          onClearFilter={list.clearFilter}
          onClearAll={list.clearAllFilters}
          activeFilterCount={list.activeFilterCount}
          clients={list.uniqueClients}
          projectManagers={list.uniquePMs}
        />

        {/* Renewal banner */}
        {!bannerDismissed && list.renewalAlerts.length > 0 && (
          <ProjectsRenewalBanner
            renewalProjects={list.renewalAlerts}
            onViewRenewals={handleViewRenewals}
            onDismiss={() => setBannerDismissed(true)}
          />
        )}

        {/* Empty state (no projects at all) */}
        {list.stats.total === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Briefcase className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold">No projects yet</h3>
              <p className="text-muted-foreground text-center mt-2 max-w-sm">
                Projects help you organize campaigns for your clients. Create your first project to get started.
              </p>
              <Button className="mt-4" onClick={() => setSheetOpen(true)}>
                <Plus className="mr-1.5 h-4 w-4" />
                Add Project
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Views */}
            {list.view === 'table' && (
              <ProjectsTableView
                projects={list.groupBy ? list.filteredProjects : list.paginatedProjects}
                groupedProjects={list.groupedProjects}
                groupBy={list.groupBy}
                selectedIds={list.selectedIds}
                onToggleSelection={list.toggleSelection}
                onSelectAll={list.selectAll}
                isAllSelected={list.isAllSelected}
                onStatusChange={handleStatusChange}
                onArchive={handleArchive}
                getProjectBudget={list.getProjectBudget}
              />
            )}

            {list.view === 'card' && (
              <ProjectsCardView
                projects={list.paginatedProjects}
                selectedIds={list.selectedIds}
                onToggleSelection={list.toggleSelection}
                getProjectBudget={list.getProjectBudget}
              />
            )}

            {list.view === 'board' && (
              <ProjectsBoardView
                projects={list.filteredProjects}
                onStatusChange={handleStatusChange}
                getProjectBudget={list.getProjectBudget}
              />
            )}

            {/* Pagination (not for board view) */}
            {list.view !== 'board' && !list.groupBy && (
              <ProjectsPagination
                page={list.page}
                totalPages={list.totalPages}
                pageSize={list.pageSize}
                totalItems={list.filteredProjects.length}
                onPageChange={list.setPage}
                onPageSizeChange={list.setPageSize}
              />
            )}
          </>
        )}

        {/* Bulk actions */}
        <ProjectsBulkActions
          selectedCount={list.selectedIds.size}
          onClearSelection={list.clearSelection}
          onBulkStatusChange={handleBulkStatusChange}
          onBulkExport={handleBulkExport}
          onBulkArchive={handleBulkArchive}
        />
      </div>

      <CreateProjectSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onSuccess={() => list.refetch()}
      />
    </>
  )
}

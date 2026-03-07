"use client"

import { useState } from 'react'
import {
  Search,
  Filter,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  Group,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MultiSelect } from '@/components/ui/multi-select'
import { DateRangePicker } from '@/components/ui/date-range-picker'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import type {
  CampaignFilters,
  CampaignSortField,
  CampaignGroupField,
} from '@/hooks/use-campaigns-list'

interface CampaignsFilterBarProps {
  searchQuery: string
  onSearchChange: (q: string) => void
  filters: CampaignFilters
  onFilterChange: <K extends keyof CampaignFilters>(key: K, value: CampaignFilters[K]) => void
  sortBy: CampaignSortField
  sortDirection: 'asc' | 'desc'
  onSortChange: (field: CampaignSortField) => void
  groupBy: CampaignGroupField | null
  onGroupByChange: (g: CampaignGroupField | null) => void
  activeFilterCount: number
  clients: Array<{ id: string; name: string }>
  projects: Array<{ id: string; name: string; clientId: string }>
  projectManagers: Array<{ id: string; name: string }>
}

const STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'IN_REVIEW', label: 'In Review' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'COMPLETED', label: 'Completed' },
]

const PLATFORM_OPTIONS = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'twitter', label: 'Twitter' },
]

const TIER_OPTIONS = [
  { value: 'nano', label: 'Nano (<10K)' },
  { value: 'micro', label: 'Micro (10K–100K)' },
  { value: 'mid-tier', label: 'Mid-Tier (100K–500K)' },
  { value: 'macro', label: 'Macro (500K–1M)' },
  { value: 'mega', label: 'Mega (1M+)' },
]

const SORT_OPTIONS: { value: CampaignSortField; label: string }[] = [
  { value: 'goLiveDate', label: 'Go-Live Date' },
  { value: 'name', label: 'Campaign Name' },
  { value: 'budget', label: 'Budget' },
  { value: 'influencers', label: 'Influencers' },
  { value: 'createdAt', label: 'Created Date' },
  { value: 'approvalDeadline', label: 'Approval Deadline' },
]

const GROUP_OPTIONS: { value: CampaignGroupField; label: string }[] = [
  { value: 'client', label: 'Client' },
  { value: 'project', label: 'Project' },
  { value: 'status', label: 'Status' },
  { value: 'platform', label: 'Platform' },
  { value: 'goLiveMonth', label: 'Go-Live Month' },
]

export function CampaignsFilterBar({
  searchQuery,
  onSearchChange,
  filters,
  onFilterChange,
  sortBy,
  sortDirection,
  onSortChange,
  groupBy,
  onGroupByChange,
  activeFilterCount,
  clients,
  projects,
  projectManagers,
}: CampaignsFilterBarProps) {
  const [filtersExpanded, setFiltersExpanded] = useState(false)

  // Filter projects by selected client
  const filteredProjects = filters.clientId
    ? projects.filter((p) => p.clientId === filters.clientId)
    : projects

  return (
    <div className="space-y-3">
      {/* Top row */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search campaigns, clients, projects, influencers..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => setFiltersExpanded(!filtersExpanded)}
        >
          <Filter className="h-4 w-4" />
          Filters
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
              {activeFilterCount}
            </Badge>
          )}
          {filtersExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </Button>

        <Select value={sortBy} onValueChange={(v) => onSortChange(v as CampaignSortField)}>
          <SelectTrigger className="w-[170px] h-9 text-sm">
            <ArrowUpDown className="mr-1 h-3 w-3" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={() => onSortChange(sortBy)}
          title={sortDirection === 'asc' ? 'Ascending' : 'Descending'}
        >
          <ArrowUpDown className={`h-4 w-4 ${sortDirection === 'asc' ? 'rotate-180' : ''}`} />
        </Button>

        <Select
          value={groupBy || 'none'}
          onValueChange={(v) => onGroupByChange(v === 'none' ? null : v as CampaignGroupField)}
        >
          <SelectTrigger className="w-[160px] h-9 text-sm">
            <Group className="mr-1 h-3 w-3" />
            <SelectValue placeholder="Group by..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No grouping</SelectItem>
            {GROUP_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Expanded filter panel */}
      {filtersExpanded && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 rounded-lg border bg-muted/30">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Status</label>
            <MultiSelect
              options={STATUS_OPTIONS}
              selected={filters.status}
              onChange={(v) => onFilterChange('status', v)}
              placeholder="Any status"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Client</label>
            <Select
              value={filters.clientId || 'all'}
              onValueChange={(v) => onFilterChange('clientId', v === 'all' ? null : v)}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="All clients" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All clients</SelectItem>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Project</label>
            <Select
              value={filters.projectId || 'all'}
              onValueChange={(v) => onFilterChange('projectId', v === 'all' ? null : v)}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="All projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All projects</SelectItem>
                {filteredProjects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Platform</label>
            <MultiSelect
              options={PLATFORM_OPTIONS}
              selected={filters.platforms}
              onChange={(v) => onFilterChange('platforms', v)}
              placeholder="Any platform"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Influencer Tier</label>
            <MultiSelect
              options={TIER_OPTIONS}
              selected={filters.influencerTier}
              onChange={(v) => onFilterChange('influencerTier', v)}
              placeholder="Any tier"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Project Manager</label>
            <Select
              value={filters.projectManagerId || 'all'}
              onValueChange={(v) => onFilterChange('projectManagerId', v === 'all' ? null : v)}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="All PMs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All PMs</SelectItem>
                {projectManagers.map((pm) => (
                  <SelectItem key={pm.id} value={pm.id}>{pm.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Go-Live Date</label>
            <DateRangePicker
              dateRange={filters.goLiveDateRange}
              onDateRangeChange={(r) => onFilterChange('goLiveDateRange', r)}
              placeholder="Go-live date range"
              className="h-9 text-sm"
            />
          </div>

          <div className="flex flex-col gap-3 justify-center">
            <div className="flex items-center gap-2">
              <Switch
                id="hasOverdue"
                checked={filters.hasOverdue}
                onCheckedChange={(v) => onFilterChange('hasOverdue', v)}
              />
              <Label htmlFor="hasOverdue" className="text-xs">Has Overdue</Label>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

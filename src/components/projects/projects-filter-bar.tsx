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
import type { ProjectFilters, SortField, GroupField } from '@/hooks/use-projects-list'

interface ProjectsFilterBarProps {
  searchQuery: string
  onSearchChange: (q: string) => void
  filters: ProjectFilters
  onFilterChange: <K extends keyof ProjectFilters>(key: K, value: ProjectFilters[K]) => void
  sortBy: SortField
  sortDirection: 'asc' | 'desc'
  onSortChange: (field: SortField) => void
  groupBy: GroupField | null
  onGroupByChange: (g: GroupField | null) => void
  activeFilterCount: number
  clients: Array<{ id: string; name: string }>
  projectManagers: Array<{ id: string; name: string }>
}

const STATUS_OPTIONS = [
  { value: 'pitch', label: 'Pitch' },
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'completed', label: 'Completed' },
  { value: 'lost', label: 'Lost' },
]

const TYPE_OPTIONS = [
  { value: 'retainer', label: 'Retainer' },
  { value: 'one-off', label: 'One-off' },
  { value: 'always-on', label: 'Always-on' },
  { value: 'event', label: 'Event' },
  { value: 'gifting', label: 'Gifting' },
]

const PLATFORM_OPTIONS = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'twitter', label: 'Twitter' },
]

const PRIORITY_OPTIONS = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
]

const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: 'createdAt', label: 'Created Date' },
  { value: 'startDate', label: 'Start Date' },
  { value: 'name', label: 'Project Name' },
  { value: 'budget', label: 'Budget' },
  { value: 'endDate', label: 'End Date' },
  { value: 'campaigns', label: 'Campaigns' },
]

const GROUP_OPTIONS: { value: GroupField; label: string }[] = [
  { value: 'client', label: 'Client' },
  { value: 'projectManager', label: 'Project Manager' },
  { value: 'status', label: 'Status' },
  { value: 'projectType', label: 'Project Type' },
]

export function ProjectsFilterBar({
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
  projectManagers,
}: ProjectsFilterBarProps) {
  const [filtersExpanded, setFiltersExpanded] = useState(false)

  return (
    <div className="space-y-3">
      {/* Top row: search + filter toggle + sort + group */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search projects or clients..."
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

        <Select value={sortBy} onValueChange={(v) => onSortChange(v as SortField)}>
          <SelectTrigger className="w-[160px] h-9 text-sm">
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
          {sortDirection === 'asc' ? (
            <ArrowUpDown className="h-4 w-4 rotate-180" />
          ) : (
            <ArrowUpDown className="h-4 w-4" />
          )}
        </Button>

        <Select
          value={groupBy || 'none'}
          onValueChange={(v) => onGroupByChange(v === 'none' ? null : v as GroupField)}
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
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Type</label>
            <Select
              value={filters.projectType || 'all'}
              onValueChange={(v) => onFilterChange('projectType', v === 'all' ? null : v)}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {TYPE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
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
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Priority</label>
            <Select
              value={filters.priority || 'all'}
              onValueChange={(v) => onFilterChange('priority', v === 'all' ? null : v)}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Any priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any priority</SelectItem>
                {PRIORITY_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Start Date</label>
            <DateRangePicker
              dateRange={filters.startDateRange}
              onDateRangeChange={(r) => onFilterChange('startDateRange', r)}
              placeholder="Start date range"
              className="h-9 text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">End Date</label>
            <DateRangePicker
              dateRange={filters.endDateRange}
              onDateRangeChange={(r) => onFilterChange('endDateRange', r)}
              placeholder="End date range"
              className="h-9 text-sm"
            />
          </div>
        </div>
      )}
    </div>
  )
}

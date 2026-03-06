"use client"

import { X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import type { ProjectFilters } from '@/hooks/use-projects-list'

interface ProjectFilterChipsProps {
  filters: ProjectFilters
  onClearFilter: (key: keyof ProjectFilters) => void
  onClearAll: () => void
  activeFilterCount: number
  clients: Array<{ id: string; name: string }>
  projectManagers: Array<{ id: string; name: string }>
}

const FILTER_LABELS: Record<string, string> = {
  status: 'Status',
  clientId: 'Client',
  projectType: 'Type',
  platforms: 'Platform',
  projectManagerId: 'PM',
  priority: 'Priority',
  startDateRange: 'Start Date',
  endDateRange: 'End Date',
}

function formatDateRange(range: { from: Date | undefined; to: Date | undefined }): string {
  if (range.from && range.to) return `${format(range.from, 'MMM d')} – ${format(range.to, 'MMM d')}`
  if (range.from) return `From ${format(range.from, 'MMM d')}`
  if (range.to) return `Until ${format(range.to, 'MMM d')}`
  return ''
}

export function ProjectFilterChips({
  filters,
  onClearFilter,
  onClearAll,
  activeFilterCount,
  clients,
  projectManagers,
}: ProjectFilterChipsProps) {
  if (activeFilterCount === 0) return null

  const chips: { key: keyof ProjectFilters; label: string; value: string }[] = []

  if (filters.status.length > 0) {
    chips.push({ key: 'status', label: 'Status', value: filters.status.join(', ') })
  }
  if (filters.clientId) {
    const client = clients.find((c) => c.id === filters.clientId)
    chips.push({ key: 'clientId', label: 'Client', value: client?.name || filters.clientId })
  }
  if (filters.projectType) {
    chips.push({ key: 'projectType', label: 'Type', value: filters.projectType })
  }
  if (filters.platforms.length > 0) {
    chips.push({ key: 'platforms', label: 'Platform', value: filters.platforms.join(', ') })
  }
  if (filters.projectManagerId) {
    const pm = projectManagers.find((p) => p.id === filters.projectManagerId)
    chips.push({ key: 'projectManagerId', label: 'PM', value: pm?.name || filters.projectManagerId })
  }
  if (filters.priority) {
    chips.push({ key: 'priority', label: 'Priority', value: filters.priority })
  }
  if (filters.startDateRange.from || filters.startDateRange.to) {
    chips.push({ key: 'startDateRange', label: 'Start Date', value: formatDateRange(filters.startDateRange) })
  }
  if (filters.endDateRange.from || filters.endDateRange.to) {
    chips.push({ key: 'endDateRange', label: 'End Date', value: formatDateRange(filters.endDateRange) })
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {chips.map((chip) => (
        <Badge key={chip.key} variant="secondary" className="gap-1 pl-2 pr-1 py-1 text-xs">
          <span className="text-muted-foreground">{chip.label}:</span>
          <span className="capitalize">{chip.value}</span>
          <button
            onClick={() => onClearFilter(chip.key)}
            className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      {activeFilterCount > 1 && (
        <Button variant="ghost" size="sm" className="h-6 text-xs text-muted-foreground" onClick={onClearAll}>
          Clear all
        </Button>
      )}
    </div>
  )
}

"use client"

import { X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import type { CampaignFilters } from '@/hooks/use-campaigns-list'

interface CampaignFilterChipsProps {
  filters: CampaignFilters
  onClearFilter: (key: keyof CampaignFilters) => void
  onClearAll: () => void
  activeFilterCount: number
  clients: Array<{ id: string; name: string }>
  projects: Array<{ id: string; name: string }>
  projectManagers: Array<{ id: string; name: string }>
}

function formatDateRange(range: { from: Date | undefined; to: Date | undefined }): string {
  if (range.from && range.to) return `${format(range.from, 'MMM d')} – ${format(range.to, 'MMM d')}`
  if (range.from) return `From ${format(range.from, 'MMM d')}`
  if (range.to) return `Until ${format(range.to, 'MMM d')}`
  return ''
}

export function CampaignFilterChips({
  filters,
  onClearFilter,
  onClearAll,
  activeFilterCount,
  clients,
  projects,
  projectManagers,
}: CampaignFilterChipsProps) {
  if (activeFilterCount === 0) return null

  const chips: { key: keyof CampaignFilters; label: string; value: string }[] = []

  if (filters.status.length > 0) {
    chips.push({ key: 'status', label: 'Status', value: filters.status.join(', ') })
  }
  if (filters.clientId) {
    const client = clients.find((c) => c.id === filters.clientId)
    chips.push({ key: 'clientId', label: 'Client', value: client?.name || filters.clientId })
  }
  if (filters.projectId) {
    const project = projects.find((p) => p.id === filters.projectId)
    chips.push({ key: 'projectId', label: 'Project', value: project?.name || filters.projectId })
  }
  if (filters.platforms.length > 0) {
    chips.push({ key: 'platforms', label: 'Platform', value: filters.platforms.join(', ') })
  }
  if (filters.influencerTier.length > 0) {
    chips.push({ key: 'influencerTier', label: 'Tier', value: filters.influencerTier.join(', ') })
  }
  if (filters.projectManagerId) {
    const pm = projectManagers.find((p) => p.id === filters.projectManagerId)
    chips.push({ key: 'projectManagerId', label: 'PM', value: pm?.name || filters.projectManagerId })
  }
  if (filters.goLiveDateRange.from || filters.goLiveDateRange.to) {
    chips.push({ key: 'goLiveDateRange', label: 'Go-Live', value: formatDateRange(filters.goLiveDateRange) })
  }
  if (filters.hasOverdue) {
    chips.push({ key: 'hasOverdue', label: 'Overdue', value: 'Yes' })
  }
  if (filters.hasUnpaid) {
    chips.push({ key: 'hasUnpaid', label: 'Unpaid', value: 'Yes' })
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

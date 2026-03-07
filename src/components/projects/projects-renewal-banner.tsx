"use client"

import { Bell, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ProjectListItem } from '@/hooks/use-projects-list'

interface ProjectsRenewalBannerProps {
  renewalProjects: ProjectListItem[]
  onViewRenewals: () => void
  onDismiss: () => void
}

export function ProjectsRenewalBanner({ renewalProjects, onViewRenewals, onDismiss }: ProjectsRenewalBannerProps) {
  if (renewalProjects.length === 0) return null

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg bg-amber-50 border border-amber-200">
      <div className="flex items-center gap-2 text-sm">
        <Bell className="h-4 w-4 text-amber-600 shrink-0" />
        <span className="text-amber-800">
          <strong>{renewalProjects.length}</strong> retainer project{renewalProjects.length !== 1 ? 's are' : ' is'} due for renewal in the next 30 days
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onViewRenewals}>
          View
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDismiss}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}

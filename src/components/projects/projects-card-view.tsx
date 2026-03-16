"use client"

import Link from 'next/link'
import { Briefcase, Megaphone } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { StatusBadge } from '@/components/ui/status-badge'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/currency'
import { PlatformIcon } from '@/components/ui/platform-icon'
import type { ProjectListItem } from '@/hooks/use-projects-list'

interface ProjectsCardViewProps {
  projects: ProjectListItem[]
  selectedIds: Set<string>
  onToggleSelection: (id: string) => void
  getProjectBudget: (p: ProjectListItem) => number
}


function getTimelineProgress(startDate: string | null, endDate: string | null) {
  if (!startDate || !endDate) return null
  const start = new Date(startDate).getTime()
  const end = new Date(endDate).getTime()
  const now = Date.now()
  if (now < start) return { percent: 0, color: 'bg-gray-300' }
  if (now > end) return { percent: 100, color: 'bg-red-500' }
  const percent = Math.round(((now - start) / (end - start)) * 100)
  return { percent, color: percent > 80 ? 'bg-yellow-500' : 'bg-green-500' }
}

function formatDate(dateString: string | null) {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

function getInitials(name: string | null | undefined) {
  if (!name) return '?'
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

export function ProjectsCardView({ projects, selectedIds, onToggleSelection, getProjectBudget }: ProjectsCardViewProps) {
  if (projects.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <Briefcase className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
        <h3 className="font-semibold">No projects match your filters</h3>
        <p className="text-sm text-muted-foreground mt-1">Try adjusting your search or filters</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {projects.map((project) => {
        const budget = getProjectBudget(project)
        const timeline = getTimelineProgress(project.startDate, project.endDate)
        const isSelected = selectedIds.has(project.id)

        return (
          <Card
            key={project.id}
            className={cn(
              'group relative hover:shadow-md transition-shadow cursor-pointer',
              isSelected && 'ring-2 ring-primary'
            )}
          >
            <Link href={`/dashboard/projects/${project.id}`}>
              <CardContent className="p-4 space-y-3">
                {/* Header: client + type + checkbox */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-7 w-7">
                      {project.client.logoUrl && <AvatarImage src={project.client.logoUrl} />}
                      <AvatarFallback className="text-[10px]">
                        {getInitials(project.client.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-muted-foreground">{project.client.name}</span>
                  </div>
                  <div className="flex items-center gap-2" onClick={(e) => e.preventDefault()}>
                    {project.projectType && (
                      <Badge variant="secondary" className="text-[10px] h-5">{project.projectType}</Badge>
                    )}
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => onToggleSelection(project.id)}
                    />
                  </div>
                </div>

                {/* Name */}
                <h3 className="font-semibold text-sm truncate">{project.name}</h3>

                {/* Status */}
                <StatusBadge status={project.status || 'active'} type="project-status" />

                {/* Timeline */}
                {timeline && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>{formatDate(project.startDate)}</span>
                      <span>{formatDate(project.endDate)}</span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn('h-full rounded-full', timeline.color)}
                        style={{ width: `${Math.min(timeline.percent, 100)}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Budget */}
                {budget > 0 && (
                  <div className="text-sm font-medium">{formatCurrency(budget, project.currency || 'USD')}</div>
                )}

                {/* Platforms */}
                {(project.platforms || []).length > 0 && (
                  <div className="flex gap-1">
                    {(project.platforms || []).map((pl) => (
                      <PlatformIcon key={pl} platform={pl} className="h-3.5 w-3.5" />
                    ))}
                  </div>
                )}

                {/* Footer: PM + campaigns */}
                <div className="flex items-center justify-between pt-2 border-t">
                  {project.projectManager ? (
                    <div className="flex items-center gap-1.5">
                      <Avatar className="h-5 w-5">
                        <AvatarFallback className="text-[9px]">
                          {getInitials(project.projectManager.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-muted-foreground truncate max-w-[100px]">
                        {project.projectManager.name}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">No PM</span>
                  )}
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Megaphone className="h-3 w-3" />
                    <span>{project.campaigns.length}</span>
                  </div>
                </div>
              </CardContent>
            </Link>
          </Card>
        )
      })}
    </div>
  )
}

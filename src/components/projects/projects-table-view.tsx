"use client"

import { useState, Fragment } from 'react'
import Link from 'next/link'
import {
  Briefcase,
  MoreHorizontal,
  ChevronDown,
  ChevronRight,
  Building2,
  Bell,
  Plus,
  Archive,
  Eye,
  Pencil,
} from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import type { ProjectListItem, GroupField } from '@/hooks/use-projects-list'

interface ProjectsTableViewProps {
  projects: ProjectListItem[]
  groupedProjects: Map<string, ProjectListItem[]> | null
  groupBy: GroupField | null
  selectedIds: Set<string>
  onToggleSelection: (id: string) => void
  onSelectAll: () => void
  isAllSelected: boolean
  onStatusChange: (projectId: string, status: string) => void
  onArchive: (projectId: string) => void
  getProjectBudget: (p: ProjectListItem) => number
}

const STATUS_OPTIONS = [
  { value: 'pitch', label: 'Pitch' },
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'completed', label: 'Completed' },
  { value: 'lost', label: 'Lost' },
]

const STATUS_COLORS: Record<string, string> = {
  pitch: 'bg-blue-100 text-blue-700',
  active: 'bg-green-100 text-green-700',
  paused: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-gray-100 text-gray-500',
  lost: 'bg-red-100 text-red-700',
}

const PLATFORM_ICONS: Record<string, string> = {
  instagram: '📷',
  youtube: '▶️',
  tiktok: '🎵',
  facebook: '📘',
  linkedin: '💼',
  twitter: '🐦',
}

function formatCurrency(amount: number, currency: string | null) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDate(dateString: string | null) {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

function getTimelineProgress(startDate: string | null, endDate: string | null) {
  if (!startDate || !endDate) return null
  const start = new Date(startDate).getTime()
  const end = new Date(endDate).getTime()
  const now = Date.now()
  if (now < start) return { percent: 0, status: 'upcoming' as const, daysLabel: '' }
  if (now > end) {
    const overdue = Math.ceil((now - end) / (1000 * 60 * 60 * 24))
    return { percent: 100, status: 'overdue' as const, daysLabel: `${overdue}d overdue` }
  }
  const total = end - start
  const elapsed = now - start
  const percent = Math.round((elapsed / total) * 100)
  const daysLeft = Math.ceil((end - now) / (1000 * 60 * 60 * 24))
  return { percent, status: percent > 80 ? 'warning' as const : 'on-track' as const, daysLabel: `${daysLeft}d left` }
}

function getInitials(name: string | null | undefined) {
  if (!name) return '?'
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

function isRenewalSoon(renewalDate: string | null) {
  if (!renewalDate) return false
  const renewal = new Date(renewalDate).getTime()
  const now = Date.now()
  return renewal > now && renewal - now <= 30 * 24 * 60 * 60 * 1000
}

function ProjectRow({
  project,
  isSelected,
  onToggleSelection,
  onStatusChange,
  onArchive,
  budget,
}: {
  project: ProjectListItem
  isSelected: boolean
  onToggleSelection: () => void
  onStatusChange: (status: string) => void
  onArchive: () => void
  budget: number
}) {
  const timeline = getTimelineProgress(project.startDate, project.endDate)
  const activeCampaigns = project.campaigns.filter((c) => c.status === 'ACTIVE').length
  const completedCampaigns = project.campaigns.filter((c) => c.status === 'COMPLETED').length

  return (
    <TableRow className="group">
      <TableCell className="w-[40px]" onClick={(e) => e.stopPropagation()}>
        <Checkbox checked={isSelected} onCheckedChange={onToggleSelection} />
      </TableCell>

      {/* Project Name */}
      <TableCell className="max-w-[250px]">
        <Link href={`/dashboard/projects/${project.id}`} className="block">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
              <Briefcase className="h-4 w-4 text-purple-600" />
            </div>
            <div className="min-w-0">
              <span className="font-medium text-sm truncate block hover:underline">{project.name}</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                {project.projectType && (
                  <Badge variant="secondary" className="text-[10px] h-4 px-1">{project.projectType}</Badge>
                )}
                {(project.platforms || []).slice(0, 3).map((pl) => (
                  <span key={pl} className="text-xs" title={pl}>
                    {PLATFORM_ICONS[pl] || pl}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Link>
      </TableCell>

      {/* Client */}
      <TableCell>
        <Link
          href={`/dashboard/clients/${project.client.id}`}
          className="flex items-center gap-2 hover:underline"
        >
          <Avatar className="h-6 w-6">
            {project.client.logoUrl && <AvatarImage src={project.client.logoUrl} />}
            <AvatarFallback className="text-[10px]">
              {getInitials(project.client.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <span className="text-sm truncate block">{project.client.name}</span>
            {project.client.industry && (
              <span className="text-[10px] text-muted-foreground">{project.client.industry}</span>
            )}
          </div>
        </Link>
      </TableCell>

      {/* Status — inline editable */}
      <TableCell onClick={(e) => e.stopPropagation()}>
        <Select value={project.status || 'active'} onValueChange={onStatusChange}>
          <SelectTrigger className="h-7 w-auto gap-1 text-xs font-medium border-none px-2">
            <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', STATUS_COLORS[project.status || 'active'] || STATUS_COLORS.active)}>
              <SelectValue />
            </span>
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>

      {/* Timeline */}
      <TableCell>
        {project.startDate || project.endDate ? (
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">
              {formatDate(project.startDate)} – {formatDate(project.endDate)}
            </span>
            {timeline && (
              <>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      timeline.status === 'overdue' ? 'bg-red-500' :
                      timeline.status === 'warning' ? 'bg-yellow-500' : 'bg-green-500'
                    )}
                    style={{ width: `${Math.min(timeline.percent, 100)}%` }}
                  />
                </div>
                <span className={cn(
                  'text-[10px]',
                  timeline.status === 'overdue' ? 'text-red-600' : 'text-muted-foreground'
                )}>
                  {timeline.daysLabel}
                </span>
              </>
            )}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>

      {/* Budget */}
      <TableCell>
        {budget > 0 ? (
          <span className="text-sm font-medium">{formatCurrency(budget, project.currency)}</span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>

      {/* Campaigns */}
      <TableCell className="text-center">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-sm">{project.campaigns.length}</span>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">
                {activeCampaigns} active · {completedCampaigns} completed
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </TableCell>

      {/* PM */}
      <TableCell>
        {project.projectManager ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-[10px]">
                      {getInitials(project.projectManager.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs truncate max-w-[80px]">{project.projectManager.name}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">{project.projectManager.name} · {project.projectManager.email}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>

      {/* Renewal */}
      <TableCell>
        {project.projectType === 'retainer' && project.renewalDate ? (
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">
              {new Date(project.renewalDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
            {isRenewalSoon(project.renewalDate) && (
              <Bell className="h-3 w-3 text-amber-500" />
            )}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>

      {/* Actions */}
      <TableCell onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/dashboard/projects/${project.id}`}>
                <Eye className="mr-2 h-4 w-4" /> View
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Pencil className="mr-2 h-4 w-4" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/dashboard/campaigns/new?projectId=${project.id}&clientId=${project.client.id}`}>
                <Plus className="mr-2 h-4 w-4" /> Add Campaign
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={onArchive}>
              <Archive className="mr-2 h-4 w-4" /> Archive
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  )
}

export function ProjectsTableView({
  projects,
  groupedProjects,
  groupBy,
  selectedIds,
  onToggleSelection,
  onSelectAll,
  isAllSelected,
  onStatusChange,
  onArchive,
  getProjectBudget,
}: ProjectsTableViewProps) {
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())

  const toggleGroup = (key: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const headerRow = (
    <TableHeader>
      <TableRow>
        <TableHead className="w-[40px]">
          <Checkbox checked={isAllSelected} onCheckedChange={onSelectAll} />
        </TableHead>
        <TableHead className="w-[250px]">Project</TableHead>
        <TableHead>Client</TableHead>
        <TableHead>Status</TableHead>
        <TableHead>Timeline</TableHead>
        <TableHead>Budget</TableHead>
        <TableHead className="text-center">Campaigns</TableHead>
        <TableHead>PM</TableHead>
        <TableHead>Renewal</TableHead>
        <TableHead className="w-[50px]" />
      </TableRow>
    </TableHeader>
  )

  const renderRow = (p: ProjectListItem) => (
    <ProjectRow
      key={p.id}
      project={p}
      isSelected={selectedIds.has(p.id)}
      onToggleSelection={() => onToggleSelection(p.id)}
      onStatusChange={(status) => onStatusChange(p.id, status)}
      onArchive={() => onArchive(p.id)}
      budget={getProjectBudget(p)}
    />
  )

  if (projects.length === 0) {
    return (
      <div className="rounded-lg border p-8 text-center">
        <Briefcase className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
        <h3 className="font-semibold">No projects match your filters</h3>
        <p className="text-sm text-muted-foreground mt-1">Try adjusting your search or filters</p>
      </div>
    )
  }

  if (groupBy && groupedProjects) {
    return (
      <div className="rounded-lg border overflow-hidden">
        <Table>
          {headerRow}
          <TableBody>
            {Array.from(groupedProjects.entries()).map(([groupKey, items]) => {
              const isCollapsed = collapsedGroups.has(groupKey)
              const groupBudget = items.reduce((sum, p) => sum + getProjectBudget(p), 0)
              return (
                <Fragment key={groupKey}>
                  <TableRow
                    className="bg-muted/50 cursor-pointer hover:bg-muted"
                    onClick={() => toggleGroup(groupKey)}
                  >
                    <TableCell colSpan={10}>
                      <div className="flex items-center gap-2">
                        {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        <span className="font-medium capitalize">{groupKey}</span>
                        <Badge variant="secondary" className="text-xs">{items.length}</Badge>
                        {groupBudget > 0 && (
                          <span className="text-xs text-muted-foreground ml-2">
                            {formatCurrency(groupBudget, items[0]?.currency || 'USD')}
                          </span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                  {!isCollapsed && items.map(renderRow)}
                </Fragment>
              )
            })}
          </TableBody>
        </Table>
      </div>
    )
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      <Table>
        {headerRow}
        <TableBody>
          {projects.map(renderRow)}
        </TableBody>
      </Table>
    </div>
  )
}


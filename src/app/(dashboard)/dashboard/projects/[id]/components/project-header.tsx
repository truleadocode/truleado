"use client"

import { useState } from 'react'

import {
  Pencil,
  Plus,
  MoreHorizontal,
  Archive,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PageBreadcrumb } from '@/components/layout/page-breadcrumb'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { Project } from '../types'

interface ProjectHeaderProps {
  project: Project
  onStatusChange: (status: string) => void
  onArchiveProject: () => void
  onAddCampaign?: () => void
  onEditProject?: () => void
}

const projectStatuses = [
  { value: 'pitch', label: 'Pitch' },
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'completed', label: 'Completed' },
  { value: 'lost', label: 'Lost' },
]

const priorityColors: Record<string, string> = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-green-100 text-green-700',
}

function timeAgo(dateString: string) {
  const now = Date.now()
  const then = new Date(dateString).getTime()
  const diff = Math.floor((now - then) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function ProjectHeader({ project, onStatusChange, onArchiveProject, onAddCampaign, onEditProject }: ProjectHeaderProps) {
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false)

  const breadcrumbs = [
    { label: 'Clients', href: '/dashboard/clients' },
    { label: project.client.name, href: `/dashboard/clients/${project.client.id}` },
    { label: 'Projects', href: '/dashboard/projects' },
    { label: project.name },
  ]

  return (
    <div className="space-y-3">
      <PageBreadcrumb items={breadcrumbs} />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">{project.name}</h1>
          <Select value={project.status || 'active'} onValueChange={onStatusChange}>
            <SelectTrigger className="h-7 w-auto gap-1 text-xs font-medium border-none bg-muted px-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {projectStatuses.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {project.priority && (
            <Badge variant="secondary" className={priorityColors[project.priority] || ''}>
              {project.priority}
            </Badge>
          )}
          <span className="text-xs text-muted-foreground">Updated {timeAgo(project.createdAt)}</span>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onAddCampaign}>
            <Plus className="mr-1 h-4 w-4" />
            Add Campaign
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEditProject}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit Project
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setArchiveDialogOpen(true)}
              >
                <Archive className="mr-2 h-4 w-4" />
                Archive Project
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Archive confirmation dialog */}
      <Dialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Archive Project</DialogTitle>
            <DialogDescription>
              Are you sure you want to archive &quot;{project.name}&quot;? This will hide it from the active projects list.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setArchiveDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => { onArchiveProject(); setArchiveDialogOpen(false); }}>
              Archive
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

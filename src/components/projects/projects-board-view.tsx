"use client"

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { useDroppable } from '@dnd-kit/core'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { Megaphone } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/currency'
import type { ProjectListItem } from '@/hooks/use-projects-list'

interface ProjectsBoardViewProps {
  projects: ProjectListItem[]
  onStatusChange: (projectId: string, status: string) => void
  getProjectBudget: (p: ProjectListItem) => number
}

const COLUMNS = [
  { status: 'pitch', label: 'Pitch', color: 'border-t-blue-500' },
  { status: 'active', label: 'Active', color: 'border-t-green-500' },
  { status: 'paused', label: 'Paused', color: 'border-t-yellow-500' },
  { status: 'completed', label: 'Completed', color: 'border-t-gray-400' },
  { status: 'lost', label: 'Lost', color: 'border-t-red-500' },
]

function formatDate(dateString: string | null) {
  if (!dateString) return null
  return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getInitials(name: string | null | undefined) {
  if (!name) return '?'
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

// ----- Draggable Card -----

function DraggableBoardCard({ project, budget }: { project: ProjectListItem; budget: number }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: project.id,
  })

  const style = transform ? {
    transform: CSS.Translate.toString(transform),
  } : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn('touch-none', isDragging && 'opacity-50')}
    >
      <BoardCard project={project} budget={budget} />
    </div>
  )
}

function BoardCard({ project, budget }: { project: ProjectListItem; budget: number }) {
  return (
    <Card className="cursor-grab active:cursor-grabbing hover:shadow-sm">
      <CardContent className="p-3 space-y-2">
        <Link href={`/dashboard/projects/${project.id}`} className="font-medium text-sm hover:underline block truncate">
          {project.name}
        </Link>

        <div className="flex items-center gap-1.5">
          <Avatar className="h-5 w-5">
            {project.client.logoUrl && <AvatarImage src={project.client.logoUrl} />}
            <AvatarFallback className="text-[9px]">{getInitials(project.client.name)}</AvatarFallback>
          </Avatar>
          <span className="text-xs text-muted-foreground truncate">{project.client.name}</span>
        </div>

        {budget > 0 && (
          <div className="text-xs font-medium">{formatCurrency(budget, project.currency || 'USD')}</div>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          {project.endDate ? (
            <span>Due {formatDate(project.endDate)}</span>
          ) : (
            <span>No end date</span>
          )}
          <div className="flex items-center gap-1">
            <Megaphone className="h-3 w-3" />
            <span>{project.campaigns.length}</span>
          </div>
        </div>

        {project.projectManager && (
          <div className="flex items-center gap-1.5">
            <Avatar className="h-4 w-4">
              <AvatarFallback className="text-[8px]">{getInitials(project.projectManager.name)}</AvatarFallback>
            </Avatar>
            <span className="text-[10px] text-muted-foreground truncate">{project.projectManager.name}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ----- Droppable Column -----

function DroppableColumn({
  status,
  label,
  color,
  projects,
  totalBudget,
  currency,
  getProjectBudget,
}: {
  status: string
  label: string
  color: string
  projects: ProjectListItem[]
  totalBudget: number
  currency: string
  getProjectBudget: (p: ProjectListItem) => number
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col rounded-lg border border-t-4 bg-muted/30 min-h-[400px]',
        color,
        isOver && 'ring-2 ring-primary/50 bg-primary/5'
      )}
    >
      <div className="p-3 border-b">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-sm">{label}</h3>
          <Badge variant="secondary" className="text-xs">{projects.length}</Badge>
        </div>
        {totalBudget > 0 && (
          <p className="text-xs text-muted-foreground mt-1">{formatCurrency(totalBudget, currency)}</p>
        )}
      </div>
      <div className="p-2 space-y-2 flex-1 overflow-y-auto max-h-[calc(100vh-350px)]">
        {projects.map((p) => (
          <DraggableBoardCard key={p.id} project={p} budget={getProjectBudget(p)} />
        ))}
        {projects.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-8">No projects</p>
        )}
      </div>
    </div>
  )
}

// ----- Main Board -----

export function ProjectsBoardView({ projects, onStatusChange, getProjectBudget }: ProjectsBoardViewProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{ projectId: string; status: string } | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const columnProjects = useMemo(() => {
    const map: Record<string, ProjectListItem[]> = {}
    for (const col of COLUMNS) map[col.status] = []
    for (const p of projects) {
      const status = p.status || 'active'
      if (map[status]) map[status].push(p)
      else if (map.active) map.active.push(p)
    }
    return map
  }, [projects])

  const activeProject = activeId ? projects.find((p) => p.id === activeId) : null

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null)
    const { active, over } = event
    if (!over) return

    const projectId = active.id as string
    const newStatus = over.id as string
    const project = projects.find((p) => p.id === projectId)
    if (!project || (project.status || 'active') === newStatus) return

    // Confirm for lost/completed
    if (newStatus === 'lost' || newStatus === 'completed') {
      setConfirmDialog({ projectId, status: newStatus })
    } else {
      onStatusChange(projectId, newStatus)
    }
  }

  const handleConfirmStatusChange = () => {
    if (confirmDialog) {
      onStatusChange(confirmDialog.projectId, confirmDialog.status)
      setConfirmDialog(null)
    }
  }

  const defaultCurrency = projects[0]?.currency || 'USD'

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-5 gap-3 min-w-[900px] overflow-x-auto">
          {COLUMNS.map((col) => {
            const colProjects = columnProjects[col.status] || []
            const totalBudget = colProjects.reduce((sum, p) => sum + getProjectBudget(p), 0)
            return (
              <DroppableColumn
                key={col.status}
                status={col.status}
                label={col.label}
                color={col.color}
                projects={colProjects}
                totalBudget={totalBudget}
                currency={defaultCurrency}
                getProjectBudget={getProjectBudget}
              />
            )
          })}
        </div>

        <DragOverlay>
          {activeProject ? (
            <div className="w-[200px]">
              <BoardCard project={activeProject} budget={getProjectBudget(activeProject)} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Confirm dialog for Lost/Completed */}
      <Dialog open={!!confirmDialog} onOpenChange={() => setConfirmDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Change Status</DialogTitle>
            <DialogDescription>
              Are you sure you want to mark this project as {confirmDialog?.status}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog(null)}>Cancel</Button>
            <Button onClick={handleConfirmStatusChange}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

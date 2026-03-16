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
import { Users } from 'lucide-react'
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
import type { CampaignListItem } from '@/hooks/use-campaigns-list'

interface CampaignsBoardViewProps {
  campaigns: CampaignListItem[]
  onStatusTransition: (campaignId: string, fromStatus: string, toStatus: string) => Promise<void>
}

const COLUMNS = [
  { status: 'DRAFT', label: 'Draft', color: 'border-t-gray-400' },
  { status: 'ACTIVE', label: 'Active', color: 'border-t-green-500' },
  { status: 'IN_REVIEW', label: 'In Review', color: 'border-t-yellow-500' },
  { status: 'APPROVED', label: 'Approved', color: 'border-t-blue-500' },
  { status: 'COMPLETED', label: 'Completed', color: 'border-t-purple-500' },
  { status: 'ARCHIVED', label: 'Archived', color: 'border-t-gray-300' },
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

function DraggableBoardCard({ campaign }: { campaign: CampaignListItem }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: campaign.id,
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
      <BoardCard campaign={campaign} />
    </div>
  )
}

function BoardCard({ campaign }: { campaign: CampaignListItem }) {
  const approvedCount = campaign.deliverables.filter((d) => d.status === 'APPROVED').length
  const totalDeliverables = campaign.deliverables.length

  return (
    <Card className="cursor-grab active:cursor-grabbing hover:shadow-sm">
      <CardContent className="p-3 space-y-2">
        <Link
          href={`/dashboard/campaigns/${campaign.id}`}
          className="font-medium text-sm hover:underline block truncate"
          onClick={(e) => e.stopPropagation()}
        >
          {campaign.name}
        </Link>

        <div className="flex items-center gap-1.5">
          <Avatar className="h-5 w-5">
            {campaign.project.client.logoUrl && (
              <AvatarImage src={campaign.project.client.logoUrl} />
            )}
            <AvatarFallback className="text-[9px]">
              {getInitials(campaign.project.client.name)}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs text-muted-foreground truncate">
            {campaign.project.client.name}
          </span>
        </div>

        {campaign.totalBudget != null && campaign.totalBudget > 0 && (
          <div className="text-xs font-medium">
            {formatCurrency(campaign.totalBudget, campaign.currency || 'INR')}
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {campaign.startDate ? formatDate(campaign.startDate) : 'No date'}
            {campaign.endDate ? ` – ${formatDate(campaign.endDate)}` : ''}
          </span>
        </div>

        {/* Creator avatars + deliverable progress */}
        <div className="flex items-center justify-between">
          {campaign.creators.length > 0 ? (
            <div className="flex -space-x-1.5">
              {campaign.creators.slice(0, 3).map((cc) => (
                <Avatar key={cc.id} className="h-5 w-5 border-2 border-background">
                  {cc.creator.profilePictureUrl && (
                    <AvatarImage src={`/api/image-proxy?url=${encodeURIComponent(cc.creator.profilePictureUrl)}`} />
                  )}
                  <AvatarFallback className="text-[8px]">
                    {getInitials(cc.creator.displayName)}
                  </AvatarFallback>
                </Avatar>
              ))}
              {campaign.creators.length > 3 && (
                <div className="h-5 w-5 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                  <span className="text-[8px] font-medium">+{campaign.creators.length - 3}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="h-3 w-3" />
              <span>0</span>
            </div>
          )}

          {totalDeliverables > 0 && (
            <span className="text-[10px] text-muted-foreground">
              {approvedCount}/{totalDeliverables} approved
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ----- Droppable Column -----

function DroppableColumn({
  status,
  label,
  color,
  campaigns,
  totalBudget,
  currency,
}: {
  status: string
  label: string
  color: string
  campaigns: CampaignListItem[]
  totalBudget: number
  currency: string
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
          <Badge variant="secondary" className="text-xs">{campaigns.length}</Badge>
        </div>
        {totalBudget > 0 && (
          <p className="text-xs text-muted-foreground mt-1">{formatCurrency(totalBudget, currency)}</p>
        )}
      </div>
      <div className="p-2 space-y-2 flex-1 overflow-y-auto max-h-[calc(100vh-350px)]">
        {campaigns.map((c) => (
          <DraggableBoardCard key={c.id} campaign={c} />
        ))}
        {campaigns.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-8">No campaigns</p>
        )}
      </div>
    </div>
  )
}

// ----- Main Board -----

export function CampaignsBoardView({ campaigns, onStatusTransition }: CampaignsBoardViewProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{
    campaignId: string
    fromStatus: string
    toStatus: string
    label: string
  } | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const columnCampaigns = useMemo(() => {
    const map: Record<string, CampaignListItem[]> = {}
    for (const col of COLUMNS) map[col.status] = []
    for (const c of campaigns) {
      const status = c.status || 'DRAFT'
      if (map[status]) map[status].push(c)
      else map.DRAFT.push(c)
    }
    return map
  }, [campaigns])

  const activeCampaign = activeId ? campaigns.find((c) => c.id === activeId) : null

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null)
    const { active, over } = event
    if (!over) return

    const campaignId = active.id as string
    const toStatus = over.id as string
    const campaign = campaigns.find((c) => c.id === campaignId)
    if (!campaign || campaign.status === toStatus) return

    const targetLabel = COLUMNS.find((col) => col.status === toStatus)?.label || toStatus

    // Confirm for terminal states
    if (toStatus === 'COMPLETED' || toStatus === 'ARCHIVED') {
      setConfirmDialog({
        campaignId,
        fromStatus: campaign.status,
        toStatus,
        label: targetLabel,
      })
    } else {
      onStatusTransition(campaignId, campaign.status, toStatus)
    }
  }

  const handleConfirmStatusChange = () => {
    if (confirmDialog) {
      onStatusTransition(confirmDialog.campaignId, confirmDialog.fromStatus, confirmDialog.toStatus)
      setConfirmDialog(null)
    }
  }

  const defaultCurrency = campaigns[0]?.currency || 'INR'

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-6 gap-3 min-w-[1100px] overflow-x-auto">
          {COLUMNS.map((col) => {
            const colCampaigns = columnCampaigns[col.status] || []
            const totalBudget = colCampaigns.reduce((sum, c) => sum + (c.totalBudget || 0), 0)
            return (
              <DroppableColumn
                key={col.status}
                status={col.status}
                label={col.label}
                color={col.color}
                campaigns={colCampaigns}
                totalBudget={totalBudget}
                currency={defaultCurrency}
              />
            )
          })}
        </div>

        <DragOverlay>
          {activeCampaign ? (
            <div className="w-[200px]">
              <BoardCard campaign={activeCampaign} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Confirm dialog for Completed/Archived */}
      <Dialog open={!!confirmDialog} onOpenChange={() => setConfirmDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Change Status</DialogTitle>
            <DialogDescription>
              Are you sure you want to mark this campaign as {confirmDialog?.label}?
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

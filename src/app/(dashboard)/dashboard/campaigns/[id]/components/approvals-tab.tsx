"use client"

import { useState, useMemo, useCallback } from 'react'
import {
  CheckCircle,
  XCircle,
  Pencil,
  Send,
  Clock,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { graphqlRequest, mutations } from '@/lib/graphql/client'
import { useToast } from '@/hooks/use-toast'
import { ResendNotificationButton } from '@/components/resend-notification-button'
import type { Campaign, CampaignDeliverable } from '../types'

interface ApprovalsTabProps {
  campaign: Campaign
  onRefresh?: () => void
}

function getInitials(name: string | null | undefined) {
  if (!name) return '?'
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

function timeAgo(dateStr: string) {
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function daysUntilDue(dueDate: string | null) {
  if (!dueDate) return null
  return Math.ceil((new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

const PENDING_STATUSES = ['SUBMITTED', 'INTERNAL_REVIEW', 'PENDING_PROJECT_APPROVAL', 'CLIENT_REVIEW']
const APPROVED_STATUSES = ['APPROVED']

const STATUS_LABELS: Record<string, string> = {
  SUBMITTED: 'Submitted',
  INTERNAL_REVIEW: 'In Campaign Review',
  PENDING_PROJECT_APPROVAL: 'Project Review',
  CLIENT_REVIEW: 'Client Review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
}

const STATUS_COLORS: Record<string, string> = {
  SUBMITTED: 'bg-yellow-100 text-yellow-700',
  INTERNAL_REVIEW: 'bg-orange-100 text-orange-700',
  PENDING_PROJECT_APPROVAL: 'bg-orange-100 text-orange-700',
  CLIENT_REVIEW: 'bg-blue-100 text-blue-700',
  APPROVED: 'bg-teal-100 text-teal-700',
  REJECTED: 'bg-red-100 text-red-700',
}

function DeliverableApprovalCard({
  deliverable,
  campaign,
  isPending,
  onApprove,
  onReject,
  onRequestRevision,
}: {
  deliverable: CampaignDeliverable
  campaign: Campaign
  isPending: boolean
  onApprove?: (deliverableId: string) => void
  onReject?: (deliverableId: string) => void
  onRequestRevision?: (deliverableId: string) => void
}) {
  const creator = campaign.creators.find((cc) => cc.creator.id === deliverable.creator?.id)
  const daysDue = daysUntilDue(deliverable.dueDate)
  const latestVersion = deliverable.versions[deliverable.versions.length - 1]
  const submittedDate = deliverable.submissionEvents.length > 0
    ? deliverable.submissionEvents[deliverable.submissionEvents.length - 1].createdAt
    : latestVersion?.createdAt || deliverable.createdAt

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 min-w-0">
            <Avatar className="h-9 w-9 mt-0.5">
              {creator?.creator.profilePictureUrl && <AvatarImage src={creator.creator.profilePictureUrl} />}
              <AvatarFallback className="text-xs">
                {getInitials(deliverable.creator?.displayName || creator?.creator.displayName)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-sm font-medium">{deliverable.title}</p>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                <span>{deliverable.creator?.displayName || 'Unassigned'}</span>
                <span>·</span>
                <span>{deliverable.deliverableType}</span>
                <span>·</span>
                <span>Submitted {timeAgo(submittedDate)}</span>
              </div>
              {deliverable.versions.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Version {deliverable.versions.length}
                  {latestVersion?.caption && ' — has caption'}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {daysDue !== null && isPending && (
              <span className={cn(
                'text-xs font-medium',
                daysDue < 0 ? 'text-destructive' : daysDue <= 2 ? 'text-yellow-600' : 'text-muted-foreground'
              )}>
                {daysDue < 0 ? (
                  <span className="flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {Math.abs(daysDue)}d overdue
                  </span>
                ) : (
                  `${daysDue}d left`
                )}
              </span>
            )}
            <Badge className={cn('text-[10px]', STATUS_COLORS[deliverable.status] || 'bg-gray-100')}>
              {STATUS_LABELS[deliverable.status] || deliverable.status}
            </Badge>
            {isPending && (
              <ResendNotificationButton
                notificationType="APPROVAL_REQUESTED"
                entityId={deliverable.id}
              />
            )}
          </div>
        </div>

        {/* Actions for pending */}
        {isPending && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t">
            <Button size="sm" className="h-7 text-xs" onClick={() => onApprove?.(deliverable.id)}>
              <CheckCircle className="mr-1 h-3.5 w-3.5" />
              Approve
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => onRequestRevision?.(deliverable.id)}>
              <Pencil className="mr-1 h-3.5 w-3.5" />
              Request Revision
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-xs text-destructive hover:text-destructive" onClick={() => onReject?.(deliverable.id)}>
              <XCircle className="mr-1 h-3.5 w-3.5" />
              Reject
            </Button>
          </div>
        )}

        {/* Approved info */}
        {!isPending && deliverable.approvals.length > 0 && (
          <div className="mt-2 text-xs text-muted-foreground">
            Approved by {deliverable.approvals[0].decidedBy?.name || 'System'}
            {' · '}
            {timeAgo(deliverable.approvals[0].decidedAt)}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function ApprovalsTab({ campaign, onRefresh }: ApprovalsTabProps) {
  const { toast } = useToast()
  const [sortBy, setSortBy] = useState<'deadline' | 'submitted' | 'influencer'>('deadline')
  const [approvedExpanded, setApprovedExpanded] = useState(false)

  const handleApprove = useCallback(async (deliverableId: string) => {
    try {
      await graphqlRequest(mutations.approveDeliverable, { deliverableId })
      toast({ title: 'Deliverable approved' })
      onRefresh?.()
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : 'Failed to approve', variant: 'destructive' })
    }
  }, [toast, onRefresh])

  const handleReject = useCallback(async (deliverableId: string) => {
    try {
      await graphqlRequest(mutations.rejectDeliverable, { deliverableId })
      toast({ title: 'Deliverable rejected' })
      onRefresh?.()
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : 'Failed to reject', variant: 'destructive' })
    }
  }, [toast, onRefresh])

  const handleRequestRevision = useCallback(async (deliverableId: string) => {
    try {
      await graphqlRequest(mutations.requestDeliverableRevision, { deliverableId })
      toast({ title: 'Revision requested' })
      onRefresh?.()
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : 'Failed to request revision', variant: 'destructive' })
    }
  }, [toast, onRefresh])

  const handleRemindAll = useCallback(async () => {
    try {
      for (const d of campaign.deliverables.filter((d) => PENDING_STATUSES.includes(d.status))) {
        await graphqlRequest(mutations.sendDeliverableReminder, { deliverableId: d.id }).catch(() => {})
      }
      toast({ title: 'Reminders sent' })
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : 'Failed to send reminders', variant: 'destructive' })
    }
  }, [campaign.deliverables, toast])

  const pending = useMemo(() => {
    let list = campaign.deliverables.filter((d) => PENDING_STATUSES.includes(d.status))
    if (sortBy === 'deadline') {
      list.sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0
        if (!a.dueDate) return 1
        if (!b.dueDate) return -1
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      })
    } else if (sortBy === 'submitted') {
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    } else {
      list.sort((a, b) => (a.creator?.displayName || '').localeCompare(b.creator?.displayName || ''))
    }
    return list
  }, [campaign.deliverables, sortBy])

  const approved = useMemo(
    () => campaign.deliverables.filter((d) => APPROVED_STATUSES.includes(d.status)),
    [campaign.deliverables]
  )

  const rejected = useMemo(
    () => campaign.deliverables.filter((d) => d.status === 'REJECTED'),
    [campaign.deliverables]
  )

  return (
    <div className="space-y-6">
      {/* Pending Approvals */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Pending Approvals ({pending.length})</h3>
          <div className="flex items-center gap-2">
            {pending.length > 0 && (
              <Button variant="outline" size="sm" className="text-xs" onClick={handleRemindAll}>
                <Send className="mr-1 h-3 w-3" />
                Remind All
              </Button>
            )}
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
              <SelectTrigger className="w-[140px] h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="deadline">Sort: Deadline</SelectItem>
                <SelectItem value="submitted">Sort: Submitted</SelectItem>
                <SelectItem value="influencer">Sort: Influencer</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {pending.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center py-8">
              <CheckCircle className="h-10 w-10 text-green-500 mb-3" />
              <p className="text-sm font-medium">All caught up!</p>
              <p className="text-xs text-muted-foreground mt-1">No deliverables pending approval.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {pending.map((d) => (
              <DeliverableApprovalCard key={d.id} deliverable={d} campaign={campaign} isPending onApprove={handleApprove} onReject={handleReject} onRequestRevision={handleRequestRevision} />
            ))}
          </div>
        )}
      </div>

      <Separator />

      {/* Approved Content */}
      <div className="space-y-3">
        <button
          className="flex items-center gap-2 text-sm font-semibold w-full text-left"
          onClick={() => setApprovedExpanded(!approvedExpanded)}
        >
          {approvedExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          Approved Content ({approved.length})
        </button>

        {approvedExpanded && (
          <div className="space-y-2">
            {approved.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No approved content yet.</p>
            ) : (
              approved.map((d) => (
                <DeliverableApprovalCard key={d.id} deliverable={d} campaign={campaign} isPending={false} />
              ))
            )}
          </div>
        )}
      </div>

      {/* Rejected */}
      {rejected.length > 0 && (
        <>
          <Separator />
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-destructive">Rejected ({rejected.length})</h3>
            <div className="space-y-2">
              {rejected.map((d) => (
                <DeliverableApprovalCard key={d.id} deliverable={d} campaign={campaign} isPending={false} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

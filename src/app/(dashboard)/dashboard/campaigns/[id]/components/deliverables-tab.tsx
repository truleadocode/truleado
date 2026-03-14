"use client"

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search,
  Plus,
  Package,
  MoreHorizontal,
  Eye,
  Trash2,
  ExternalLink,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Bell } from 'lucide-react'
import { cn } from '@/lib/utils'
import { graphqlRequest, mutations } from '@/lib/graphql/client'
import { useToast } from '@/hooks/use-toast'
import { AddDeliverableDialog } from './add-deliverable-dialog'
import type { Campaign, CampaignDeliverable } from '../types'

interface DeliverablesTabProps {
  campaign: Campaign
  onRefresh?: () => void
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-gray-100 text-gray-700',
  RECEIVED: 'bg-purple-100 text-purple-700',
  SUBMITTED: 'bg-yellow-100 text-yellow-700',
  INTERNAL_REVIEW: 'bg-orange-100 text-orange-700',
  PENDING_PROJECT_APPROVAL: 'bg-orange-100 text-orange-700',
  CLIENT_REVIEW: 'bg-blue-100 text-blue-700',
  APPROVED: 'bg-teal-100 text-teal-700',
  REJECTED: 'bg-red-100 text-red-700',
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  RECEIVED: 'Received',
  SUBMITTED: 'Submitted',
  INTERNAL_REVIEW: 'In Review',
  PENDING_PROJECT_APPROVAL: 'Project Review',
  CLIENT_REVIEW: 'Client Review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
}

const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'SUBMITTED', label: 'Submitted' },
  { value: 'INTERNAL_REVIEW', label: 'In Review' },
  { value: 'CLIENT_REVIEW', label: 'Client Review' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
]

export function DeliverablesTab({ campaign, onRefresh }: DeliverablesTabProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [addDialogOpen, setAddDialogOpen] = useState(false)

  const handleRemoveDeliverable = async (deliverableId: string) => {
    try {
      await graphqlRequest(mutations.removeDeliverable, { deliverableId })
      toast({ title: 'Deliverable removed' })
      onRefresh?.()
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : 'Failed to remove deliverable', variant: 'destructive' })
    }
  }

  const handleResendNotification = async (deliverableId: string) => {
    try {
      await graphqlRequest(mutations.resendNotification, { type: 'APPROVAL_REQUESTED', entityId: deliverableId })
      toast({ title: 'Notification sent' })
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : 'Failed to send notification', variant: 'destructive' })
    }
  }

  // Filter deliverables
  const filteredDeliverables = useMemo(() => {
    let list = [...campaign.deliverables]

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      list = list.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          d.deliverableType.toLowerCase().includes(q) ||
          (d.creator?.displayName || '').toLowerCase().includes(q)
      )
    }

    if (statusFilter !== 'all') {
      list = list.filter((d) => d.status === statusFilter)
    }

    // Sort: overdue first, then by due date, then by created date
    list.sort((a, b) => {
      const now = Date.now()
      const aOverdue = a.dueDate && new Date(a.dueDate).getTime() < now && a.status === 'PENDING' ? 1 : 0
      const bOverdue = b.dueDate && new Date(b.dueDate).getTime() < now && b.status === 'PENDING' ? 1 : 0
      if (bOverdue !== aOverdue) return bOverdue - aOverdue
      if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      if (a.dueDate) return -1
      if (b.dueDate) return 1
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

    return list
  }, [campaign.deliverables, searchQuery, statusFilter])

  // Status counts
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: campaign.deliverables.length }
    for (const d of campaign.deliverables) {
      counts[d.status] = (counts[d.status] || 0) + 1
    }
    return counts
  }, [campaign.deliverables])

  const overdueCount = useMemo(() => {
    const now = Date.now()
    return campaign.deliverables.filter(
      (d) => d.dueDate && new Date(d.dueDate).getTime() < now && d.status === 'PENDING'
    ).length
  }, [campaign.deliverables])

  // Creators list for the add dialog
  const availableCreators = useMemo(() => {
    return campaign.creators
      .filter((c) => c.status !== 'REMOVED' && c.status !== 'DECLINED')
      .map((c) => ({ id: c.creator.id, displayName: c.creator.displayName }))
  }, [campaign.creators])

  const isOverdue = (d: CampaignDeliverable) => {
    return d.dueDate && new Date(d.dueDate).getTime() < Date.now() && d.status === 'PENDING'
  }

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9 w-[250px]"
              placeholder="Search deliverables..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTERS.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label} {statusCounts[f.value] !== undefined ? `(${statusCounts[f.value]})` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button size="sm" onClick={() => setAddDialogOpen(true)}>
          <Plus className="mr-1 h-4 w-4" />
          Add Deliverable
        </Button>
      </div>

      {/* Deliverables Table */}
      {filteredDeliverables.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold">No deliverables yet</h3>
            <p className="text-muted-foreground text-center mt-2 max-w-sm">
              Create deliverables to track content for this campaign.
            </p>
            <Button className="mt-4" onClick={() => setAddDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Deliverable
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Title</TableHead>
                <TableHead className="text-xs">Creator</TableHead>
                <TableHead className="text-xs">Type</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Due Date</TableHead>
                <TableHead className="text-xs">Versions</TableHead>
                <TableHead className="text-xs w-[50px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDeliverables.map((d) => {
                const urls = d.trackingRecord?.urls || []
                return (
                  <TableRow
                    key={d.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/dashboard/deliverables/${d.id}`)}
                  >
                    <TableCell className="text-xs font-medium max-w-[200px] truncate">
                      {d.title}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {d.creator?.displayName || <span className="italic">Unassigned</span>}
                    </TableCell>
                    <TableCell className="text-xs">{d.deliverableType}</TableCell>
                    <TableCell>
                      {(() => {
                        const ds = d.status === 'PENDING' && d.versions.length > 0 ? 'RECEIVED' : d.status
                        return (
                          <Badge className={cn('text-[10px]', STATUS_COLORS[ds] || 'bg-gray-100')}>
                            {STATUS_LABELS[ds] || ds}
                          </Badge>
                        )
                      })()}
                    </TableCell>
                    <TableCell className={cn('text-xs', isOverdue(d) ? 'text-red-600 font-medium' : 'text-muted-foreground')}>
                      {d.dueDate
                        ? new Date(d.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                        : '—'}
                      {isOverdue(d) && ' (overdue)'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      v{d.versions.length}
                      {urls.length > 0 && (
                        <a
                          href={urls[0].url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 text-primary hover:underline inline-flex items-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/deliverables/${d.id}`) }}>
                            <Eye className="mr-2 h-3.5 w-3.5" />
                            View Details
                          </DropdownMenuItem>
                          {['INTERNAL_REVIEW', 'PENDING_PROJECT_APPROVAL', 'CLIENT_REVIEW'].includes(d.status) && (
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleResendNotification(d.id) }}>
                              <Bell className="mr-2 h-3.5 w-3.5" />
                              Resend Approval Request
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={(e) => { e.stopPropagation(); handleRemoveDeliverable(d.id) }}
                          >
                            <Trash2 className="mr-2 h-3.5 w-3.5" />
                            Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Summary bar */}
      {campaign.deliverables.length > 0 && (
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>{campaign.deliverables.length} total</span>
          {(statusCounts['APPROVED'] || 0) > 0 && (
            <Badge variant="outline" className="text-[10px] text-teal-700">{statusCounts['APPROVED']} approved</Badge>
          )}
          {(statusCounts['PENDING'] || 0) > 0 && (
            <Badge variant="outline" className="text-[10px]">{statusCounts['PENDING']} pending</Badge>
          )}
          {overdueCount > 0 && (
            <Badge variant="outline" className="text-[10px] text-red-600 border-red-200">{overdueCount} overdue</Badge>
          )}
        </div>
      )}

      {/* Add Deliverable Dialog */}
      <AddDeliverableDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        campaignId={campaign.id}
        creators={availableCreators}
        onSuccess={() => onRefresh?.()}
      />
    </div>
  )
}

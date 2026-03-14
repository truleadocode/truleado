"use client"

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { FileCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/status-badge'
import { ResendNotificationButton } from '@/components/resend-notification-button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Project } from '../types'

interface ApprovalsTabProps {
  project: Project
}

function formatDate(dateString: string | null) {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

interface FlatDeliverable {
  id: string
  title: string
  status: string
  dueDate: string | null
  campaignId: string
  campaignName: string
}

const statusFilters = ['all', 'pending', 'approved', 'rejected']
const statusLabels: Record<string, string> = {
  all: 'All',
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
}

const pendingStatuses = ['pending', 'submitted', 'internal_review', 'pending_project_approval', 'client_review']
const approvedStatuses = ['approved']
const rejectedStatuses = ['rejected']

function getFilterGroup(status: string): string {
  if (pendingStatuses.includes(status.toLowerCase())) return 'pending'
  if (approvedStatuses.includes(status.toLowerCase())) return 'approved'
  if (rejectedStatuses.includes(status.toLowerCase())) return 'rejected'
  return 'pending'
}

export function ApprovalsTab({ project }: ApprovalsTabProps) {
  const [filter, setFilter] = useState('all')

  const flatDeliverables = useMemo(() => {
    const list: FlatDeliverable[] = []
    for (const campaign of project.campaigns) {
      for (const d of campaign.deliverables) {
        list.push({
          id: d.id,
          title: d.title,
          status: d.status,
          dueDate: d.dueDate,
          campaignId: campaign.id,
          campaignName: campaign.name,
        })
      }
    }
    return list
  }, [project.campaigns])

  const filterCounts = useMemo(() => {
    const counts: Record<string, number> = { all: flatDeliverables.length }
    for (const d of flatDeliverables) {
      const group = getFilterGroup(d.status)
      counts[group] = (counts[group] || 0) + 1
    }
    return counts
  }, [flatDeliverables])

  const filteredDeliverables = useMemo(
    () => filter === 'all'
      ? flatDeliverables
      : flatDeliverables.filter((d) => getFilterGroup(d.status) === filter),
    [flatDeliverables, filter]
  )

  if (flatDeliverables.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileCheck className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="font-semibold">No deliverables yet</h3>
          <p className="text-muted-foreground text-center mt-2 max-w-sm">
            Deliverables from campaigns in this project will appear here.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {statusFilters.map((s) => {
          const count = filterCounts[s] || 0
          if (s !== 'all' && count === 0) return null
          return (
            <Badge
              key={s}
              variant={filter === s ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setFilter(s)}
            >
              {statusLabels[s]} ({count})
            </Badge>
          )
        })}
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Deliverable</TableHead>
              <TableHead>Campaign</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Due Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredDeliverables.map((d) => (
              <TableRow key={d.id}>
                <TableCell>
                  <Link href={`/dashboard/deliverables/${d.id}`} className="text-sm font-medium hover:underline">
                    {d.title}
                  </Link>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{d.campaignName}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <StatusBadge status={d.status} type="deliverable" />
                    {['INTERNAL_REVIEW', 'PENDING_PROJECT_APPROVAL', 'CLIENT_REVIEW'].includes(d.status) && (
                      <ResendNotificationButton
                        notificationType="APPROVAL_REQUESTED"
                        entityId={d.id}
                      />
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatDate(d.dueDate)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

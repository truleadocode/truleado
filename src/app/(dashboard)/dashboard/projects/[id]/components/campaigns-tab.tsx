"use client"

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Plus, Megaphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/status-badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Project } from '../types'

interface CampaignsTabProps {
  project: Project
  onAddCampaign?: () => void
}

function formatDate(dateString: string | null) {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const statusFilters = ['all', 'draft', 'active', 'in_review', 'approved', 'completed']
const statusLabels: Record<string, string> = {
  all: 'All',
  draft: 'Draft',
  active: 'Active',
  in_review: 'In Review',
  approved: 'Approved',
  completed: 'Completed',
}

export function CampaignsTab({ project, onAddCampaign }: CampaignsTabProps) {
  const [filter, setFilter] = useState('all')

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: project.campaigns.length }
    for (const c of project.campaigns) {
      counts[c.status] = (counts[c.status] || 0) + 1
    }
    return counts
  }, [project.campaigns])

  const filteredCampaigns = useMemo(
    () => filter === 'all' ? project.campaigns : project.campaigns.filter((c) => c.status === filter),
    [project.campaigns, filter]
  )

  return (
    <div className="space-y-4">
      {/* Status filter chips */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {statusFilters.map((s) => {
            const count = statusCounts[s] || 0
            if (s !== 'all' && count === 0) return null
            return (
              <Badge
                key={s}
                variant={filter === s ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setFilter(s)}
              >
                {statusLabels[s]} {count > 0 && `(${count})`}
              </Badge>
            )
          })}
        </div>
        <Button size="sm" onClick={onAddCampaign}>
          <Plus className="mr-1 h-4 w-4" />
          Add Campaign
        </Button>
      </div>

      {filteredCampaigns.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Megaphone className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold">No campaigns yet</h3>
            <p className="text-muted-foreground text-center mt-2 max-w-sm">Add your first campaign to this project.</p>
            <Button className="mt-4" onClick={onAddCampaign}>
              <Plus className="mr-1 h-4 w-4" />
              Add Campaign
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaign</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>End</TableHead>
                <TableHead className="text-center">Deliverables</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCampaigns.map((campaign) => {
                const approvedCount = campaign.deliverables.filter((d) => d.status === 'approved').length
                return (
                  <TableRow key={campaign.id}>
                    <TableCell className="font-medium">{campaign.name}</TableCell>
                    <TableCell>
                      <StatusBadge status={campaign.status} type="campaign" />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(campaign.startDate)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(campaign.endDate)}</TableCell>
                    <TableCell className="text-center text-sm">
                      {approvedCount}/{campaign.deliverables.length}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/dashboard/campaigns/${campaign.id}`}>View</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

"use client"

import Link from 'next/link'
import { Megaphone } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/status-badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { ContactClient } from '../types'

interface CampaignsSectionProps {
  client: ContactClient
}

function formatDate(dateString: string | null) {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

export function CampaignsSection({ client }: CampaignsSectionProps) {
  // Flatten all campaigns from all projects
  const campaigns = client.projects.flatMap((project) =>
    project.campaigns.map((c) => ({ ...c, projectName: project.name, projectId: project.id }))
  )

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Campaigns Involved In</CardTitle>
      </CardHeader>
      <CardContent>
        {campaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8">
            <Megaphone className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No campaigns yet</p>
          </div>
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Start Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Link
                        href={`/dashboard/campaigns/${c.id}`}
                        className="text-sm font-medium hover:underline"
                      >
                        {c.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/dashboard/projects/${c.projectId}`}
                        className="text-sm text-muted-foreground hover:underline"
                      >
                        {c.projectName}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={c.status} />
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(c.startDate)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

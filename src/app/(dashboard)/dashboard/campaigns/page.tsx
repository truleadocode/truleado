"use client"

import { useState, useMemo } from 'react'
import { Megaphone, MoreHorizontal } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ListPageShell } from '@/components/layout/list-page-shell'
import { StatusBadge } from '@/components/ui/status-badge'
import { useAuth } from '@/contexts/auth-context'
import { queries } from '@/lib/graphql/client'
import { useGraphQLQuery } from '@/hooks/use-graphql-query'
import { getCampaignStatusLabel } from '@/lib/campaign-status'

interface Campaign {
  id: string
  name: string
  description: string | null
  status: string
  campaignType: string
  startDate: string | null
  endDate: string | null
  createdAt: string
  project: {
    id: string
    name: string
    client: {
      id: string
      name: string
    }
  }
  deliverables: { id: string }[]
  creators: { id: string; creator: { id: string; displayName: string } }[]
}

export default function CampaignsPage() {
  const { currentAgency } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const { data, isLoading: loading, error: queryError } = useGraphQLQuery<{ allCampaigns: Campaign[] }>(
    ['allCampaigns', currentAgency?.id],
    queries.allCampaigns,
    { agencyId: currentAgency?.id },
    { enabled: !!currentAgency?.id }
  )

  const campaigns = data?.allCampaigns ?? []
  const error = queryError?.message ?? null

  const filteredCampaigns = useMemo(() =>
    campaigns.filter((campaign) => {
      const matchesSearch =
        campaign.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        campaign.project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        campaign.project.client.name.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesStatus = statusFilter === 'all' || campaign.status.toUpperCase() === statusFilter

      return matchesSearch && matchesStatus
    }),
    [campaigns, searchQuery, statusFilter]
  )

  const statusCounts = useMemo(() =>
    campaigns.reduce((acc, c) => {
      const status = c.status.toUpperCase()
      acc[status] = (acc[status] || 0) + 1
      return acc
    }, {} as Record<string, number>),
    [campaigns]
  )

  const columns = [
    { label: 'Campaign', className: 'w-[260px]' },
    { label: 'Project' },
    { label: 'Client' },
    { label: 'Status' },
    { label: 'Type' },
    { label: 'Deliverables', className: 'text-center' },
    { label: '', className: 'w-[50px]' },
  ]

  return (
    <ListPageShell
      title="Campaigns"
      subtitle="Manage influencer campaigns"
      searchPlaceholder="Search campaigns..."
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      addButton={{ label: 'New Campaign', href: '/dashboard/campaigns/new' }}
      loading={loading}
      error={error}
      columns={columns}
      emptyState={{
        icon: Megaphone,
        title: 'No campaigns yet',
        description: 'Campaigns are the core of your influencer work. Create a project first, then launch campaigns within it.',
        addLabel: 'View Projects',
        addHref: '/dashboard/projects',
      }}
      itemCount={campaigns.length}
      filteredCount={filteredCampaigns.length}
      filterBar={
        campaigns.length > 0 ? (
          <Tabs value={statusFilter} onValueChange={setStatusFilter}>
            <TabsList>
              <TabsTrigger value="all">All ({campaigns.length})</TabsTrigger>
              {['DRAFT', 'ACTIVE', 'IN_REVIEW', 'APPROVED', 'COMPLETED'].map((status) => (
                <TabsTrigger key={status} value={status}>
                  {getCampaignStatusLabel(status)} ({statusCounts[status] || 0})
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        ) : undefined
      }
    >
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[260px]">Campaign</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-center">Deliverables</TableHead>
              <TableHead className="w-[50px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCampaigns.map((campaign) => (
              <TableRow
                key={campaign.id}
                className="cursor-pointer"
                onClick={() => window.location.href = `/dashboard/campaigns/${campaign.id}`}
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                      <Megaphone className="h-4 w-4 text-green-600" />
                    </div>
                    <span className="font-medium truncate">{campaign.name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm">{campaign.project.name}</span>
                </TableCell>
                <TableCell>
                  <span className="text-sm">{campaign.project.client.name}</span>
                </TableCell>
                <TableCell>
                  <StatusBadge status={campaign.status} type="campaign" />
                </TableCell>
                <TableCell>
                  <span className="text-sm capitalize">{campaign.campaignType}</span>
                </TableCell>
                <TableCell className="text-center">
                  <span className="text-sm">{campaign.deliverables.length}</span>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/dashboard/campaigns/${campaign.id}`}>View Details</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem>Edit</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">Archive</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </ListPageShell>
  )
}

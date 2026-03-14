"use client"

import { useState, useEffect, useCallback } from 'react'
import { FileCheck, Search } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Header } from '@/components/layout/header'
import { StatusBadge } from '@/components/ui/status-badge'
import { useAuth } from '@/contexts/auth-context'
import { graphqlRequest, queries } from '@/lib/graphql/client'
import { getDeliverableStatusLabel } from '@/lib/campaign-status'

interface Deliverable {
  id: string
  title: string
  description: string | null
  deliverableType: string
  status: string
  dueDate: string | null
  createdAt: string
  versions: { id: string }[]
}

interface Campaign {
  id: string
  name: string
  deliverables: Deliverable[]
  project: {
    id: string
    name: string
    client: {
      id: string
      name: string
    }
  }
}

interface Project {
  id: string
  campaigns: Campaign[]
}

interface Client {
  id: string
  name: string
}

interface DeliverableWithCampaign extends Deliverable {
  campaign: {
    id: string
    name: string
    clientName: string
  }
}

const STATUS_KEYS = ['PENDING', 'SUBMITTED', 'INTERNAL_REVIEW', 'PENDING_PROJECT_APPROVAL', 'CLIENT_REVIEW', 'APPROVED', 'REJECTED']

export default function DeliverablesPage() {
  const { currentAgency } = useAuth()
  const [deliverables, setDeliverables] = useState<DeliverableWithCampaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const fetchDeliverables = useCallback(async () => {
    if (!currentAgency?.id) return

    setLoading(true)
    setError(null)

    try {
      const clientsData = await graphqlRequest<{ clients: Client[] }>(
        queries.clients,
        { agencyId: currentAgency.id }
      )

      const allDeliverables: DeliverableWithCampaign[] = []

      for (const client of clientsData.clients) {
        try {
          const projectsData = await graphqlRequest<{ projects: Project[] }>(
            queries.projects,
            { clientId: client.id }
          )

          for (const project of projectsData.projects) {
            for (const campaign of project.campaigns || []) {
              for (const deliverable of campaign.deliverables || []) {
                allDeliverables.push({
                  ...deliverable,
                  campaign: {
                    id: campaign.id,
                    name: campaign.name,
                    clientName: client.name,
                  },
                })
              }
            }
          }
        } catch (err) {
          console.error(`Failed to fetch projects for client ${client.id}:`, err)
        }
      }

      allDeliverables.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )

      setDeliverables(allDeliverables)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load deliverables')
    } finally {
      setLoading(false)
    }
  }, [currentAgency?.id])

  useEffect(() => {
    fetchDeliverables()
  }, [fetchDeliverables])

  const filteredDeliverables = deliverables.filter((d) => {
    const matchesSearch =
      d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.campaign.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.campaign.clientName.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = statusFilter === 'all' || d.status === statusFilter.toUpperCase()

    return matchesSearch && matchesStatus
  })

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  }

  const statusCounts = deliverables.reduce((acc, d) => {
    acc[d.status] = (acc[d.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <>
      <Header title="Deliverables" subtitle="Track and approve content deliverables" />

      <div className="p-6 space-y-6">
        {/* Status Filter Tabs */}
        {deliverables.length > 0 && (
          <Tabs value={statusFilter} onValueChange={setStatusFilter}>
            <TabsList>
              <TabsTrigger value="all">All ({deliverables.length})</TabsTrigger>
              {STATUS_KEYS.map((status) => (
                <TabsTrigger key={status} value={status}>
                  {getDeliverableStatusLabel(status)} ({statusCounts[status] || 0})
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        )}

        {/* Search */}
        <div className="flex gap-3 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search deliverables..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Error State */}
        {error && (
          <Card className="border-destructive bg-destructive/10">
            <CardContent className="p-4 text-destructive">{error}</CardContent>
          </Card>
        )}

        {/* Loading State */}
        {loading && (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[260px]">Deliverable</TableHead>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-center">Version</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[1, 2, 3, 4, 5].map((i) => (
                  <TableRow key={i} className="animate-pulse">
                    <TableCell><div className="h-5 w-40 bg-muted rounded" /></TableCell>
                    <TableCell><div className="h-5 w-28 bg-muted rounded" /></TableCell>
                    <TableCell><div className="h-5 w-24 bg-muted rounded" /></TableCell>
                    <TableCell><div className="h-5 w-20 bg-muted rounded" /></TableCell>
                    <TableCell><div className="h-5 w-16 bg-muted rounded" /></TableCell>
                    <TableCell className="text-center"><div className="h-5 w-8 bg-muted rounded mx-auto" /></TableCell>
                    <TableCell><div className="h-5 w-24 bg-muted rounded-full" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && deliverables.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <FileCheck className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold">No deliverables yet</h3>
              <p className="text-muted-foreground text-center mt-2 max-w-sm">
                Deliverables are created within campaigns. Create a campaign first,
                then add deliverables to track content.
              </p>
              <Button className="mt-6" asChild>
                <Link href="/dashboard/campaigns">Go to Campaigns</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Deliverables Table */}
        {!loading && !error && filteredDeliverables.length > 0 && (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[260px]">Deliverable</TableHead>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-center">Version</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDeliverables.map((deliverable) => (
                  <TableRow
                    key={deliverable.id}
                    className="cursor-pointer"
                    onClick={() => window.location.href = `/dashboard/deliverables/${deliverable.id}`}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                          <FileCheck className="h-4 w-4 text-blue-600" />
                        </div>
                        <span className="font-medium truncate">{deliverable.title}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{deliverable.campaign.name}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{deliverable.campaign.clientName}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm capitalize">{deliverable.deliverableType.replace(/_/g, ' ')}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">{formatDate(deliverable.dueDate)}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-sm">v{deliverable.versions.length || 0}</span>
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        status={deliverable.status === 'PENDING' && deliverable.versions.length > 0 ? 'RECEIVED' : deliverable.status}
                        type="deliverable"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* No Results */}
        {!loading && !error && deliverables.length > 0 && filteredDeliverables.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Search className="h-8 w-8 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">No results found</h3>
              <p className="text-muted-foreground text-center mt-2">
                No deliverables match your search
              </p>
              <Button variant="outline" className="mt-4" onClick={() => { setSearchQuery(''); setStatusFilter('all'); }}>
                Clear filters
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  )
}

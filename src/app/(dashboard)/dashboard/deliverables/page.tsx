"use client"

import { useState, useEffect, useCallback } from 'react'
import { FileCheck, Search, Clock, CheckCircle, XCircle, Send } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Header } from '@/components/layout/header'
import { useAuth } from '@/contexts/auth-context'
import { graphqlRequest, queries } from '@/lib/graphql/client'

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

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: 'Pending', color: 'bg-gray-100 text-gray-700', icon: <Clock className="h-3 w-3" /> },
  submitted: { label: 'Submitted', color: 'bg-blue-100 text-blue-700', icon: <Send className="h-3 w-3" /> },
  internal_review: { label: 'Internal Review', color: 'bg-yellow-100 text-yellow-700', icon: <Clock className="h-3 w-3" /> },
  client_review: { label: 'Client Review', color: 'bg-orange-100 text-orange-700', icon: <Clock className="h-3 w-3" /> },
  approved: { label: 'Approved', color: 'bg-green-100 text-green-700', icon: <CheckCircle className="h-3 w-3" /> },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700', icon: <XCircle className="h-3 w-3" /> },
}

interface DeliverableWithCampaign extends Deliverable {
  campaign: {
    id: string
    name: string
    clientName: string
  }
}

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
      // Get all clients
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
      
      // Sort by created date
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
    
    const matchesStatus = statusFilter === 'all' || d.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null
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
        <div className="flex gap-2 overflow-x-auto pb-2">
          <Button
            variant={statusFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('all')}
          >
            All ({deliverables.length})
          </Button>
          {['pending', 'submitted', 'internal_review', 'client_review', 'approved', 'rejected'].map((status) => {
            const config = STATUS_CONFIG[status]
            return (
              <Button
                key={status}
                variant={statusFilter === status ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter(status)}
              >
                {config.label} ({statusCounts[status] || 0})
              </Button>
            )
          })}
        </div>

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
            <CardContent className="p-4 text-destructive">
              {error}
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded bg-muted" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-48 bg-muted rounded" />
                      <div className="h-3 w-32 bg-muted rounded" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && deliverables.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <FileCheck className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">No deliverables yet</h3>
              <p className="text-muted-foreground text-center mt-2 max-w-sm">
                Deliverables are created within campaigns. Create a campaign first, 
                then add deliverables to track content.
              </p>
              <Button className="mt-6" asChild>
                <Link href="/dashboard/campaigns">
                  Go to Campaigns
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Deliverables List */}
        {!loading && !error && filteredDeliverables.length > 0 && (
          <div className="space-y-3">
            {filteredDeliverables.map((deliverable) => {
              const statusConfig = STATUS_CONFIG[deliverable.status] || STATUS_CONFIG.pending
              return (
                <Link key={deliverable.id} href={`/dashboard/deliverables/${deliverable.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                            <FileCheck className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="font-medium">{deliverable.title}</h3>
                            <p className="text-sm text-muted-foreground">
                              {deliverable.campaign.clientName} • {deliverable.campaign.name}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right hidden sm:block">
                            <p className="text-sm capitalize">
                              {deliverable.deliverableType.replace(/_/g, ' ')}
                            </p>
                            {deliverable.dueDate && (
                              <p className="text-xs text-muted-foreground">
                                Due: {formatDate(deliverable.dueDate)}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              v{deliverable.versions.length || 0}
                            </span>
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}>
                              {statusConfig.icon}
                              {statusConfig.label}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
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

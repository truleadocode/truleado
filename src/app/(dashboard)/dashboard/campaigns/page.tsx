"use client"

import { useState, useEffect, useCallback } from 'react'
import { Plus, Megaphone, Search, Filter, MoreHorizontal, Building2, Briefcase, FileCheck, Users } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Header } from '@/components/layout/header'
import { useAuth } from '@/contexts/auth-context'
import { graphqlRequest, queries } from '@/lib/graphql/client'
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

interface Project {
  id: string
  name: string
  client: { id: string; name: string }
  campaigns: Campaign[]
}

interface Client {
  id: string
  name: string
}

export default function CampaignsPage() {
  const { currentAgency } = useAuth()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const fetchCampaigns = useCallback(async () => {
    if (!currentAgency?.id) return
    
    setLoading(true)
    setError(null)
    
    try {
      // First get all clients
      const clientsData = await graphqlRequest<{ clients: Client[] }>(
        queries.clients,
        { agencyId: currentAgency.id }
      )
      
      // Then fetch projects for each client
      const allCampaigns: Campaign[] = []
      for (const client of clientsData.clients) {
        try {
          const projectsData = await graphqlRequest<{ projects: Project[] }>(
            queries.projects,
            { clientId: client.id }
          )
          
          // Fetch campaigns for each project
          for (const project of projectsData.projects) {
            try {
              const campaignsData = await graphqlRequest<{ campaigns: Campaign[] }>(
                queries.campaigns,
                { projectId: project.id }
              )
              allCampaigns.push(...campaignsData.campaigns)
            } catch (err) {
              console.error(`Failed to fetch campaigns for project ${project.id}:`, err)
            }
          }
        } catch (err) {
          console.error(`Failed to fetch projects for client ${client.id}:`, err)
        }
      }
      
      setCampaigns(allCampaigns)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load campaigns')
    } finally {
      setLoading(false)
    }
  }, [currentAgency?.id])

  useEffect(() => {
    fetchCampaigns()
  }, [fetchCampaigns])

  const filteredCampaigns = campaigns.filter((campaign) => {
    const matchesSearch = 
      campaign.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      campaign.project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      campaign.project.client.name.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || campaign.status.toUpperCase() === statusFilter
    
    return matchesSearch && matchesStatus
  })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      DRAFT: 'bg-gray-100 text-gray-700',
      ACTIVE: 'bg-green-100 text-green-700',
      IN_REVIEW: 'bg-yellow-100 text-yellow-700',
      APPROVED: 'bg-blue-100 text-blue-700',
      COMPLETED: 'bg-purple-100 text-purple-700',
      ARCHIVED: 'bg-gray-100 text-gray-500',
    }
    return colors[status.toUpperCase()] || 'bg-gray-100 text-gray-700'
  }

  const statusCounts = campaigns.reduce((acc, c) => {
    const status = c.status.toUpperCase()
    acc[status] = (acc[status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <>
      <Header title="Campaigns" subtitle="Manage influencer campaigns" />
      
      <div className="p-6 space-y-6">
        {/* Status Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          <Button
            variant={statusFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('all')}
          >
            All ({campaigns.length})
          </Button>
          {['DRAFT', 'ACTIVE', 'IN_REVIEW', 'APPROVED', 'COMPLETED'].map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(status)}
            >
              {getCampaignStatusLabel(status)} ({statusCounts[status] || 0})
            </Button>
          ))}
        </div>

        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex gap-3 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search campaigns..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <Button asChild>
            <Link href="/dashboard/campaigns/new">
              <Plus className="mr-2 h-4 w-4" />
              New Campaign
            </Link>
          </Button>
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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-lg bg-muted" />
                    <div className="flex-1 space-y-2">
                      <div className="h-5 w-32 bg-muted rounded" />
                      <div className="h-4 w-24 bg-muted rounded" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && campaigns.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Megaphone className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold">No campaigns yet</h3>
              <p className="text-muted-foreground text-center mt-2 max-w-sm">
                Campaigns are the core of your influencer work. Create a project first, 
                then launch campaigns within it.
              </p>
              <Button className="mt-6" asChild>
                <Link href="/dashboard/projects">
                  View Projects
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* No Search Results */}
        {!loading && !error && campaigns.length > 0 && filteredCampaigns.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Search className="h-8 w-8 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">No results found</h3>
              <p className="text-muted-foreground text-center mt-2">
                No campaigns match your search
              </p>
              <Button variant="outline" className="mt-4" onClick={() => { setSearchQuery(''); setStatusFilter('all'); }}>
                Clear filters
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Campaigns Grid */}
        {!loading && !error && filteredCampaigns.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredCampaigns.map((campaign) => (
              <Link key={campaign.id} href={`/dashboard/campaigns/${campaign.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                          <Megaphone className="h-6 w-6 text-green-600" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold truncate">{campaign.name}</h3>
                          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                            <Briefcase className="h-3 w-3" />
                            {campaign.project.name}
                          </p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {campaign.project.client.name}
                          </p>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>View Details</DropdownMenuItem>
                          <DropdownMenuItem>Edit</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">
                            Archive
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(campaign.status)}`}>
                        {getCampaignStatusLabel(campaign.status)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {campaign.campaignType === 'influencer' ? 'Influencer' : 'Social'}
                      </span>
                    </div>

                    <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <FileCheck className="h-4 w-4" />
                        <span>{campaign.deliverables.length} deliverables</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>{campaign.creators.length} creators</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  FileCheck,
  ChevronRight,
  Inbox,
  Clock,
  CheckCircle,
  AlertCircle,
  Briefcase,
  DollarSign,
  TrendingUp,
  FileText
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/contexts/auth-context'
import { graphqlRequest, queries } from '@/lib/graphql/client'
import { formatCurrency } from '@/lib/currency'

interface CampaignCreator {
  id: string
  status: string
  rateAmount: number | null
  rateCurrency: string | null
  notes: string | null
  proposalState: string | null
  proposalAcceptedAt: string | null
  createdAt: string
  campaign: {
    id: string
    name: string
    description: string | null
    status: string
    startDate: string | null
    endDate: string | null
    project: {
      id: string
      name: string
      client: { id: string; name: string }
    }
  }
  currentProposal: {
    id: string
    versionNumber: number
    state: string
    rateAmount: number | null
    rateCurrency: string | null
    notes: string | null
    createdAt: string
  } | null
}

interface Deliverable {
  id: string
  title: string
  description: string | null
  deliverableType: string
  status: string
  dueDate: string | null
  createdAt: string
  campaign: {
    id: string
    name: string
    project: {
      id: string
      name: string
      client: { id: string; name: string }
    }
  }
  versions: Array<{
    id: string
    versionNumber: number
    fileUrl: string
    fileName: string
    createdAt: string
  }>
  trackingRecord: {
    id: string
    urls: Array<{ id: string; url: string }>
  } | null
}

interface CreatorProfile {
  id: string
  displayName: string
  email: string
}

export default function CreatorDashboardPage() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<CreatorProfile | null>(null)
  const [campaigns, setCampaigns] = useState<CampaignCreator[]>([])
  const [deliverables, setDeliverables] = useState<Deliverable[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const [profileData, campaignsData, deliverablesData] = await Promise.all([
        graphqlRequest<{ myCreatorProfile: CreatorProfile }>(queries.myCreatorProfile),
        graphqlRequest<{ myCreatorCampaigns: CampaignCreator[] }>(queries.myCreatorCampaigns),
        graphqlRequest<{ myCreatorDeliverables: Deliverable[] }>(queries.myCreatorDeliverables),
      ])

      setProfile(profileData.myCreatorProfile)
      setCampaigns(campaignsData.myCreatorCampaigns ?? [])
      setDeliverables(deliverablesData.myCreatorDeliverables ?? [])
    } catch (err) {
      console.error('Failed to load creator data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user) {
      fetchData()
    }
  }, [user, fetchData])

  // Filter campaigns with pending proposals (state: SENT or COUNTERED)
  const pendingProposals = campaigns.filter(
    (c) => c.currentProposal?.state === 'SENT' || c.currentProposal?.state === 'COUNTERED'
  )

  // Filter active campaigns (accepted status)
  const activeCampaigns = campaigns.filter(
    (c) => c.status === 'accepted' || c.proposalState === 'ACCEPTED'
  )

  // Filter deliverables that need attention (draft, revision_requested)
  const deliverablesNeedingAttention = deliverables.filter(
    (d) => d.status === 'draft' || d.status === 'revision_requested'
  )

  // Filter approved deliverables without tracking URLs
  const deliverablesNeedingTracking = deliverables.filter(
    (d) => d.status === 'approved' && (!d.trackingRecord || d.trackingRecord.urls.length === 0)
  )

  // Calculate total earnings (from accepted proposals)
  const totalEarnings = campaigns.reduce((sum, c) => {
    if (c.proposalState === 'ACCEPTED' && c.currentProposal?.rateAmount) {
      return sum + c.currentProposal.rateAmount
    }
    return sum
  }, 0)

  const formatCreatorCurrency = (amount: number | null, currency: string | null) => {
    if (!amount) return null
    return formatCurrency(amount, currency || 'INR')
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      draft: 'secondary',
      pending_internal: 'outline',
      pending_client: 'outline',
      revision_requested: 'destructive',
      approved: 'default',
    }
    const labels: Record<string, string> = {
      draft: 'Draft',
      pending_internal: 'In Review',
      pending_client: 'Client Review',
      revision_requested: 'Revision Needed',
      approved: 'Approved',
    }
    return (
      <Badge variant={variants[status] || 'secondary'}>
        {labels[status] || status}
      </Badge>
    )
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1">
          Welcome back{profile?.displayName ? `, ${profile.displayName}` : ''}
        </h1>
        <p className="text-muted-foreground">
          Here&apos;s an overview of your creator activity
        </p>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Loading...
          </CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="py-8 text-center text-destructive">
            {error}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Campaigns</CardTitle>
                <Briefcase className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{campaigns.length}</div>
                <p className="text-xs text-muted-foreground">
                  All time
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activeCampaigns.length}</div>
                <p className="text-xs text-muted-foreground">
                  Currently working on
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Proposals</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pendingProposals.length}</div>
                <p className="text-xs text-muted-foreground">
                  Awaiting response
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCreatorCurrency(totalEarnings, 'INR') || '₹0'}
                </div>
                <p className="text-xs text-muted-foreground">
                  From accepted proposals
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Pending Proposals Section */}
          {pendingProposals.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-500" />
                <h2 className="text-lg font-semibold">Proposals Awaiting Response</h2>
              </div>
              <ul className="space-y-3">
                {pendingProposals.map((c) => (
                  <li key={c.id}>
                    <Link href={`/creator/proposals/${c.id}`}>
                      <Card className="hover:bg-muted/50 transition-colors cursor-pointer border-orange-200">
                        <CardContent className="py-4 flex items-center justify-between">
                          <div>
                            <p className="font-medium">{c.campaign.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {c.campaign.project.client.name} · {c.campaign.project.name}
                            </p>
                            {c.currentProposal?.rateAmount && (
                              <p className="text-sm font-medium text-green-600 mt-1">
                                {formatCreatorCurrency(c.currentProposal.rateAmount, c.currentProposal.rateCurrency)}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="border-orange-300 text-orange-600">
                              {c.currentProposal?.state === 'COUNTERED' ? 'Counter Received' : 'Review Proposal'}
                            </Badge>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Deliverables Needing Attention */}
          {deliverablesNeedingAttention.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-500" />
                <h2 className="text-lg font-semibold">Deliverables Needing Attention</h2>
              </div>
              <ul className="space-y-3">
                {deliverablesNeedingAttention.map((d) => (
                  <li key={d.id}>
                    <Link href={`/creator/deliverables/${d.id}`}>
                      <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                        <CardContent className="py-4 flex items-center justify-between">
                          <div>
                            <p className="font-medium">{d.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {d.campaign.project.client.name} · {d.campaign.name}
                            </p>
                            {d.dueDate && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Due: {new Date(d.dueDate).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {getStatusBadge(d.status)}
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Deliverables Needing Tracking URLs */}
          {deliverablesNeedingTracking.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <h2 className="text-lg font-semibold">Add Tracking URLs</h2>
              </div>
              <ul className="space-y-3">
                {deliverablesNeedingTracking.map((d) => (
                  <li key={d.id}>
                    <Link href={`/creator/deliverables/${d.id}`}>
                      <Card className="hover:bg-muted/50 transition-colors cursor-pointer border-green-200">
                        <CardContent className="py-4 flex items-center justify-between">
                          <div>
                            <p className="font-medium">{d.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {d.campaign.project.client.name} · {d.campaign.name}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="border-green-300 text-green-600">
                              Add Tracking
                            </Badge>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Active Campaigns */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                <h2 className="text-lg font-semibold">Active Campaigns</h2>
              </div>
              <Link href="/creator/campaigns">
                <Button variant="ghost" size="sm">
                  View All
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
            {activeCampaigns.length === 0 ? (
              <Card>
                <CardContent className="py-12 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                  <Inbox className="h-12 w-12" />
                  <p>No active campaigns yet.</p>
                  {pendingProposals.length > 0 && (
                    <p className="text-sm">Review your pending proposals above to get started.</p>
                  )}
                </CardContent>
              </Card>
            ) : (
              <ul className="space-y-3">
                {activeCampaigns.slice(0, 5).map((c) => (
                  <li key={c.id}>
                    <Link href={`/creator/campaigns/${c.campaign.id}`}>
                      <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                        <CardContent className="py-4 flex items-center justify-between">
                          <div>
                            <p className="font-medium">{c.campaign.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {c.campaign.project.client.name} · {c.campaign.project.name}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">{c.campaign.status}</Badge>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Recent Deliverables */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCheck className="h-5 w-5" />
                <h2 className="text-lg font-semibold">Recent Deliverables</h2>
              </div>
              <Link href="/creator/deliverables">
                <Button variant="ghost" size="sm">
                  View All
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
            {deliverables.length === 0 ? (
              <Card>
                <CardContent className="py-12 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                  <Inbox className="h-12 w-12" />
                  <p>No deliverables assigned yet.</p>
                </CardContent>
              </Card>
            ) : (
              <ul className="space-y-3">
                {deliverables.slice(0, 5).map((d) => (
                  <li key={d.id}>
                    <Link href={`/creator/deliverables/${d.id}`}>
                      <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                        <CardContent className="py-4 flex items-center justify-between">
                          <div>
                            <p className="font-medium">{d.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {d.campaign.project.client.name} · {d.campaign.name}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {getStatusBadge(d.status)}
                            <Badge variant="outline">{d.deliverableType}</Badge>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

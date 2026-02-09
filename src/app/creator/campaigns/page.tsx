'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight, Inbox, Calendar, Briefcase } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/contexts/auth-context'
import { graphqlRequest, queries } from '@/lib/graphql/client'

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

export default function CreatorCampaignsPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [campaigns, setCampaigns] = useState<CampaignCreator[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCampaigns = useCallback(async () => {
    try {
      const data = await graphqlRequest<{ myCreatorCampaigns: CampaignCreator[] }>(
        queries.myCreatorCampaigns
      )
      setCampaigns(data.myCreatorCampaigns ?? [])
    } catch (err) {
      console.error('Failed to load campaigns:', err)
      setError(err instanceof Error ? err.message : 'Failed to load campaigns')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.replace('/creator/login')
      return
    }
    fetchCampaigns()
  }, [authLoading, user, router, fetchCampaigns])

  if (authLoading || !user) {
    return null
  }

  const getStatusBadge = (status: string, proposalState: string | null) => {
    if (proposalState === 'SENT') {
      return <Badge variant="outline" className="border-orange-300 text-orange-600">Proposal Pending</Badge>
    }
    if (proposalState === 'COUNTERED') {
      return <Badge variant="outline" className="border-blue-300 text-blue-600">Counter Sent</Badge>
    }
    if (proposalState === 'REJECTED') {
      return <Badge variant="destructive">Declined</Badge>
    }
    if (status === 'accepted' || proposalState === 'ACCEPTED') {
      return <Badge variant="default">Active</Badge>
    }
    if (status === 'invited') {
      return <Badge variant="secondary">Invited</Badge>
    }
    return <Badge variant="secondary">{status}</Badge>
  }

  const formatDate = (date: string | null) => {
    if (!date) return null
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  // Group campaigns by status
  const pendingCampaigns = campaigns.filter(
    (c) => c.currentProposal?.state === 'SENT'
  )
  const activeCampaigns = campaigns.filter(
    (c) => c.status === 'accepted' || c.proposalState === 'ACCEPTED'
  )
  const otherCampaigns = campaigns.filter(
    (c) =>
      c.currentProposal?.state !== 'SENT' &&
      c.status !== 'accepted' &&
      c.proposalState !== 'ACCEPTED'
  )

  return (
    <div className="flex-1 container max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1">My Campaigns</h1>
        <p className="text-muted-foreground">
          View and manage your campaign assignments
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
      ) : campaigns.length === 0 ? (
        <Card>
          <CardContent className="py-12 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Inbox className="h-12 w-12" />
            <p>No campaigns yet.</p>
            <p className="text-sm">You'll see campaigns here when agencies invite you.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Pending Proposals */}
          {pendingCampaigns.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-orange-600">Proposals Awaiting Response</h2>
              <ul className="space-y-3">
                {pendingCampaigns.map((c) => (
                  <li key={c.id}>
                    <Link href={`/creator/proposals/${c.id}`}>
                      <Card className="hover:bg-muted/50 transition-colors cursor-pointer border-orange-200">
                        <CardContent className="py-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Briefcase className="h-4 w-4 text-muted-foreground" />
                                <p className="font-medium">{c.campaign.name}</p>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {c.campaign.project.client.name} · {c.campaign.project.name}
                              </p>
                              {(c.campaign.startDate || c.campaign.endDate) && (
                                <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                                  <Calendar className="h-3 w-3" />
                                  {formatDate(c.campaign.startDate)} – {formatDate(c.campaign.endDate)}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {getStatusBadge(c.status, c.proposalState)}
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </div>
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
          {activeCampaigns.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Active Campaigns</h2>
              <ul className="space-y-3">
                {activeCampaigns.map((c) => (
                  <li key={c.id}>
                    <Link href={`/creator/campaigns/${c.campaign.id}`}>
                      <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                        <CardContent className="py-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Briefcase className="h-4 w-4 text-muted-foreground" />
                                <p className="font-medium">{c.campaign.name}</p>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {c.campaign.project.client.name} · {c.campaign.project.name}
                              </p>
                              {(c.campaign.startDate || c.campaign.endDate) && (
                                <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                                  <Calendar className="h-3 w-3" />
                                  {formatDate(c.campaign.startDate)} – {formatDate(c.campaign.endDate)}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {getStatusBadge(c.status, c.proposalState)}
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Other Campaigns */}
          {otherCampaigns.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-muted-foreground">Other</h2>
              <ul className="space-y-3">
                {otherCampaigns.map((c) => (
                  <li key={c.id}>
                    <Link href={`/creator/campaigns/${c.campaign.id}`}>
                      <Card className="hover:bg-muted/50 transition-colors cursor-pointer opacity-75">
                        <CardContent className="py-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Briefcase className="h-4 w-4 text-muted-foreground" />
                                <p className="font-medium">{c.campaign.name}</p>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {c.campaign.project.client.name} · {c.campaign.project.name}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {getStatusBadge(c.status, c.proposalState)}
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

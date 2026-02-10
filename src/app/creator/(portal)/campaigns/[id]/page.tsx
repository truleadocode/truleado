'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight, ChevronLeft, Inbox, Calendar, FileCheck, Briefcase, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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

export default function CreatorCampaignDetailPage() {
  const router = useRouter()
  const params = useParams()
  const campaignId = params.id as string
  const { user, loading: authLoading } = useAuth()
  const [campaign, setCampaign] = useState<CampaignCreator | null>(null)
  const [deliverables, setDeliverables] = useState<Deliverable[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const [campaignsData, deliverablesData] = await Promise.all([
        graphqlRequest<{ myCreatorCampaigns: CampaignCreator[] }>(queries.myCreatorCampaigns),
        graphqlRequest<{ myCreatorDeliverables: Deliverable[] }>(
          queries.myCreatorDeliverables,
          { campaignId }
        ),
      ])

      // Find the campaign by campaign.id
      const foundCampaign = campaignsData.myCreatorCampaigns?.find(
        (c) => c.campaign.id === campaignId
      )

      if (!foundCampaign) {
        setError('Campaign not found or you do not have access')
        setLoading(false)
        return
      }

      setCampaign(foundCampaign)
      setDeliverables(deliverablesData.myCreatorDeliverables ?? [])
    } catch (err) {
      console.error('Failed to load campaign:', err)
      setError(err instanceof Error ? err.message : 'Failed to load campaign')
    } finally {
      setLoading(false)
    }
  }, [campaignId])

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.replace('/creator/login')
      return
    }
    fetchData()
  }, [authLoading, user, router, fetchData])

  if (authLoading || !user) {
    return null
  }

  const formatDate = (date: string | null) => {
    if (!date) return null
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
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
    <div className="flex-1 container max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href="/creator/campaigns">
          <Button variant="ghost" size="sm" className="gap-1 -ml-2 mb-4">
            <ChevronLeft className="h-4 w-4" />
            Back to Campaigns
          </Button>
        </Link>
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
      ) : campaign ? (
        <div className="space-y-8">
          {/* Campaign Header */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Briefcase className="h-5 w-5 text-muted-foreground" />
                    <CardTitle>{campaign.campaign.name}</CardTitle>
                  </div>
                  <CardDescription>
                    {campaign.campaign.project.client.name} · {campaign.campaign.project.name}
                  </CardDescription>
                </div>
                <Badge variant="secondary">{campaign.campaign.status}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {campaign.campaign.description && (
                <p className="text-sm text-muted-foreground mb-4">
                  {campaign.campaign.description}
                </p>
              )}
              <div className="flex flex-wrap gap-4 text-sm">
                {(campaign.campaign.startDate || campaign.campaign.endDate) && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {formatDate(campaign.campaign.startDate)} – {formatDate(campaign.campaign.endDate)}
                    </span>
                  </div>
                )}
                {campaign.proposalAcceptedAt && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Info className="h-4 w-4" />
                    <span>Accepted: {formatDate(campaign.proposalAcceptedAt)}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Deliverables Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <FileCheck className="h-5 w-5" />
              <h2 className="text-lg font-semibold">Your Deliverables</h2>
            </div>

            {deliverables.length === 0 ? (
              <Card>
                <CardContent className="py-12 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                  <Inbox className="h-12 w-12" />
                  <p>No deliverables assigned yet.</p>
                  <p className="text-sm">Deliverables will appear here once they're assigned to you.</p>
                </CardContent>
              </Card>
            ) : (
              <ul className="space-y-3">
                {deliverables.map((d) => (
                  <li key={d.id}>
                    <Link href={`/creator/deliverables/${d.id}`}>
                      <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                        <CardContent className="py-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="font-medium">{d.title}</p>
                              {d.description && (
                                <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                                  {d.description}
                                </p>
                              )}
                              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                {d.dueDate && (
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    Due: {formatDate(d.dueDate)}
                                  </span>
                                )}
                                <span>
                                  {d.versions.length} version{d.versions.length !== 1 ? 's' : ''}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {getStatusBadge(d.status)}
                              <Badge variant="outline">{d.deliverableType}</Badge>
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </div>
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
      ) : null}
    </div>
  )
}

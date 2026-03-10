'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { ChevronRight, Inbox, FileText, Clock, CheckCircle, XCircle, MessageSquare } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/contexts/auth-context'
import { graphqlRequest, queries } from '@/lib/graphql/client'
import { formatSmallestUnit } from '@/lib/currency'

interface CampaignCreator {
  id: string
  status: string
  proposalState: string | null
  createdAt: string
  campaign: {
    id: string
    name: string
    description: string | null
    status: string
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
    createdByType: string | null
    createdAt: string
  } | null
}

export default function ProposalsPage() {
  const { user } = useAuth()
  const [campaigns, setCampaigns] = useState<CampaignCreator[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const data = await graphqlRequest<{ myCreatorCampaigns: CampaignCreator[] }>(
        queries.myCreatorCampaigns
      )
      setCampaigns(data.myCreatorCampaigns ?? [])
    } catch (err) {
      console.error('Failed to load proposals:', err)
      setError(err instanceof Error ? err.message : 'Failed to load proposals')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user) {
      fetchData()
    }
  }, [user, fetchData])

  const formatCreatorCurrency = (amount: number | null, currency: string | null) => {
    if (!amount) return null
    return formatSmallestUnit(amount, currency || 'INR')
  }

  const getProposalStateBadge = (state: string | null, createdByType: string | null) => {
    if (!state) return null

    const config: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      SENT: { variant: 'outline', label: 'Pending Review' },
      ACCEPTED: { variant: 'default', label: 'Accepted' },
      REJECTED: { variant: 'destructive', label: 'Rejected' },
      COUNTERED: {
        variant: 'secondary',
        label: createdByType === 'creator' ? 'You Countered' : 'Agency Countered'
      },
    }

    const { variant, label } = config[state] || { variant: 'outline' as const, label: state }
    return <Badge variant={variant}>{label}</Badge>
  }

  // Group campaigns by proposal state
  const pendingProposals = campaigns.filter(
    (c) => c.currentProposal?.state === 'SENT' ||
           (c.currentProposal?.state === 'COUNTERED' && c.currentProposal?.createdByType === 'agency')
  )
  const counteringProposals = campaigns.filter(
    (c) => c.currentProposal?.state === 'COUNTERED' && c.currentProposal?.createdByType === 'creator'
  )
  const acceptedProposals = campaigns.filter(
    (c) => c.currentProposal?.state === 'ACCEPTED' || c.proposalState === 'ACCEPTED'
  )
  const rejectedProposals = campaigns.filter(
    (c) => c.currentProposal?.state === 'REJECTED'
  )

  const ProposalCard = ({ campaign }: { campaign: CampaignCreator }) => (
    <Link href={`/creator/proposals/${campaign.id}`}>
      <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
        <CardContent className="py-4 flex items-center justify-between">
          <div className="space-y-1">
            <p className="font-medium">{campaign.campaign.name}</p>
            <p className="text-sm text-muted-foreground">
              {campaign.campaign.project.client.name} · {campaign.campaign.project.name}
            </p>
            {campaign.currentProposal?.rateAmount && (
              <p className="text-sm font-medium text-green-600">
                {formatCreatorCurrency(campaign.currentProposal.rateAmount, campaign.currentProposal.rateCurrency)}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {getProposalStateBadge(campaign.currentProposal?.state ?? null, campaign.currentProposal?.createdByType ?? null)}
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    </Link>
  )

  const EmptyState = ({ message, icon: Icon }: { message: string; icon: typeof FileText }) => (
    <Card>
      <CardContent className="py-12 flex flex-col items-center justify-center gap-3 text-muted-foreground">
        <Icon className="h-12 w-12" />
        <p>{message}</p>
      </CardContent>
    </Card>
  )

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Loading...
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 lg:p-8">
        <Card>
          <CardContent className="py-8 text-center text-destructive">
            {error}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1">Proposals</h1>
        <p className="text-muted-foreground">
          View and manage your campaign proposals
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-500" />
              <span className="text-2xl font-bold">{pendingProposals.length}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Countering</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-500" />
              <span className="text-2xl font-bold">{counteringProposals.length}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Accepted</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-2xl font-bold">{acceptedProposals.length}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Rejected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              <span className="text-2xl font-bold">{rejectedProposals.length}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending" className="gap-2">
            Pending
            {pendingProposals.length > 0 && (
              <Badge variant="secondary" className="ml-1">{pendingProposals.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="countering" className="gap-2">
            Countering
            {counteringProposals.length > 0 && (
              <Badge variant="secondary" className="ml-1">{counteringProposals.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="accepted" className="gap-2">
            Accepted
            {acceptedProposals.length > 0 && (
              <Badge variant="secondary" className="ml-1">{acceptedProposals.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="rejected" className="gap-2">
            Rejected
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-3">
          {pendingProposals.length === 0 ? (
            <EmptyState message="No pending proposals" icon={Inbox} />
          ) : (
            pendingProposals.map((c) => <ProposalCard key={c.id} campaign={c} />)
          )}
        </TabsContent>

        <TabsContent value="countering" className="space-y-3">
          {counteringProposals.length === 0 ? (
            <EmptyState message="No proposals awaiting counter response" icon={MessageSquare} />
          ) : (
            counteringProposals.map((c) => <ProposalCard key={c.id} campaign={c} />)
          )}
        </TabsContent>

        <TabsContent value="accepted" className="space-y-3">
          {acceptedProposals.length === 0 ? (
            <EmptyState message="No accepted proposals yet" icon={CheckCircle} />
          ) : (
            acceptedProposals.map((c) => <ProposalCard key={c.id} campaign={c} />)
          )}
        </TabsContent>

        <TabsContent value="rejected" className="space-y-3">
          {rejectedProposals.length === 0 ? (
            <EmptyState message="No rejected proposals" icon={XCircle} />
          ) : (
            rejectedProposals.map((c) => <ProposalCard key={c.id} campaign={c} />)
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

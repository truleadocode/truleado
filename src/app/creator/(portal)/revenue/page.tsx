'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DollarSign, TrendingUp, Clock, CheckCircle, Inbox } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { graphqlRequest, queries } from '@/lib/graphql/client'

interface CampaignCreator {
  id: string
  status: string
  proposalState: string | null
  campaign: {
    id: string
    name: string
    status: string
    project: {
      id: string
      name: string
      client: { id: string; name: string }
    }
  }
  currentProposal: {
    id: string
    state: string
    rateAmount: number | null
    rateCurrency: string | null
    createdAt: string
  } | null
}

export default function RevenuePage() {
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
      console.error('Failed to load revenue data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load revenue data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user) {
      fetchData()
    }
  }, [user, fetchData])

  const formatCurrency = (amount: number, currency: string = 'INR') => {
    const locale = currency === 'INR' ? 'en-IN' : 'en-US'
    const formatter = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
    })
    return formatter.format(amount / 100)
  }

  // Calculate revenue metrics
  const acceptedCampaigns = campaigns.filter(
    (c) => c.proposalState === 'ACCEPTED' || c.currentProposal?.state === 'ACCEPTED'
  )

  const totalEarnings = acceptedCampaigns.reduce((sum, c) => {
    if (c.currentProposal?.rateAmount) {
      return sum + c.currentProposal.rateAmount
    }
    return sum
  }, 0)

  const completedCampaigns = acceptedCampaigns.filter(
    (c) => c.campaign.status === 'completed'
  )

  const earnedRevenue = completedCampaigns.reduce((sum, c) => {
    if (c.currentProposal?.rateAmount) {
      return sum + c.currentProposal.rateAmount
    }
    return sum
  }, 0)

  const pendingRevenue = totalEarnings - earnedRevenue

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
        <h1 className="text-2xl font-bold mb-1">Revenue</h1>
        <p className="text-muted-foreground">
          Track your earnings from campaigns
        </p>
      </div>

      {/* Revenue Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Contract Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalEarnings)}</div>
            <p className="text-xs text-muted-foreground">
              From {acceptedCampaigns.length} accepted campaigns
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Earned</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(earnedRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              From {completedCampaigns.length} completed campaigns
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{formatCurrency(pendingRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              From {acceptedCampaigns.length - completedCampaigns.length} active campaigns
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Campaign Revenue Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Campaign Breakdown</CardTitle>
          <CardDescription>Revenue by campaign</CardDescription>
        </CardHeader>
        <CardContent>
          {acceptedCampaigns.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <Inbox className="h-12 w-12" />
              <p>No accepted campaigns yet.</p>
              <p className="text-sm">Accept proposals to start earning.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {acceptedCampaigns.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">{c.campaign.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {c.campaign.project.client.name}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={c.campaign.status === 'completed' ? 'default' : 'secondary'}
                    >
                      {c.campaign.status === 'completed' ? 'Earned' : 'In Progress'}
                    </Badge>
                    <span className="font-semibold">
                      {c.currentProposal?.rateAmount
                        ? formatCurrency(c.currentProposal.rateAmount, c.currentProposal.rateCurrency || 'INR')
                        : '-'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-6 p-4 bg-muted/50 rounded-lg">
        <p className="text-sm text-muted-foreground text-center">
          Payment tracking and invoicing features coming soon. Revenue shown is based on accepted proposal amounts.
        </p>
      </div>
    </div>
  )
}

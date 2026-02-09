'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Calendar, Banknote, FileText, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/contexts/auth-context'
import { graphqlRequest, queries, mutations } from '@/lib/graphql/client'

interface ProposalVersion {
  id: string
  versionNumber: number
  state: string
  rateAmount: number | null
  rateCurrency: string | null
  notes: string | null
  deliverableScopes: Array<{
    deliverableType: string
    quantity: number
    notes: string | null
  }> | null
  createdByType: string
  createdAt: string
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
  currentProposal: ProposalVersion | null
}

export default function CreatorProposalPage() {
  const router = useRouter()
  const params = useParams()
  const campaignCreatorId = params.campaignCreatorId as string
  const { user, loading: authLoading } = useAuth()

  const [campaign, setCampaign] = useState<CampaignCreator | null>(null)
  const [proposal, setProposal] = useState<ProposalVersion | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Action states
  const [actionLoading, setActionLoading] = useState(false)
  const [showCounterForm, setShowCounterForm] = useState(false)
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [counterRate, setCounterRate] = useState('')
  const [counterNotes, setCounterNotes] = useState('')
  const [rejectReason, setRejectReason] = useState('')

  const fetchData = useCallback(async () => {
    try {
      const [campaignsData, proposalData] = await Promise.all([
        graphqlRequest<{ myCreatorCampaigns: CampaignCreator[] }>(queries.myCreatorCampaigns),
        graphqlRequest<{ myCreatorProposal: ProposalVersion | null }>(
          queries.myCreatorProposal,
          { campaignCreatorId }
        ),
      ])

      // Find the campaign by campaignCreatorId
      const foundCampaign = campaignsData.myCreatorCampaigns?.find(
        (c) => c.id === campaignCreatorId
      )

      if (!foundCampaign) {
        setError('Proposal not found or you do not have access')
        setLoading(false)
        return
      }

      setCampaign(foundCampaign)
      setProposal(proposalData.myCreatorProposal)

      // Pre-fill counter form with current rate
      if (proposalData.myCreatorProposal?.rateAmount) {
        setCounterRate((proposalData.myCreatorProposal.rateAmount / 100).toString())
      }
    } catch (err) {
      console.error('Failed to load proposal:', err)
      setError(err instanceof Error ? err.message : 'Failed to load proposal')
    } finally {
      setLoading(false)
    }
  }, [campaignCreatorId])

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.replace('/creator/login')
      return
    }
    fetchData()
  }, [authLoading, user, router, fetchData])

  const handleAccept = async () => {
    setActionLoading(true)
    try {
      await graphqlRequest(mutations.acceptProposal, { campaignCreatorId })
      router.push('/creator/dashboard')
    } catch (err) {
      console.error('Failed to accept proposal:', err)
      setError(err instanceof Error ? err.message : 'Failed to accept proposal')
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async () => {
    setActionLoading(true)
    try {
      await graphqlRequest(mutations.rejectProposal, {
        campaignCreatorId,
        reason: rejectReason || undefined,
      })
      router.push('/creator/dashboard')
    } catch (err) {
      console.error('Failed to reject proposal:', err)
      setError(err instanceof Error ? err.message : 'Failed to reject proposal')
    } finally {
      setActionLoading(false)
    }
  }

  const handleCounter = async () => {
    if (!counterRate) {
      setError('Please enter a counter rate')
      return
    }

    setActionLoading(true)
    try {
      const rateInCents = Math.round(parseFloat(counterRate) * 100)
      await graphqlRequest(mutations.counterProposal, {
        input: {
          campaignCreatorId,
          rateAmount: rateInCents,
          rateCurrency: proposal?.rateCurrency || 'INR',
          notes: counterNotes || undefined,
        },
      })
      router.push('/creator/dashboard')
    } catch (err) {
      console.error('Failed to counter proposal:', err)
      setError(err instanceof Error ? err.message : 'Failed to submit counter proposal')
    } finally {
      setActionLoading(false)
    }
  }

  if (authLoading || !user) {
    return null
  }

  const formatCurrency = (amount: number | null, currency: string | null) => {
    if (!amount) return 'Not specified'
    const currencyCode = currency || 'INR'
    // Use appropriate locale for the currency
    const locale = currencyCode === 'INR' ? 'en-IN' : 'en-US'
    const formatter = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 0,
    })
    return formatter.format(amount / 100)
  }

  const formatDate = (date: string | null) => {
    if (!date) return null
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const getStateIcon = (state: string) => {
    switch (state) {
      case 'SENT':
        return <Clock className="h-5 w-5 text-orange-500" />
      case 'ACCEPTED':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'REJECTED':
        return <XCircle className="h-5 w-5 text-red-500" />
      case 'COUNTERED':
        return <AlertCircle className="h-5 w-5 text-blue-500" />
      default:
        return <FileText className="h-5 w-5 text-muted-foreground" />
    }
  }

  const getStateBadge = (state: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      DRAFT: 'secondary',
      SENT: 'outline',
      COUNTERED: 'outline',
      ACCEPTED: 'default',
      REJECTED: 'destructive',
    }
    return <Badge variant={variants[state] || 'secondary'}>{state}</Badge>
  }

  const canTakeAction = proposal?.state === 'SENT'

  return (
    <div className="flex-1 container max-w-3xl mx-auto px-4 py-8">
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
      ) : error && !campaign ? (
        <Card>
          <CardContent className="py-8 text-center text-destructive">
            {error}
          </CardContent>
        </Card>
      ) : campaign && proposal ? (
        <div className="space-y-6">
          {/* Campaign Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Campaign</CardDescription>
              <CardTitle>{campaign.campaign.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">
                {campaign.campaign.project.client.name} · {campaign.campaign.project.name}
              </p>
              {campaign.campaign.description && (
                <p className="text-sm text-muted-foreground">
                  {campaign.campaign.description}
                </p>
              )}
              {(campaign.campaign.startDate || campaign.campaign.endDate) && (
                <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  {formatDate(campaign.campaign.startDate)} – {formatDate(campaign.campaign.endDate)}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Proposal Details */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getStateIcon(proposal.state)}
                  <CardTitle>Proposal Details</CardTitle>
                </div>
                {getStateBadge(proposal.state)}
              </div>
              <CardDescription>
                Version {proposal.versionNumber} · Created {formatDate(proposal.createdAt)}
                {proposal.createdByType === 'AGENCY' && ' by agency'}
                {proposal.createdByType === 'CREATOR' && ' by you'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Rate */}
              <div>
                <Label className="text-muted-foreground">Proposed Rate</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Banknote className="h-5 w-5 text-green-600" />
                  <span className="text-2xl font-bold">
                    {formatCurrency(proposal.rateAmount, proposal.rateCurrency)}
                  </span>
                </div>
              </div>

              {/* Deliverable Scopes */}
              {proposal.deliverableScopes && proposal.deliverableScopes.length > 0 && (
                <div>
                  <Label className="text-muted-foreground">Deliverables Included</Label>
                  <ul className="mt-2 space-y-2">
                    {proposal.deliverableScopes.map((scope, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm">
                        <Badge variant="outline">{scope.deliverableType}</Badge>
                        <span>× {scope.quantity}</span>
                        {scope.notes && (
                          <span className="text-muted-foreground">({scope.notes})</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Notes */}
              {proposal.notes && (
                <div>
                  <Label className="text-muted-foreground">Notes</Label>
                  <p className="mt-1 text-sm whitespace-pre-wrap">{proposal.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Error Message */}
          {error && (
            <Card className="border-destructive">
              <CardContent className="py-4 text-destructive">
                {error}
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          {canTakeAction && !showCounterForm && !showRejectForm && (
            <Card>
              <CardContent className="py-6">
                <p className="text-sm text-muted-foreground mb-4">
                  Review the proposal above and choose an action:
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={handleAccept}
                    disabled={actionLoading}
                    className="flex-1 sm:flex-none"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Accept Proposal
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowCounterForm(true)}
                    disabled={actionLoading}
                    className="flex-1 sm:flex-none"
                  >
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Counter Offer
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowRejectForm(true)}
                    disabled={actionLoading}
                    className="flex-1 sm:flex-none text-destructive hover:text-destructive"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Decline
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Counter Offer Form */}
          {showCounterForm && (
            <Card>
              <CardHeader>
                <CardTitle>Submit Counter Offer</CardTitle>
                <CardDescription>
                  Propose your terms for this campaign
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="counterRate">Your Rate ({proposal.rateCurrency || 'INR'})</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      id="counterRate"
                      type="number"
                      step="0.01"
                      min="0"
                      value={counterRate}
                      onChange={(e) => setCounterRate(e.target.value)}
                      placeholder="Enter amount"
                      className="max-w-[200px]"
                    />
                    <span className="text-muted-foreground">{proposal.rateCurrency || 'INR'}</span>
                  </div>
                </div>
                <div>
                  <Label htmlFor="counterNotes">Notes (optional)</Label>
                  <Textarea
                    id="counterNotes"
                    value={counterNotes}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCounterNotes(e.target.value)}
                    placeholder="Add any additional terms or notes..."
                    rows={3}
                    className="mt-1"
                  />
                </div>
                <div className="flex gap-3">
                  <Button onClick={handleCounter} disabled={actionLoading}>
                    Submit Counter Offer
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setShowCounterForm(false)}
                    disabled={actionLoading}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Reject Form */}
          {showRejectForm && (
            <Card>
              <CardHeader>
                <CardTitle>Decline Proposal</CardTitle>
                <CardDescription>
                  Let the agency know why you're declining (optional)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="rejectReason">Reason (optional)</Label>
                  <Textarea
                    id="rejectReason"
                    value={rejectReason}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setRejectReason(e.target.value)}
                    placeholder="Share feedback on why this proposal doesn't work for you..."
                    rows={3}
                    className="mt-1"
                  />
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="destructive"
                    onClick={handleReject}
                    disabled={actionLoading}
                  >
                    Confirm Decline
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setShowRejectForm(false)}
                    disabled={actionLoading}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Already Responded */}
          {!canTakeAction && (
            <Card>
              <CardContent className="py-6 text-center">
                {proposal.state === 'ACCEPTED' && (
                  <div className="flex flex-col items-center gap-2">
                    <CheckCircle className="h-8 w-8 text-green-500" />
                    <p className="text-green-600 font-medium">You accepted this proposal</p>
                    <Link href={`/creator/campaigns/${campaign.campaign.id}`}>
                      <Button variant="outline" size="sm" className="mt-2">
                        View Campaign Deliverables
                      </Button>
                    </Link>
                  </div>
                )}
                {proposal.state === 'REJECTED' && (
                  <div className="flex flex-col items-center gap-2">
                    <XCircle className="h-8 w-8 text-red-500" />
                    <p className="text-red-600 font-medium">You declined this proposal</p>
                  </div>
                )}
                {proposal.state === 'COUNTERED' && (
                  <div className="flex flex-col items-center gap-2">
                    <AlertCircle className="h-8 w-8 text-blue-500" />
                    <p className="text-blue-600 font-medium">Counter offer submitted</p>
                    <p className="text-sm text-muted-foreground">
                      Waiting for the agency to respond
                    </p>
                  </div>
                )}
                {proposal.state === 'DRAFT' && (
                  <div className="flex flex-col items-center gap-2">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                    <p className="text-muted-foreground">This proposal is still a draft</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      ) : null}
    </div>
  )
}

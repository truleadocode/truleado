'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { Calendar, Banknote, FileText, Clock, CheckCircle, XCircle, AlertCircle, Send, ArrowLeftRight, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageBreadcrumb } from '@/components/layout/page-breadcrumb'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { useAuth } from '@/contexts/auth-context'
import { graphqlRequest, queries, mutations } from '@/lib/graphql/client'
import { formatSmallestUnit } from '@/lib/currency'

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

interface ProposalNote {
  id: string
  message: string
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
  proposalVersions: ProposalVersion[]
  proposalNotes: ProposalNote[]
}

// Timeline item type for merged display
type TimelineItem =
  | { type: 'proposal'; data: ProposalVersion }
  | { type: 'note'; data: ProposalNote }

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

  // Note/message state
  const [noteMessage, setNoteMessage] = useState('')
  const [isSendingNote, setIsSendingNote] = useState(false)

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

  const handleSendNote = async () => {
    if (!noteMessage.trim()) return
    setIsSendingNote(true)
    try {
      await graphqlRequest(mutations.addProposalNote, {
        campaignCreatorId,
        message: noteMessage.trim(),
      })
      setNoteMessage('')
      // Refresh data to show the new note
      fetchData()
    } catch (err) {
      console.error('Failed to send note:', err)
      setError(err instanceof Error ? err.message : 'Failed to send message')
    } finally {
      setIsSendingNote(false)
    }
  }

  if (authLoading || !user) {
    return null
  }

  const formatCreatorCurrency = (amount: number | null, currency: string | null) => {
    if (!amount) return 'Not specified'
    return formatSmallestUnit(amount, currency || 'INR')
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
        <PageBreadcrumb items={[
          { label: 'Campaigns', href: '/creator/campaigns' },
          { label: campaign?.campaign.name || 'Campaign', href: campaign ? `/creator/campaigns/${campaign.id}` : undefined },
          { label: 'Proposal' },
        ]} />
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
                    {formatCreatorCurrency(proposal.rateAmount, proposal.rateCurrency)}
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

          {/* Message Input & Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Messages & Timeline</CardTitle>
              <CardDescription>
                Send messages and view negotiation history
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Send Message */}
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Textarea
                    value={noteMessage}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNoteMessage(e.target.value)}
                    placeholder="Type a message to the agency..."
                    className="min-h-[60px] resize-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                        e.preventDefault()
                        handleSendNote()
                      }
                    }}
                  />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">
                    Press ⌘+Enter to send
                  </span>
                  <Button
                    onClick={handleSendNote}
                    disabled={!noteMessage.trim() || isSendingNote}
                    size="sm"
                  >
                    <Send className="mr-2 h-4 w-4" />
                    {isSendingNote ? 'Sending...' : 'Send'}
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Timeline */}
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Negotiation History
                </h3>

                {(() => {
                  // Merge proposal versions and notes into a single timeline
                  const timelineItems: TimelineItem[] = [
                    ...(campaign.proposalVersions || []).map((pv) => ({ type: 'proposal' as const, data: pv })),
                    ...(campaign.proposalNotes || []).map((pn) => ({ type: 'note' as const, data: pn })),
                  ].sort((a, b) => new Date(b.data.createdAt).getTime() - new Date(a.data.createdAt).getTime())

                  if (timelineItems.length === 0) {
                    return (
                      <p className="text-sm text-muted-foreground py-4">
                        No activity yet.
                      </p>
                    )
                  }

                  const formatShortDateTime = (dateString: string) => {
                    return format(new Date(dateString), 'MMM d, yyyy h:mm a')
                  }

                  const formatRate = (amount: number | null, currency: string | null) => {
                    if (!amount) return null
                    return formatSmallestUnit(amount, currency || 'INR')
                  }

                  const getActionText = (createdByType: string, state: string) => {
                    const type = createdByType.toLowerCase()
                    const stateUpper = state.toUpperCase()

                    if (type === 'agency') {
                      switch (stateUpper) {
                        case 'SENT': return 'Agency proposed'
                        case 'DRAFT': return 'Agency drafted proposal'
                        case 'ACCEPTED': return 'Agency accepted counter'
                        case 'REJECTED': return 'Agency declined counter'
                        default: return 'Agency action'
                      }
                    } else {
                      switch (stateUpper) {
                        case 'COUNTERED': return 'You countered'
                        case 'ACCEPTED': return 'You accepted'
                        case 'REJECTED': return 'You declined'
                        default: return 'Your action'
                      }
                    }
                  }

                  const getEntryIcon = (state: string) => {
                    const stateUpper = state.toUpperCase()
                    switch (stateUpper) {
                      case 'ACCEPTED': return <CheckCircle className="h-3 w-3" />
                      case 'REJECTED': return <XCircle className="h-3 w-3" />
                      case 'COUNTERED': return <ArrowLeftRight className="h-3 w-3" />
                      default: return <Send className="h-3 w-3" />
                    }
                  }

                  const getEntryIconStyle = (state: string, createdByType: string) => {
                    const stateUpper = state.toUpperCase()
                    if (stateUpper === 'ACCEPTED') return 'bg-green-100 text-green-600'
                    if (stateUpper === 'REJECTED') return 'bg-red-100 text-red-600'
                    if (stateUpper === 'COUNTERED') return 'bg-orange-100 text-orange-600'
                    if (createdByType.toLowerCase() === 'agency') return 'bg-blue-100 text-blue-600'
                    return 'bg-gray-100 text-gray-600'
                  }

                  return (
                    <div className="mt-4 space-y-0">
                      {timelineItems.map((item, index) => (
                        <div
                          key={item.data.id}
                          className="relative pl-8 pb-6 last:pb-0"
                        >
                          {/* Vertical line */}
                          {index < timelineItems.length - 1 && (
                            <div className="absolute left-[11px] top-6 bottom-0 w-px bg-border" />
                          )}

                          {item.type === 'proposal' ? (
                            <>
                              <div
                                className={`absolute left-0 w-6 h-6 rounded-full flex items-center justify-center ${getEntryIconStyle(
                                  item.data.state,
                                  item.data.createdByType
                                )}`}
                              >
                                {getEntryIcon(item.data.state)}
                              </div>
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-medium">
                                    {getActionText(item.data.createdByType, item.data.state)}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {formatShortDateTime(item.data.createdAt)}
                                  </span>
                                </div>
                                {item.data.rateAmount && (
                                  <div className="text-sm">
                                    <span className="font-semibold">
                                      {formatRate(item.data.rateAmount, item.data.rateCurrency)}
                                    </span>
                                  </div>
                                )}
                                {item.data.notes && (
                                  <p className="text-sm text-muted-foreground italic">
                                    &ldquo;{item.data.notes}&rdquo;
                                  </p>
                                )}
                              </div>
                            </>
                          ) : (
                            <>
                              <div
                                className={`absolute left-0 w-6 h-6 rounded-full flex items-center justify-center ${
                                  item.data.createdByType.toLowerCase() === 'agency'
                                    ? 'bg-purple-100 text-purple-600'
                                    : 'bg-teal-100 text-teal-600'
                                }`}
                              >
                                <MessageCircle className="h-3 w-3" />
                              </div>
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-medium">
                                    {item.data.createdByType.toLowerCase() === 'agency'
                                      ? 'Agency message'
                                      : 'Your message'}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {formatShortDateTime(item.data.createdAt)}
                                  </span>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {item.data.message}
                                </p>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )
                })()}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  )
}

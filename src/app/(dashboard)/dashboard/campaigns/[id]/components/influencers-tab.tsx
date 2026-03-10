"use client"

import { useState, useMemo } from 'react'
import {
  Search,
  UserPlus,
  Download,
  MoreHorizontal,
  Trash2,
  FileText,
  Package,
  AlertCircle,
  CheckCircle,
  XCircle,
  RefreshCw,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/currency'
import { graphqlRequest, mutations } from '@/lib/graphql/client'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/auth-context'
import { AddInfluencerDialog } from './add-influencer-dialog'
import { ProposalTimelineSheet } from './proposal-timeline-sheet'
import type { Campaign, CampaignCreator } from '../types'

interface InfluencersTabProps {
  campaign: Campaign
  onRefresh?: () => void
  onTabChange?: (tab: string) => void
}

function getInitials(name: string | null | undefined) {
  if (!name) return '?'
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

function getCreatorHandle(c: CampaignCreator['creator']) {
  return c.instagramHandle || c.youtubeHandle || c.tiktokHandle || ''
}

function getTierLabel(followers: number | null) {
  if (!followers) return null
  if (followers >= 1_000_000) return 'Mega'
  if (followers >= 500_000) return 'Macro'
  if (followers >= 100_000) return 'Mid-Tier'
  if (followers >= 10_000) return 'Micro'
  return 'Nano'
}

function formatFollowers(n: number | null) {
  if (!n) return '—'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

const PROPOSAL_STATE_STYLES: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  SENT: 'bg-blue-100 text-blue-700',
  COUNTERED: 'bg-orange-100 text-orange-700',
  ACCEPTED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
}

const STATUS_STYLES: Record<string, string> = {
  INVITED: 'bg-blue-100 text-blue-700',
  ACCEPTED: 'bg-green-100 text-green-700',
  DECLINED: 'bg-red-100 text-red-700',
}

export function InfluencersTab({ campaign, onRefresh, onTabChange }: InfluencersTabProps) {
  const { toast } = useToast()
  const { currentAgency } = useAuth()
  const defaultCurrency = campaign.currency || currentAgency?.currencyCode || 'USD'
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [addInfluencerOpen, setAddInfluencerOpen] = useState(false)
  const [proposalSheetCreator, setProposalSheetCreator] = useState<CampaignCreator | null>(null)

  const isArchived = campaign.status === 'ARCHIVED' || campaign.status === 'COMPLETED'

  // Count deliverables per creator
  const creatorDeliverableCount = useMemo(() => {
    const map = new Map<string, number>()
    for (const d of campaign.deliverables) {
      if (d.creator?.id) {
        map.set(d.creator.id, (map.get(d.creator.id) || 0) + 1)
      }
    }
    return map
  }, [campaign.deliverables])

  // Filter creators
  const filteredCreators = useMemo(() => {
    let list = campaign.creators.filter((c) => c.status !== 'REMOVED')
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      list = list.filter(
        (c) =>
          c.creator.displayName.toLowerCase().includes(q) ||
          (c.creator.instagramHandle || '').toLowerCase().includes(q) ||
          (c.creator.youtubeHandle || '').toLowerCase().includes(q) ||
          (c.creator.tiktokHandle || '').toLowerCase().includes(q)
      )
    }
    if (statusFilter !== 'all') {
      list = list.filter((c) => c.status === statusFilter)
    }
    return list
  }, [campaign.creators, searchQuery, statusFilter])

  // Fee summary
  const feeSummary = useMemo(() => {
    const accepted = campaign.creators.filter((c) => c.status !== 'REMOVED' && c.status !== 'DECLINED')
    const totalFees = accepted.reduce((sum, c) => sum + (c.rateAmount || 0), 0)
    return { count: accepted.length, totalFees }
  }, [campaign.creators])

  // Proposal handlers
  const handleAcceptCounter = async (campaignCreatorId: string) => {
    try {
      await graphqlRequest(mutations.acceptCounterProposal, { campaignCreatorId })
      toast({ title: 'Counter-proposal accepted' })
      onRefresh?.()
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : 'Failed to accept', variant: 'destructive' })
    }
  }

  const handleDeclineCounter = async (campaignCreatorId: string) => {
    try {
      await graphqlRequest(mutations.declineCounterProposal, { campaignCreatorId })
      toast({ title: 'Counter-proposal declined' })
      onRefresh?.()
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : 'Failed to decline', variant: 'destructive' })
    }
  }

  const handleReCounter = async (campaignCreatorId: string, input: { rateAmount: number; rateCurrency: string; notes?: string }) => {
    try {
      await graphqlRequest(mutations.reCounterProposal, { input: { campaignCreatorId, ...input } })
      toast({ title: 'New proposal sent' })
      onRefresh?.()
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : 'Failed to send', variant: 'destructive' })
    }
  }

  const handleReopen = async (campaignCreatorId: string, input: { rateAmount: number; rateCurrency: string; notes?: string }) => {
    try {
      await graphqlRequest(mutations.reopenProposal, { input: { campaignCreatorId, ...input } })
      toast({ title: 'Negotiation reopened' })
      onRefresh?.()
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : 'Failed to reopen', variant: 'destructive' })
    }
  }

  const handleRemoveCreator = async (campaignCreatorId: string) => {
    try {
      await graphqlRequest(mutations.removeCreatorFromCampaign, { campaignCreatorId })
      toast({ title: 'Creator removed from campaign' })
      onRefresh?.()
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : 'Failed to remove', variant: 'destructive' })
    }
  }

  const handleAddNote = async (campaignCreatorId: string, message: string) => {
    try {
      await graphqlRequest(mutations.addProposalNote, { campaignCreatorId, message })
      toast({ title: 'Message sent' })
      onRefresh?.()
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : 'Failed to send message', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9 w-[250px]"
              placeholder="Search influencers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="INVITED">Invited</SelectItem>
              <SelectItem value="ACCEPTED">Accepted</SelectItem>
              <SelectItem value="DECLINED">Declined</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{feeSummary.count} influencers</span>
            <span>·</span>
            <span>{formatCurrency(feeSummary.totalFees, defaultCurrency)} total fees</span>
          </div>
          <Button size="sm" onClick={() => setAddInfluencerOpen(true)}>
            <UserPlus className="mr-1 h-4 w-4" />
            Add Influencer
          </Button>
        </div>
      </div>

      {/* Influencer Cards */}
      {filteredCreators.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <UserPlus className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold">No influencers yet</h3>
            <p className="text-muted-foreground text-center mt-2 max-w-sm">
              Add influencers to this campaign to send proposals and assign deliverables.
            </p>
            <Button className="mt-4" onClick={() => setAddInfluencerOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              Add Influencer
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredCreators.map((cc) => {
            const c = cc.creator
            const handle = getCreatorHandle(c)
            const tier = getTierLabel(c.followers)
            const delivCount = creatorDeliverableCount.get(c.id) || 0
            const isCountered = cc.proposalState?.toUpperCase() === 'COUNTERED'
            const proposalStyle = cc.proposalState ? PROPOSAL_STATE_STYLES[cc.proposalState.toUpperCase()] || 'bg-gray-100 text-gray-700' : ''
            const statusStyle = STATUS_STYLES[cc.status] || 'bg-gray-100 text-gray-700'

            return (
              <Card key={cc.id}>
                <CardContent className="p-4 space-y-3">
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="h-10 w-10 shrink-0">
                        {c.profilePictureUrl && <AvatarImage src={c.profilePictureUrl} />}
                        <AvatarFallback>{getInitials(c.displayName)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium truncate">{c.displayName}</p>
                          {tier && <Badge variant="outline" className="text-[10px]">{tier}</Badge>}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {handle && <span>@{handle}</span>}
                          {c.followers && <span>· {formatFollowers(c.followers)}</span>}
                          {c.engagementRate && <span>· {c.engagementRate.toFixed(1)}% ER</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge className={cn('text-[10px]', statusStyle)}>{cc.status}</Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem className="text-destructive" onClick={() => handleRemoveCreator(cc.id)}>
                            <Trash2 className="mr-2 h-3.5 w-3.5" />
                            Remove from Campaign
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Fee & Proposal row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Fee: </span>
                        <span className="font-medium">
                          {cc.rateAmount
                            ? formatCurrency(cc.rateAmount, cc.rateCurrency || defaultCurrency)
                            : '—'}
                        </span>
                      </div>
                      {cc.proposalState && (
                        <Badge className={cn('text-[10px]', proposalStyle)}>
                          {isCountered && <AlertCircle className="mr-1 h-3 w-3" />}
                          {cc.proposalState}
                          {isCountered && ' - Action Required'}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {delivCount > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-muted-foreground"
                          onClick={() => onTabChange?.('deliverables')}
                        >
                          <Package className="mr-1 h-3 w-3" />
                          {delivCount} deliverable{delivCount !== 1 ? 's' : ''}
                        </Button>
                      )}
                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setProposalSheetCreator(cc)}>
                        <FileText className="mr-1 h-3 w-3" />
                        View Proposal
                      </Button>
                    </div>
                  </div>

                  {/* Inline countered actions */}
                  {isCountered && !isArchived && (
                    <>
                      <Separator />
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {cc.currentProposal?.createdByType?.toLowerCase() === 'creator' ? 'Creator countered' : 'Counter received'}
                          {cc.currentProposal?.rateAmount && (
                            <> with <span className="font-medium">{formatCurrency(cc.currentProposal.rateAmount, cc.currentProposal.rateCurrency || defaultCurrency)}</span></>
                          )}
                        </span>
                        <div className="ml-auto flex gap-2">
                          <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700" onClick={() => handleAcceptCounter(cc.id)}>
                            <CheckCircle className="mr-1 h-3 w-3" />
                            Accept
                          </Button>
                          <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => handleDeclineCounter(cc.id)}>
                            <XCircle className="mr-1 h-3 w-3" />
                            Decline
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setProposalSheetCreator(cc)}>
                            <RefreshCw className="mr-1 h-3 w-3" />
                            Re-counter
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Fee Summary Table */}
      {feeSummary.count > 0 && (
        <>
          <Separator />
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold">Fee Summary</h3>
                <Button variant="outline" size="sm" className="text-xs">
                  <Download className="mr-1 h-3 w-3" />
                  Export Fee Sheet
                </Button>
              </div>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Influencer</TableHead>
                      <TableHead className="text-xs text-right">Fee</TableHead>
                      <TableHead className="text-xs">Proposal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {campaign.creators
                      .filter((c) => c.status !== 'REMOVED' && c.status !== 'DECLINED')
                      .map((cc) => (
                        <TableRow key={cc.id}>
                          <TableCell className="text-xs">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-5 w-5">
                                <AvatarFallback className="text-[8px]">{getInitials(cc.creator.displayName)}</AvatarFallback>
                              </Avatar>
                              <span>{cc.creator.displayName}</span>
                              {getCreatorHandle(cc.creator) && (
                                <span className="text-muted-foreground">@{getCreatorHandle(cc.creator)}</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-right font-medium">
                            {cc.rateAmount ? formatCurrency(cc.rateAmount, cc.rateCurrency || defaultCurrency) : '—'}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={cc.proposalState === 'ACCEPTED' ? 'default' : 'secondary'}
                              className="text-[10px]"
                            >
                              {cc.proposalState || cc.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    <TableRow className="font-medium">
                      <TableCell className="text-xs">Total</TableCell>
                      <TableCell className="text-xs text-right">
                        {formatCurrency(feeSummary.totalFees, defaultCurrency)}
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Dialogs */}
      <AddInfluencerDialog
        open={addInfluencerOpen}
        onOpenChange={setAddInfluencerOpen}
        campaignId={campaign.id}
        existingCreatorIds={campaign.creators.filter((c) => c.status !== 'REMOVED').map((c) => c.creator.id)}
        currency={campaign.currency}
        onSuccess={() => onRefresh?.()}
      />

      <ProposalTimelineSheet
        open={!!proposalSheetCreator}
        onOpenChange={(open) => { if (!open) setProposalSheetCreator(null) }}
        campaignCreator={proposalSheetCreator}
        defaultCurrency={defaultCurrency}
        onAcceptCounter={handleAcceptCounter}
        onDeclineCounter={handleDeclineCounter}
        onReCounter={handleReCounter}
        onReopen={handleReopen}
        onRemove={handleRemoveCreator}
        onAddNote={handleAddNote}
        isArchived={isArchived}
      />
    </div>
  )
}

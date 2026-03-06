"use client"

import { useState, useMemo } from 'react'
import {
  Search,
  Plus,
  UserPlus,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Send,
  DollarSign,
  Download,
  Copy,
  MoreHorizontal,
  Eye,
  Trash2,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import type { Campaign, CampaignCreator, CampaignDeliverable } from '../types'

interface InfluencersDeliverablesTabProps {
  campaign: Campaign
  onStatusChange?: (deliverableId: string, status: string) => void
}

function getInitials(name: string | null | undefined) {
  if (!name) return '?'
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

function formatCurrency(amount: number, currency: string | null) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency || 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

function getCreatorHandle(c: CampaignCreator['creator']) {
  return c.instagramHandle || c.youtubeHandle || c.tiktokHandle || ''
}

function getCreatorPlatform(c: CampaignCreator['creator']) {
  if (c.instagramHandle) return 'instagram'
  if (c.youtubeHandle) return 'youtube'
  if (c.tiktokHandle) return 'tiktok'
  return ''
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

const DELIVERABLE_STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-gray-100 text-gray-700',
  SUBMITTED: 'bg-yellow-100 text-yellow-700',
  INTERNAL_REVIEW: 'bg-orange-100 text-orange-700',
  PENDING_PROJECT_APPROVAL: 'bg-orange-100 text-orange-700',
  CLIENT_REVIEW: 'bg-blue-100 text-blue-700',
  APPROVED: 'bg-teal-100 text-teal-700',
  REJECTED: 'bg-red-100 text-red-700',
}

const DELIVERABLE_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  SUBMITTED: 'Submitted',
  INTERNAL_REVIEW: 'In Review',
  PENDING_PROJECT_APPROVAL: 'Project Review',
  CLIENT_REVIEW: 'Client Review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
}

// ----- Influencer Card -----

function InfluencerCard({
  campaignCreator,
  deliverables,
  currency,
}: {
  campaignCreator: CampaignCreator
  deliverables: CampaignDeliverable[]
  currency: string | null
}) {
  const [expanded, setExpanded] = useState(true)
  const c = campaignCreator.creator
  const handle = getCreatorHandle(c)
  const tier = getTierLabel(c.followers)

  const submitted = deliverables.filter((d) => d.status !== 'PENDING').length
  const live = deliverables.filter((d) => d.trackingRecord && d.trackingRecord.urls.length > 0).length

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar className="h-10 w-10">
              {c.profilePictureUrl && <AvatarImage src={c.profilePictureUrl} />}
              <AvatarFallback>{getInitials(c.displayName)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
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
          <div className="flex items-center gap-1">
            <Badge variant={campaignCreator.status === 'ACCEPTED' ? 'default' : 'secondary'} className="text-xs">
              {campaignCreator.status}
            </Badge>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setExpanded(!expanded)}>
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Fee & Payment */}
        <div className="flex items-center gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Fee: </span>
            <span className="font-medium">
              {campaignCreator.rateAmount
                ? formatCurrency(campaignCreator.rateAmount, campaignCreator.rateCurrency || currency)
                : '—'}
            </span>
          </div>
          {campaignCreator.proposalState && (
            <Badge variant="outline" className="text-xs">{campaignCreator.proposalState}</Badge>
          )}
        </div>

        {expanded && deliverables.length > 0 && (
          <>
            <Separator />
            {/* Deliverables Table */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Type</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Due</TableHead>
                    <TableHead className="text-xs">Post URL</TableHead>
                    <TableHead className="text-xs w-[50px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deliverables.map((d) => {
                    const urls = d.trackingRecord?.urls || []
                    return (
                      <TableRow key={d.id}>
                        <TableCell className="text-xs font-medium">{d.deliverableType}</TableCell>
                        <TableCell>
                          <Badge className={cn('text-[10px]', DELIVERABLE_STATUS_COLORS[d.status] || 'bg-gray-100')}>
                            {DELIVERABLE_STATUS_LABELS[d.status] || d.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {d.dueDate
                            ? new Date(d.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                            : '—'}
                        </TableCell>
                        <TableCell className="text-xs">
                          {urls.length > 0 ? (
                            <a
                              href={urls[0].url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline flex items-center gap-1"
                            >
                              <ExternalLink className="h-3 w-3" />
                              View
                            </a>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-6 w-6">
                                <MoreHorizontal className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Eye className="mr-2 h-3.5 w-3.5" />
                                View Content
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Send className="mr-2 h-3.5 w-3.5" />
                                Send Reminder
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive">
                                <Trash2 className="mr-2 h-3.5 w-3.5" />
                                Remove
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Submission summary */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>Submitted: {submitted}/{deliverables.length}</span>
              <span>Live: {live}/{deliverables.length}</span>
            </div>
          </>
        )}

        {expanded && deliverables.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">No deliverables assigned yet.</p>
        )}
      </CardContent>
    </Card>
  )
}

// ----- Main Tab -----

export function InfluencersDeliverablesTab({ campaign }: InfluencersDeliverablesTabProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // Group deliverables by creator
  const creatorDeliverableMap = useMemo(() => {
    const map = new Map<string, CampaignDeliverable[]>()
    for (const d of campaign.deliverables) {
      const creatorId = d.creator?.id || '__unassigned__'
      const arr = map.get(creatorId) || []
      arr.push(d)
      map.set(creatorId, arr)
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
    return { count: accepted.length, totalFees, totalDeliverables: campaign.deliverables.length }
  }, [campaign.creators, campaign.deliverables])

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
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{feeSummary.count} influencers</span>
          <span>·</span>
          <span>{feeSummary.totalDeliverables} deliverables</span>
          <span>·</span>
          <span>{formatCurrency(feeSummary.totalFees, campaign.currency)} total fees</span>
        </div>
      </div>

      {/* Influencer Cards */}
      {filteredCreators.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <UserPlus className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold">No influencers yet</h3>
            <p className="text-muted-foreground text-center mt-2 max-w-sm">
              Add influencers to this campaign to assign deliverables and track content.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredCreators.map((cc) => (
            <InfluencerCard
              key={cc.id}
              campaignCreator={cc}
              deliverables={creatorDeliverableMap.get(cc.creator.id) || []}
              currency={campaign.currency}
            />
          ))}
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
                      <TableHead className="text-xs">Status</TableHead>
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
                            {cc.rateAmount ? formatCurrency(cc.rateAmount, cc.rateCurrency || campaign.currency) : '—'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={cc.proposalState === 'ACCEPTED' ? 'default' : 'secondary'} className="text-[10px]">
                              {cc.proposalState || cc.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    <TableRow className="font-medium">
                      <TableCell className="text-xs">Total</TableCell>
                      <TableCell className="text-xs text-right">
                        {formatCurrency(feeSummary.totalFees, campaign.currency)}
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
    </div>
  )
}

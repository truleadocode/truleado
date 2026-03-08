"use client"

import { useRouter } from 'next/navigation'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { StatusBadge } from '@/components/ui/status-badge'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/currency'
import type { CampaignGroupField } from '@/hooks/use-campaigns-list'

interface CampaignCardItem {
  id: string
  name: string
  status: string
  campaignType: string
  startDate: string | null
  endDate: string | null
  totalBudget: number | null
  currency: string | null
  project: {
    id: string
    name: string
    client: {
      id: string
      name: string
      logoUrl: string | null
    }
  }
  deliverables: Array<{
    id: string
    status: string
  }>
  creators: Array<{
    id: string
    creator: {
      id: string
      displayName: string
      profilePictureUrl: string | null
    }
  }>
  _platforms: string[]
  _approvedCount: number
  _overdueCount: number
  _liveCount: number
}

interface CampaignsCardViewProps {
  campaigns: CampaignCardItem[]
  groupedCampaigns: Map<string, CampaignCardItem[]> | null
  groupBy: CampaignGroupField | null
  selectedIds: Set<string>
  onToggleSelection: (id: string) => void
}

function getInitials(name: string | null | undefined) {
  if (!name) return '?'
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

const PLATFORM_ICONS: Record<string, string> = {
  instagram: 'IG',
  youtube: 'YT',
  tiktok: 'TT',
  facebook: 'FB',
  linkedin: 'LI',
  twitter: 'X',
}

function CampaignCard({
  campaign,
  selected,
  onToggle,
}: {
  campaign: CampaignCardItem
  selected: boolean
  onToggle: () => void
}) {
  const router = useRouter()
  const totalDeliverables = campaign.deliverables.length
  const approvedCount = campaign._approvedCount
  const progressPct = totalDeliverables > 0 ? Math.round((approvedCount / totalDeliverables) * 100) : 0

  const timelineLabel = (() => {
    if (!campaign.startDate) return null
    const start = new Date(campaign.startDate)
    const end = campaign.endDate ? new Date(campaign.endDate) : null
    const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const endStr = end ? end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'
    return `${startStr} – ${endStr}`
  })()

  // Timeline progress bar
  const timelineProgress = (() => {
    if (!campaign.startDate || !campaign.endDate) return 0
    const start = new Date(campaign.startDate).getTime()
    const end = new Date(campaign.endDate).getTime()
    const now = Date.now()
    if (now <= start) return 0
    if (now >= end) return 100
    return Math.round(((now - start) / (end - start)) * 100)
  })()

  return (
    <Card
      className={cn(
        'cursor-pointer hover:shadow-md transition-shadow',
        campaign._overdueCount > 0 && 'border-l-2 border-l-red-500'
      )}
      onClick={() => router.push(`/dashboard/campaigns/${campaign.id}`)}
    >
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div onClick={(e) => e.stopPropagation()}>
              <Checkbox checked={selected} onCheckedChange={() => onToggle()} />
            </div>
            <Avatar className="h-7 w-7">
              {campaign.project.client.logoUrl && <AvatarImage src={campaign.project.client.logoUrl} />}
              <AvatarFallback className="text-[8px]">{getInitials(campaign.project.client.name)}</AvatarFallback>
            </Avatar>
            <Badge variant="outline" className="text-[10px] capitalize">{campaign.campaignType}</Badge>
          </div>
          <StatusBadge status={campaign.status} type="campaign" />
        </div>

        {/* Name & Project */}
        <div>
          <p className="text-sm font-medium truncate">{campaign.name}</p>
          <p className="text-xs text-muted-foreground truncate">
            {campaign.project.client.name} · {campaign.project.name}
          </p>
        </div>

        {/* Platforms */}
        {campaign._platforms.length > 0 && (
          <div className="flex items-center gap-1.5">
            {campaign._platforms.map((p) => (
              <Badge key={p} variant="secondary" className="text-[10px] px-1.5 py-0">
                {PLATFORM_ICONS[p] || p}
              </Badge>
            ))}
          </div>
        )}

        {/* Timeline */}
        {timelineLabel && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{timelineLabel}</span>
              {campaign.startDate && campaign.endDate && (
                <span>{timelineProgress}%</span>
              )}
            </div>
            {campaign.startDate && campaign.endDate && (
              <div className="h-1 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full',
                    timelineProgress >= 100 ? 'bg-gray-400' : timelineProgress > 75 ? 'bg-yellow-500' : 'bg-blue-500'
                  )}
                  style={{ width: `${Math.min(timelineProgress, 100)}%` }}
                />
              </div>
            )}
          </div>
        )}

        {/* Budget */}
        {campaign.totalBudget && (
          <div className="text-xs">
            <span className="text-muted-foreground">Budget: </span>
            <span className="font-medium">{formatCurrency(campaign.totalBudget, campaign.currency || 'INR')}</span>
          </div>
        )}

        {/* Bottom: Influencers + Deliverables */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center -space-x-1">
            {campaign.creators.slice(0, 4).map((cc) => (
              <Avatar key={cc.id} className="h-6 w-6 border-2 border-background">
                {cc.creator.profilePictureUrl && <AvatarImage src={cc.creator.profilePictureUrl} />}
                <AvatarFallback className="text-[8px]">{getInitials(cc.creator.displayName)}</AvatarFallback>
              </Avatar>
            ))}
            {campaign.creators.length > 4 && (
              <span className="text-[10px] text-muted-foreground ml-2">+{campaign.creators.length - 4}</span>
            )}
            {campaign.creators.length === 0 && (
              <span className="text-[10px] text-muted-foreground">No influencers</span>
            )}
          </div>
          {totalDeliverables > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-12 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full',
                    progressPct === 100 ? 'bg-green-500' : 'bg-blue-500'
                  )}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground">{approvedCount}/{totalDeliverables}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export function CampaignsCardView({
  campaigns,
  groupedCampaigns,
  groupBy,
  selectedIds,
  onToggleSelection,
}: CampaignsCardViewProps) {
  if (groupedCampaigns) {
    return (
      <div className="space-y-6">
        {Array.from(groupedCampaigns.entries()).map(([key, groupCampaigns]) => (
          <div key={key} className="space-y-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold">{key}</h3>
              <Badge variant="secondary" className="text-xs">{groupCampaigns.length}</Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {groupCampaigns.map((c) => (
                <CampaignCard
                  key={c.id}
                  campaign={c as CampaignCardItem}
                  selected={selectedIds.has(c.id)}
                  onToggle={() => onToggleSelection(c.id)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
      {campaigns.map((c) => (
        <CampaignCard
          key={c.id}
          campaign={c}
          selected={selectedIds.has(c.id)}
          onToggle={() => onToggleSelection(c.id)}
        />
      ))}
    </div>
  )
}

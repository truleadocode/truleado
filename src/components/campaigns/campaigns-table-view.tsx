"use client"

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  MoreHorizontal,
  ExternalLink,
  Archive,
  Pencil,
  Copy,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Checkbox } from '@/components/ui/checkbox'
import { StatusBadge } from '@/components/ui/status-badge'
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
import type { CampaignGroupField } from '@/hooks/use-campaigns-list'

interface CampaignRow {
  id: string
  name: string
  status: string
  campaignType: string
  startDate: string | null
  endDate: string | null
  totalBudget: number | null
  currency: string | null
  createdAt: string
  project: {
    id: string
    name: string
    client: {
      id: string
      name: string
      logoUrl: string | null
      industry: string | null
    }
  }
  deliverables: Array<{
    id: string
    deliverableType: string
    status: string
    dueDate: string | null
    creator: { id: string; displayName: string } | null
    trackingRecord: { id: string; urls: { url: string }[] } | null
    approvals: { id: string; status: string }[]
  }>
  creators: Array<{
    id: string
    status: string
    rateAmount: number | null
    creator: {
      id: string
      displayName: string
      profilePictureUrl: string | null
    }
  }>
  _platforms: string[]
  _overdueCount: number
  _pendingApprovalCount: number
  _liveCount: number
  _approvedCount: number
}

interface CampaignsTableViewProps {
  campaigns: CampaignRow[]
  groupedCampaigns: Map<string, CampaignRow[]> | null
  groupBy: CampaignGroupField | null
  selectedIds: Set<string>
  onToggleSelection: (id: string) => void
  onSelectAll: () => void
  isAllSelected: boolean
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

const PLATFORM_ICONS: Record<string, string> = {
  instagram: 'IG',
  youtube: 'YT',
  tiktok: 'TT',
  facebook: 'FB',
  linkedin: 'LI',
  twitter: 'X',
}

function getDeadlineColor(dueDate: string | null, status: string): string {
  if (!dueDate || status === 'APPROVED') return ''
  const days = Math.ceil((new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  if (days < 0) return 'text-destructive font-medium'
  if (days <= 2) return 'text-yellow-600'
  return ''
}

function getRowBorderColor(campaign: CampaignRow): string {
  if (campaign._overdueCount > 0) return 'border-l-2 border-l-red-500'
  if (campaign._pendingApprovalCount > 0) return 'border-l-2 border-l-yellow-500'
  if (campaign.status === 'ACTIVE' && campaign._approvedCount === campaign.deliverables.length && campaign.deliverables.length > 0) {
    return 'border-l-2 border-l-green-500'
  }
  return ''
}

function CampaignTableRow({
  campaign,
  selected,
  onToggle,
}: {
  campaign: CampaignRow
  selected: boolean
  onToggle: () => void
}) {
  const router = useRouter()

  const nextDeadline = useMemo(() => {
    const pendingDates = campaign.deliverables
      .filter((d) => d.dueDate && d.status !== 'APPROVED' && d.status !== 'REJECTED')
      .map((d) => ({ date: d.dueDate!, status: d.status }))
      .sort((a, b) => a.date.localeCompare(b.date))
    return pendingDates[0] || null
  }, [campaign.deliverables])

  const approvedCount = campaign._approvedCount
  const totalDeliverables = campaign.deliverables.length
  const liveCount = campaign._liveCount
  const progressPct = totalDeliverables > 0 ? Math.round((approvedCount / totalDeliverables) * 100) : 0

  // Timeline
  const timelineLabel = useMemo(() => {
    if (!campaign.startDate) return '—'
    const start = new Date(campaign.startDate)
    const end = campaign.endDate ? new Date(campaign.endDate) : null
    const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const endStr = end ? end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'
    return `${startStr} – ${endStr}`
  }, [campaign.startDate, campaign.endDate])

  return (
    <TableRow
      className={cn('cursor-pointer', getRowBorderColor(campaign))}
      onClick={() => router.push(`/dashboard/campaigns/${campaign.id}`)}
    >
      <TableCell onClick={(e) => e.stopPropagation()}>
        <Checkbox checked={selected} onCheckedChange={() => onToggle()} />
      </TableCell>
      <TableCell>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium truncate">{campaign.name}</span>
            {campaign._platforms.map((p) => (
              <span key={p} className="text-[10px] text-muted-foreground font-medium">
                {PLATFORM_ICONS[p] || p}
              </span>
            ))}
          </div>
          <div className="text-xs text-muted-foreground truncate">
            {campaign.project.name} · {campaign.project.client.name}
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            {campaign.project.client.logoUrl && <AvatarImage src={campaign.project.client.logoUrl} />}
            <AvatarFallback className="text-[8px]">{getInitials(campaign.project.client.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <span className="text-xs truncate block">{campaign.project.client.name}</span>
            {campaign.project.client.industry && (
              <span className="text-[10px] text-muted-foreground">{campaign.project.client.industry}</span>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell>
        <StatusBadge status={campaign.status} type="campaign" />
      </TableCell>
      <TableCell>
        <span className="text-xs text-muted-foreground">{timelineLabel}</span>
      </TableCell>
      <TableCell>
        {nextDeadline ? (
          <span className={cn('text-xs', getDeadlineColor(nextDeadline.date, nextDeadline.status))}>
            {new Date(nextDeadline.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            {new Date(nextDeadline.date).getTime() < Date.now() && ' (overdue)'}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell>
        <div className="flex items-center -space-x-1">
          {campaign.creators.slice(0, 3).map((cc) => (
            <Avatar key={cc.id} className="h-6 w-6 border-2 border-background">
              {cc.creator.profilePictureUrl && <AvatarImage src={cc.creator.profilePictureUrl} />}
              <AvatarFallback className="text-[8px]">{getInitials(cc.creator.displayName)}</AvatarFallback>
            </Avatar>
          ))}
          {campaign.creators.length > 3 && (
            <span className="text-[10px] text-muted-foreground ml-2">+{campaign.creators.length - 3}</span>
          )}
          {campaign.creators.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
        </div>
      </TableCell>
      <TableCell>
        {totalDeliverables > 0 ? (
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full',
                    progressPct === 100 ? 'bg-green-500' : progressPct > 50 ? 'bg-blue-500' : 'bg-yellow-500'
                  )}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground">{approvedCount}/{totalDeliverables}</span>
            </div>
            {liveCount > 0 && (
              <span className="text-[10px] text-green-600">{liveCount} live</span>
            )}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell>
        {campaign.totalBudget ? (
          <span className="text-xs font-medium">{formatCurrency(campaign.totalBudget, campaign.currency)}</span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/dashboard/campaigns/${campaign.id}`}>
                <ExternalLink className="mr-2 h-3.5 w-3.5" />
                View Details
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Pencil className="mr-2 h-3.5 w-3.5" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Copy className="mr-2 h-3.5 w-3.5" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">
              <Archive className="mr-2 h-3.5 w-3.5" />
              Archive
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  )
}

function GroupHeader({ label, count, expanded, onToggle }: {
  label: string
  count: number
  expanded: boolean
  onToggle: () => void
}) {
  return (
    <TableRow className="bg-muted/50 hover:bg-muted/50">
      <TableCell colSpan={10}>
        <button onClick={onToggle} className="flex items-center gap-2 w-full text-left">
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          <span className="text-sm font-semibold">{label}</span>
          <Badge variant="secondary" className="text-xs">{count}</Badge>
        </button>
      </TableCell>
    </TableRow>
  )
}

export function CampaignsTableView({
  campaigns,
  groupedCampaigns,
  groupBy,
  selectedIds,
  onToggleSelection,
  onSelectAll,
  isAllSelected,
}: CampaignsTableViewProps) {
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())

  const toggleGroup = (key: string) => {
    setCollapsedGroups((prev: Set<string>) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40px]">
              <Checkbox
                checked={isAllSelected}
                onCheckedChange={() => {
                  if (isAllSelected) onToggleSelection('')
                  else onSelectAll()
                }}
              />
            </TableHead>
            <TableHead className="w-[240px]">Campaign</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Timeline</TableHead>
            <TableHead>Deadline</TableHead>
            <TableHead>Influencers</TableHead>
            <TableHead>Deliverables</TableHead>
            <TableHead>Budget</TableHead>
            <TableHead className="w-[50px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {groupedCampaigns ? (
            Array.from(groupedCampaigns.entries()).map(([key, groupCampaigns]) => (
              <GroupSection
                key={key}
                groupKey={key}
                campaigns={groupCampaigns as CampaignRow[]}
                collapsed={collapsedGroups.has(key)}
                onToggle={() => toggleGroup(key)}
                selectedIds={selectedIds}
                onToggleSelection={onToggleSelection}
              />
            ))
          ) : (
            campaigns.map((c) => (
              <CampaignTableRow
                key={c.id}
                campaign={c}
                selected={selectedIds.has(c.id)}
                onToggle={() => onToggleSelection(c.id)}
              />
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}

function GroupSection({
  groupKey,
  campaigns,
  collapsed,
  onToggle,
  selectedIds,
  onToggleSelection,
}: {
  groupKey: string
  campaigns: CampaignRow[]
  collapsed: boolean
  onToggle: () => void
  selectedIds: Set<string>
  onToggleSelection: (id: string) => void
}) {
  return (
    <>
      <GroupHeader
        label={groupKey}
        count={campaigns.length}
        expanded={!collapsed}
        onToggle={onToggle}
      />
      {!collapsed && campaigns.map((c) => (
        <CampaignTableRow
          key={c.id}
          campaign={c}
          selected={selectedIds.has(c.id)}
          onToggle={() => onToggleSelection(c.id)}
        />
      ))}
    </>
  )
}

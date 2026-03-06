"use client"

import { useMemo, useState } from 'react'
import { Users, Package, CheckCircle, Eye, TrendingUp, AlertTriangle, Clock } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { RichTextContent } from '@/components/ui/rich-text-editor'
import { StatsCard } from '@/components/ui/stats-card'
import { cn } from '@/lib/utils'
import type { Campaign, ActivityLog } from '../types'

interface OverviewTabProps {
  campaign: Campaign
  onTabChange: (tab: string) => void
}

function formatNumber(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function formatCurrency(amount: number, currency: string | null) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency || 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

function timeAgo(dateStr: string) {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getInitials(name: string | null | undefined) {
  if (!name) return '?'
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

function KPIBar({ label, current, target, unit }: { label: string; current: number; target: number; unit?: string }) {
  const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0
  const hit = pct >= 100
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">
          {formatNumber(current)}{unit} / {formatNumber(target)}{unit}
          <span className={cn('ml-2', hit ? 'text-green-600' : pct >= 60 ? 'text-yellow-600' : 'text-muted-foreground')}>
            {hit ? '✅ Hit' : `${pct}%`}
          </span>
        </span>
      </div>
      <div className="w-full bg-muted rounded-full h-2">
        <div
          className={cn('h-2 rounded-full transition-all', hit ? 'bg-green-500' : pct >= 60 ? 'bg-yellow-500' : 'bg-blue-500')}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export function OverviewTab({ campaign, onTabChange }: OverviewTabProps) {
  const [briefExpanded, setBriefExpanded] = useState(false)

  // Stats
  const stats = useMemo(() => {
    const totalInfluencers = campaign.creators.filter((c) => c.status !== 'REMOVED' && c.status !== 'DECLINED').length
    const totalDeliverables = campaign.deliverables.length
    const approvedDeliverables = campaign.deliverables.filter((d) => d.status === 'APPROVED').length
    const liveDeliverables = campaign.deliverables.filter(
      (d) => d.trackingRecord && d.trackingRecord.urls.length > 0
    ).length
    const pendingDeliverables = campaign.deliverables.filter((d) => d.status === 'PENDING').length

    return { totalInfluencers, totalDeliverables, approvedDeliverables, liveDeliverables, pendingDeliverables }
  }, [campaign])

  // Deadline alerts
  const alerts = useMemo(() => {
    const items: { message: string; action: string; tab: string }[] = []
    const pendingSubmissions = campaign.deliverables.filter((d) => d.status === 'PENDING')
    if (pendingSubmissions.length > 0 && campaign.endDate) {
      const daysLeft = Math.ceil((new Date(campaign.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      if (daysLeft <= 7) {
        items.push({
          message: `${pendingSubmissions.length} deliverable(s) pending — ${daysLeft <= 0 ? 'OVERDUE' : `${daysLeft} days left`}`,
          action: 'View',
          tab: 'influencers',
        })
      }
    }
    const pendingApprovals = campaign.deliverables.filter(
      (d) => d.status === 'SUBMITTED' || d.status === 'INTERNAL_REVIEW' || d.status === 'CLIENT_REVIEW'
    )
    if (pendingApprovals.length > 0) {
      items.push({
        message: `${pendingApprovals.length} deliverable(s) awaiting approval`,
        action: 'Review',
        tab: 'approvals',
      })
    }
    const unpaid = campaign.creators.filter(
      (c) => c.status === 'ACCEPTED' && c.rateAmount && c.rateAmount > 0
    )
    if (unpaid.length > 0) {
      items.push({
        message: `${unpaid.length} influencer fee(s) to process`,
        action: 'View',
        tab: 'finance',
      })
    }
    return items
  }, [campaign])

  // Activity
  const activities = (campaign.activityLogs || []).slice(0, 10)

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatsCard title="Influencers" value={stats.totalInfluencers} icon={Users} />
        <StatsCard
          title="Deliverables"
          value={`${stats.approvedDeliverables}/${stats.totalDeliverables}`}
          icon={Package}
        />
        <StatsCard title="Approved" value={stats.approvedDeliverables} icon={CheckCircle} />
        <StatsCard title="Live" value={stats.liveDeliverables} icon={Eye} />
        <StatsCard title="Avg ER%" value="—" icon={TrendingUp} />
      </div>

      {/* KPI Progress */}
      {campaign.totalBudget && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <h3 className="text-sm font-semibold">KPI Progress</h3>
            <p className="text-xs text-muted-foreground">
              Campaign performance metrics will appear here once content goes live and analytics are tracked.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Deadline Alerts */}
      {alerts.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50/50">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <h3 className="text-sm font-semibold text-yellow-800">Alerts</h3>
            </div>
            {alerts.map((alert, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm">
                <span className="text-yellow-800">{alert.message}</span>
                <Button variant="outline" size="sm" className="h-6 text-xs" onClick={() => onTabChange(alert.tab)}>
                  {alert.action}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Campaign Brief */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <h3 className="text-sm font-semibold">Campaign Brief</h3>
          {campaign.description && (
            <p className="text-sm text-muted-foreground">{campaign.description}</p>
          )}
          {campaign.brief ? (
            <div className={cn('overflow-hidden transition-all', !briefExpanded && 'max-h-40')}>
              <RichTextContent content={campaign.brief} />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No brief provided yet.</p>
          )}
          {campaign.brief && (
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => setBriefExpanded(!briefExpanded)}>
              {briefExpanded ? 'Show Less' : 'Show More'}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <h3 className="text-sm font-semibold">Recent Activity</h3>
          {activities.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity yet.</p>
          ) : (
            <div className="space-y-3">
              {activities.map((log) => (
                <div key={log.id} className="flex items-start gap-3">
                  <Avatar className="h-6 w-6 mt-0.5">
                    <AvatarFallback className="text-[9px]">{getInitials(log.actor?.name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs">
                      <span className="font-medium">{log.actor?.name || 'System'}</span>
                      {' '}
                      <span className="text-muted-foreground">{log.action}</span>
                    </p>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock className="h-2.5 w-2.5" />
                      {timeAgo(log.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

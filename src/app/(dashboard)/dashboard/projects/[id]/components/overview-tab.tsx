"use client"

import {
  TrendingUp,
  Activity,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { StatusBadge } from '@/components/ui/status-badge'
import { cn } from '@/lib/utils'
import type { Project, ActivityLog } from '../types'

interface OverviewTabProps {
  project: Project
  activityFeed: ActivityLog[]
}

function formatMoney(amount: number | null, currency: string | null) {
  if (amount === null || amount === undefined) return '—'
  const cur = currency || 'USD'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(amount)
}

function formatNumber(n: number | null) {
  if (n === null || n === undefined) return '—'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

function getInitials(name: string | null | undefined) {
  if (!name) return '?'
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

function timeAgo(dateString: string) {
  const now = Date.now()
  const then = new Date(dateString).getTime()
  const diff = Math.floor((now - then) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getActionColors(action: string) {
  const colors: Record<string, string> = {
    created: 'bg-green-100 text-green-600',
    updated: 'bg-blue-100 text-blue-600',
    deleted: 'bg-red-100 text-red-600',
    status_changed: 'bg-yellow-100 text-yellow-600',
    archived: 'bg-gray-100 text-gray-600',
  }
  return colors[action] || 'bg-gray-100 text-gray-600'
}

export function OverviewTab({ project, activityFeed }: OverviewTabProps) {
  const budgetLines = [
    { label: 'Influencer Budget', value: project.influencerBudget },
    { label: 'Agency Fee', value: project.agencyFeeType === 'percentage' && project.agencyFee && project.influencerBudget
      ? (project.agencyFee / 100) * project.influencerBudget
      : project.agencyFee },
    { label: 'Production', value: project.productionBudget },
    { label: 'Boosting', value: project.boostingBudget },
    { label: 'Contingency', value: project.contingency },
  ]

  const totalBudget = budgetLines.reduce((sum, line) => sum + (line.value || 0), 0)

  const kpiCards = [
    { label: 'Target Reach', value: formatNumber(project.targetReach), icon: TrendingUp },
    { label: 'Target Impressions', value: formatNumber(project.targetImpressions), icon: TrendingUp },
    { label: 'Target ER%', value: project.targetEngagementRate ? `${project.targetEngagementRate}%` : '—', icon: TrendingUp },
    { label: 'Target Conversions', value: formatNumber(project.targetConversions), icon: TrendingUp },
  ]

  // Campaign status counts
  const statusCounts: Record<string, number> = {}
  for (const c of project.campaigns) {
    statusCounts[c.status] = (statusCounts[c.status] || 0) + 1
  }

  return (
    <div className="space-y-6">
      {/* Budget Summary */}
      {totalBudget > 0 && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">Budget Summary</h3>
              <span className="text-sm font-semibold">{formatMoney(totalBudget, project.currency)}</span>
            </div>
            <div className="space-y-3">
              {budgetLines.map((line) => {
                if (!line.value) return null
                const pct = totalBudget > 0 ? (line.value / totalBudget) * 100 : 0
                return (
                  <div key={line.label} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{line.label}</span>
                      <span className="font-medium">{formatMoney(line.value, project.currency)}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary/60 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI Targets */}
      {(project.targetReach || project.targetImpressions || project.targetEngagementRate || project.targetConversions) && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {kpiCards.map((kpi) => (
            <Card key={kpi.label}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <kpi.icon className="h-4 w-4" />
                  <p className="text-xs font-medium uppercase tracking-wide">{kpi.label}</p>
                </div>
                <p className="text-2xl font-semibold">{kpi.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Campaign Progress */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-sm font-semibold mb-3">
            Campaigns ({project.campaigns.length})
          </h3>
          {project.campaigns.length === 0 ? (
            <p className="text-sm text-muted-foreground">No campaigns yet</p>
          ) : (
            <div className="space-y-2">
              {project.campaigns.slice(0, 5).map((c) => {
                const completedDeliverables = c.deliverables.filter((d) => d.status === 'approved').length
                return (
                  <div key={c.id} className="flex items-center justify-between py-1">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        'h-2 w-2 rounded-full',
                        c.status === 'active' ? 'bg-green-500' :
                        c.status === 'draft' ? 'bg-gray-400' :
                        c.status === 'completed' ? 'bg-blue-500' :
                        'bg-yellow-500'
                      )} />
                      <span className="text-sm">{c.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {completedDeliverables}/{c.deliverables.length} deliverables
                      </span>
                      <StatusBadge status={c.status} type="campaign" />
                    </div>
                  </div>
                )
              })}
              {project.campaigns.length > 5 && (
                <p className="text-xs text-muted-foreground">+{project.campaigns.length - 5} more</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Activity Feed */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Recent Activity</h3>
          </div>
          {activityFeed.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity yet</p>
          ) : (
            <div className="space-y-3">
              {activityFeed.map((log) => (
                <div key={log.id} className="flex items-start gap-3">
                  <div className={cn('mt-0.5 h-6 w-6 rounded-full flex items-center justify-center shrink-0', getActionColors(log.action))}>
                    <Activity className="h-3 w-3" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="font-medium capitalize">{log.action.replace(/_/g, ' ')}</span>
                      <span className="text-muted-foreground"> {log.entityType}</span>
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Avatar className="h-4 w-4">
                        <AvatarFallback className="text-[8px]">
                          {getInitials(log.actor?.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-muted-foreground">
                        {log.actor?.name || 'System'} · {timeAgo(log.createdAt)}
                      </span>
                    </div>
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

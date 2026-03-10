"use client"

import { useCallback, useEffect, useState } from 'react'
import {
  TrendingUp,
  Activity,
  DollarSign,
} from 'lucide-react'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { StatusBadge } from '@/components/ui/status-badge'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/currency'
import { graphqlRequest, queries } from '@/lib/graphql/client'
import type { Project, ActivityLog, ProjectBudgetAllocation } from '../types'

interface OverviewTabProps {
  project: Project
  activityFeed: ActivityLog[]
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

const PIE_COLORS = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#6b7280']
const CAMPAIGN_COLORS = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#ec4899', '#14b8a6', '#f97316']

export function OverviewTab({ project, activityFeed }: OverviewTabProps) {
  const [allocation, setAllocation] = useState<ProjectBudgetAllocation | null>(null)

  const fetchAllocation = useCallback(async () => {
    try {
      const res = await graphqlRequest<{ projectBudgetAllocation: ProjectBudgetAllocation }>(
        queries.projectBudgetAllocation,
        { projectId: project.id }
      )
      setAllocation(res.projectBudgetAllocation)
    } catch {
      // Non-critical
    }
  }, [project.id])

  useEffect(() => {
    fetchAllocation()
  }, [fetchAllocation])

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
  const currency = project.currency || 'USD'
  const pieData = budgetLines.filter((l) => l.value && l.value > 0).map((l) => ({ name: l.label, value: l.value! }))

  // Build allocation bar segments (iPhone Storage style)
  const allocationSegments: { label: string; value: number; color: string }[] = []
  if (allocation && allocation.campaigns.length > 0) {
    const included = allocation.campaigns.filter((c) => c.includedInAllocation)
    included.forEach((c, i) => {
      allocationSegments.push({
        label: c.campaignName,
        value: c.convertedAmount,
        color: CAMPAIGN_COLORS[i % CAMPAIGN_COLORS.length],
      })
    })
    if (allocation.hasBudget && allocation.unallocated > 0) {
      allocationSegments.push({
        label: 'Unallocated',
        value: allocation.unallocated,
        color: '#e5e7eb',
      })
    }
  }

  const allocationTotal = allocationSegments.reduce((s, seg) => s + seg.value, 0)

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
      {/* Budget Summary — Pie Chart + Allocation Bar */}
      {totalBudget > 0 && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">Budget Summary</h3>
              </div>
              <span className="text-sm font-semibold">{formatCurrency(totalBudget, currency)}</span>
            </div>

            {/* Pie chart + legend */}
            <div className="flex items-center gap-6">
              <div className="w-[140px] h-[140px] shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      cx="50%"
                      cy="50%"
                      innerRadius={35}
                      outerRadius={65}
                      strokeWidth={2}
                      stroke="hsl(var(--background))"
                    >
                      {pieData.map((_, idx) => (
                        <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => formatCurrency(value as number, currency)}
                      contentStyle={{ fontSize: '12px', borderRadius: '8px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-2">
                {budgetLines.map((line, idx) => {
                  if (!line.value) return null
                  return (
                    <div key={line.label} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: PIE_COLORS[idx] }} />
                        <span className="text-muted-foreground">{line.label}</span>
                      </div>
                      <span className="font-medium">{formatCurrency(line.value, currency)}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Campaign Allocation — iPhone Storage-style bar */}
            {allocationSegments.length > 0 && allocationTotal > 0 && (
              <div className="mt-6 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground">Campaign Allocation</p>
                  {allocation?.hasBudget && allocation.utilizationPercent != null && (
                    <span className={cn(
                      'text-xs font-medium',
                      allocation.utilizationPercent > 100 ? 'text-destructive' :
                      allocation.utilizationPercent >= 80 ? 'text-yellow-600' : 'text-muted-foreground'
                    )}>
                      {allocation.utilizationPercent}% used
                    </span>
                  )}
                </div>
                {/* Segmented bar */}
                <div className="h-5 w-full rounded-lg overflow-hidden flex bg-muted">
                  {allocationSegments.map((seg, i) => {
                    const pct = (seg.value / allocationTotal) * 100
                    if (pct < 0.5) return null
                    return (
                      <div
                        key={i}
                        className="h-full transition-all relative group"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: seg.color,
                          borderRight: i < allocationSegments.length - 1 ? '1px solid hsl(var(--background))' : undefined,
                        }}
                      >
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block z-10">
                          <div className="bg-popover text-popover-foreground text-[10px] font-medium px-2 py-1 rounded-md shadow-md border whitespace-nowrap">
                            {seg.label}: {formatCurrency(seg.value, allocation?.projectCurrency || currency)}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
                {/* Legend */}
                <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                  {allocationSegments.map((seg, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-[11px]">
                      <div className="h-2 w-2 rounded-sm shrink-0" style={{ backgroundColor: seg.color }} />
                      <span className="text-muted-foreground">{seg.label}</span>
                      <span className="font-medium">{formatCurrency(seg.value, allocation?.projectCurrency || currency)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
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

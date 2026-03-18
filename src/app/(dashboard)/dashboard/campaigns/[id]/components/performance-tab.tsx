"use client"

import { useCallback } from 'react'
import {
  Activity,
  BarChart3,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  TrendingUp,
  FileCheck,
  RefreshCw,
} from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { graphqlRequest, queries } from '@/lib/graphql/client'
import { useGraphQLQuery } from '@/hooks/use-graphql-query'
import { useAnalyticsFetch } from '@/hooks/use-analytics-fetch'

interface UrlMetricsSnapshot {
  views: number | null
  likes: number | null
  comments: number | null
  shares: number | null
  saves: number | null
  calculatedMetrics: { engagement_rate?: number; [key: string]: unknown } | null
  snapshotAt: string
}

interface UrlAnalyticsData {
  trackingUrlId: string
  url: string
  platform: string
  latestMetrics: UrlMetricsSnapshot | null
}

interface DeliverableAnalyticsData {
  deliverableId: string
  deliverableTitle: string
  creatorName: string | null
  urls: UrlAnalyticsData[]
  totalViews: number | null
  totalLikes: number | null
  totalComments: number | null
  totalShares: number | null
  totalSaves: number | null
  avgEngagementRate: number | null
  lastFetchedAt: string | null
}

interface AnalyticsDashboard {
  campaignId: string
  campaignName: string
  totalDeliverablesTracked: number
  totalUrlsTracked: number
  totalViews: number | null
  totalLikes: number | null
  totalComments: number | null
  totalShares: number | null
  totalSaves: number | null
  weightedEngagementRate: number | null
  avgEngagementRate: number | null
  avgSaveRate: number | null
  avgViralityIndex: number | null
  totalCreatorCost: number | null
  costCurrency: string | null
  cpv: number | null
  cpe: number | null
  viewsDelta: number | null
  likesDelta: number | null
  engagementRateDelta: number | null
  platformBreakdown: unknown
  creatorBreakdown: unknown
  deliverables: DeliverableAnalyticsData[]
  lastRefreshedAt: string | null
  snapshotCount: number
  latestJob: {
    id: string
    status: string
    totalUrls: number
    completedUrls: number
    failedUrls: number
    errorMessage: string | null
    createdAt: string
    completedAt: string | null
  } | null
}

const formatMetric = (value: number | null | undefined): string => {
  if (value == null) return '\u2014'
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return value.toLocaleString()
}

const formatPercent = (value: number | null | undefined): string => {
  if (value == null) return '\u2014'
  return `${(value * 100).toFixed(2)}%`
}

const formatDelta = (value: number | null | undefined): string | null => {
  if (value == null || value === 0) return null
  const prefix = value > 0 ? '+' : ''
  if (Math.abs(value) >= 1_000_000) return `${prefix}${(value / 1_000_000).toFixed(1)}M`
  if (Math.abs(value) >= 1_000) return `${prefix}${(value / 1_000).toFixed(1)}K`
  return `${prefix}${value.toLocaleString()}`
}

interface PerformanceTabProps {
  campaignId: string
}

export function PerformanceTab({ campaignId }: PerformanceTabProps) {
  const { toast } = useToast()

  const { data: analyticsData, refetch } = useGraphQLQuery<{
    campaignAnalyticsDashboard: AnalyticsDashboard | null
  }>(
    ['campaignAnalytics', campaignId],
    queries.campaignAnalyticsDashboard,
    { campaignId },
    { enabled: !!campaignId }
  )

  const analyticsDashboard = analyticsData?.campaignAnalyticsDashboard ?? null

  const {
    triggerRefresh: triggerAnalyticsRefresh,
    activeJob: analyticsJob,
    isRunning: analyticsRefreshing,
    progress: analyticsProgress,
  } = useAnalyticsFetch(campaignId, {
    onComplete: async () => {
      await refetch()
      toast({ title: 'Analytics updated', description: 'Campaign performance data has been refreshed.' })
    },
    onError: (error) => {
      toast({ title: 'Analytics refresh failed', description: error, variant: 'destructive' })
    },
  })

  const handleRefreshAnalytics = useCallback(async () => {
    try {
      await triggerAnalyticsRefresh()
      toast({ title: 'Analytics refresh started', description: 'Fetching latest metrics for all tracked deliverables...' })
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to start analytics refresh',
        variant: 'destructive',
      })
    }
  }, [triggerAnalyticsRefresh, toast])

  return (
    <Card>
      <CardContent className="p-6">
        {/* Header with refresh button */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Campaign Performance</h2>
            {analyticsDashboard?.lastRefreshedAt && (
              <span className="text-xs text-muted-foreground ml-2">
                Last updated {new Date(analyticsDashboard.lastRefreshedAt).toLocaleDateString()}
              </span>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            loading={analyticsRefreshing}
            onClick={handleRefreshAnalytics}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh Analytics
          </Button>
        </div>

        {/* Job progress bar */}
        {analyticsRefreshing && (
          <div className="mb-6 rounded-lg border bg-blue-50 dark:bg-blue-950/20 p-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="font-medium text-blue-700 dark:text-blue-300">
                {analyticsJob ? 'Fetching analytics...' : 'Starting analytics fetch...'}
              </span>
              {analyticsJob && (
                <span className="text-blue-600 dark:text-blue-400">
                  {analyticsJob.completedUrls + analyticsJob.failedUrls}/{analyticsJob.totalUrls} URLs processed
                </span>
              )}
            </div>
            <div className="h-2 w-full rounded-full bg-blue-100 dark:bg-blue-900">
              <div
                className="h-full rounded-full bg-blue-600 transition-all duration-500"
                style={{ width: `${analyticsProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Empty state */}
        {!analyticsDashboard?.snapshotCount && !analyticsRefreshing && (
          <p className="text-sm text-muted-foreground mb-6">
            No analytics data yet. Click &quot;Refresh Analytics&quot; to fetch metrics for tracked deliverables.
          </p>
        )}

        {/* Summary metrics grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Eye className="h-4 w-4" />
              Views
            </div>
            <p className="text-2xl font-semibold tabular-nums">
              {formatMetric(analyticsDashboard?.totalViews)}
            </p>
            {formatDelta(analyticsDashboard?.viewsDelta) && (
              <span className={`text-xs font-medium ${(analyticsDashboard?.viewsDelta ?? 0) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatDelta(analyticsDashboard?.viewsDelta)} since last fetch
              </span>
            )}
          </div>
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Heart className="h-4 w-4" />
              Likes
            </div>
            <p className="text-2xl font-semibold tabular-nums">
              {formatMetric(analyticsDashboard?.totalLikes)}
            </p>
            {formatDelta(analyticsDashboard?.likesDelta) && (
              <span className={`text-xs font-medium ${(analyticsDashboard?.likesDelta ?? 0) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatDelta(analyticsDashboard?.likesDelta)} since last fetch
              </span>
            )}
          </div>
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <MessageCircle className="h-4 w-4" />
              Comments
            </div>
            <p className="text-2xl font-semibold tabular-nums">
              {formatMetric(analyticsDashboard?.totalComments)}
            </p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Share2 className="h-4 w-4" />
              Shares
            </div>
            <p className="text-2xl font-semibold tabular-nums">
              {formatMetric(analyticsDashboard?.totalShares)}
            </p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Bookmark className="h-4 w-4" />
              Saves
            </div>
            <p className="text-2xl font-semibold tabular-nums">
              {formatMetric(analyticsDashboard?.totalSaves)}
            </p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <TrendingUp className="h-4 w-4" />
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger className="cursor-help underline decoration-dotted underline-offset-4">Engagement Rate</TooltipTrigger>
                  <TooltipContent><p>(Likes + Comments + Shares) / Views</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <p className="text-2xl font-semibold tabular-nums">
              {formatPercent(analyticsDashboard?.avgEngagementRate)}
            </p>
            {analyticsDashboard?.engagementRateDelta != null && analyticsDashboard.engagementRateDelta !== 0 && (
              <span className={`text-xs font-medium ${analyticsDashboard.engagementRateDelta > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {analyticsDashboard.engagementRateDelta > 0 ? '+' : ''}{(analyticsDashboard.engagementRateDelta * 100).toFixed(2)}%
              </span>
            )}
          </div>
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <FileCheck className="h-4 w-4" />
              Deliverables Tracked
            </div>
            <p className="text-2xl font-semibold tabular-nums">
              {analyticsDashboard?.totalDeliverablesTracked ?? '\u2014'}
            </p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Activity className="h-4 w-4" />
              Snapshots
            </div>
            <p className="text-2xl font-semibold tabular-nums">
              {analyticsDashboard?.snapshotCount ?? '\u2014'}
            </p>
          </div>
        </div>

        {/* Per-deliverable breakdown */}
        {analyticsDashboard?.deliverables && analyticsDashboard.deliverables.length > 0 && (
          <div className="mt-8">
            <h3 className="text-sm font-semibold text-muted-foreground mb-4">Per-URL Breakdown</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">URL</th>
                    <th className="pb-2 pr-4 font-medium">Deliverable</th>
                    <th className="pb-2 pr-4 font-medium">Platform</th>
                    <th className="pb-2 pr-4 font-medium text-right">Views</th>
                    <th className="pb-2 pr-4 font-medium text-right">Likes</th>
                    <th className="pb-2 pr-4 font-medium text-right">Comments</th>
                    <th className="pb-2 pr-4 font-medium text-right">Shares</th>
                    <th className="pb-2 pr-4 font-medium text-right">Saves</th>
                    <th className="pb-2 font-medium text-right">Eng. Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {analyticsDashboard.deliverables.flatMap((d) =>
                    (d.urls || []).map((u) => (
                      <tr key={u.trackingUrlId} className="border-b last:border-0">
                        <td className="py-3 pr-4 max-w-[250px]">
                          <a
                            href={u.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline truncate block"
                            title={u.url}
                          >
                            {u.url.replace(/^https?:\/\/(www\.)?/, '').slice(0, 45)}{u.url.replace(/^https?:\/\/(www\.)?/, '').length > 45 ? '...' : ''}
                          </a>
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground">{d.deliverableTitle}</td>
                        <td className="py-3 pr-4">
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-muted capitalize">
                            {u.platform}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-right tabular-nums">{formatMetric(u.latestMetrics?.views)}</td>
                        <td className="py-3 pr-4 text-right tabular-nums">{formatMetric(u.latestMetrics?.likes)}</td>
                        <td className="py-3 pr-4 text-right tabular-nums">{formatMetric(u.latestMetrics?.comments)}</td>
                        <td className="py-3 pr-4 text-right tabular-nums">{formatMetric(u.latestMetrics?.shares)}</td>
                        <td className="py-3 pr-4 text-right tabular-nums">{formatMetric(u.latestMetrics?.saves)}</td>
                        <td className="py-3 text-right tabular-nums">
                          {formatPercent(u.latestMetrics?.calculatedMetrics?.engagement_rate ?? null)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

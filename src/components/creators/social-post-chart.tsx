"use client"

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import { Card, CardContent } from '@/components/ui/card'

interface PostData {
  likesCount?: number | null
  commentsCount?: number | null
  viewsCount?: number | null
  publishedAt?: string | null
  caption?: string | null
  platformPostId?: string
}

interface SocialPostChartProps {
  posts: PostData[]
  metric: 'likesCount' | 'commentsCount' | 'viewsCount'
  chartType?: 'bar' | 'line' | 'area'
  title: string
  color: string
}

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatNumber(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return value.toString()
}

export function SocialPostChart({
  posts,
  metric,
  chartType = 'bar',
  title,
  color,
}: SocialPostChartProps) {
  // Sort posts by date ascending for chart display
  const chartData = [...posts]
    .sort((a, b) => {
      const dateA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0
      const dateB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0
      return dateA - dateB
    })
    .map((post, i) => ({
      name: formatDate(post.publishedAt) || `Post ${i + 1}`,
      value: (post[metric] as number) || 0,
    }))

  if (chartData.length === 0) {
    return (
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">{title}</h3>
          <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
            No data available
          </div>
        </CardContent>
      </Card>
    )
  }

  const renderChart = () => {
    const commonProps = {
      data: chartData,
      margin: { top: 5, right: 5, left: -15, bottom: 5 },
    }

    const xAxisProps = {
      dataKey: 'name' as const,
      tick: { fontSize: 11, fill: '#888' },
      tickLine: false,
      axisLine: false,
    }

    const yAxisProps = {
      tick: { fontSize: 11, fill: '#888' },
      tickLine: false,
      axisLine: false,
      tickFormatter: formatNumber,
    }

    const tooltipProps = {
      contentStyle: {
        backgroundColor: '#1a1a2e',
        border: 'none',
        borderRadius: '8px',
        fontSize: '12px',
        color: '#fff',
      },
      formatter: (value: number | undefined) => [formatNumber(value ?? 0), title],
    }

    switch (chartType) {
      case 'line':
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb20" />
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            <Tooltip {...tooltipProps} />
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              dot={{ r: 3, fill: color }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        )
      case 'area':
        return (
          <AreaChart {...commonProps}>
            <defs>
              <linearGradient id={`gradient-${metric}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb20" />
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            <Tooltip {...tooltipProps} />
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              fill={`url(#gradient-${metric})`}
            />
          </AreaChart>
        )
      default:
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb20" />
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            <Tooltip {...tooltipProps} />
            <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} />
          </BarChart>
        )
    }
  }

  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="text-sm font-medium text-muted-foreground mb-3">{title}</h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            {renderChart()}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

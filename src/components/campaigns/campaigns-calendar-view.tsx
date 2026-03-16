"use client"

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Users,
  FileCheck,
  Clock,
  ExternalLink,
  AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

interface CalendarCampaign {
  id: string
  name: string
  status: string
  startDate: string | null
  endDate: string | null
  project: {
    client: { name: string }
  }
  _overdueCount: number
  _approvedCount: number
  deliverables: { id: string; dueDate: string | null }[]
}

interface CampaignsCalendarViewProps {
  campaigns: CalendarCampaign[]
}

// 12 visually distinct, vibrant colors for campaigns
const CAMPAIGN_COLORS = [
  { bg: 'bg-blue-500', bgLight: 'bg-blue-100 dark:bg-blue-950', text: 'text-blue-700 dark:text-blue-300', dot: 'bg-blue-500', border: 'border-blue-300 dark:border-blue-800' },
  { bg: 'bg-emerald-500', bgLight: 'bg-emerald-100 dark:bg-emerald-950', text: 'text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500', border: 'border-emerald-300 dark:border-emerald-800' },
  { bg: 'bg-violet-500', bgLight: 'bg-violet-100 dark:bg-violet-950', text: 'text-violet-700 dark:text-violet-300', dot: 'bg-violet-500', border: 'border-violet-300 dark:border-violet-800' },
  { bg: 'bg-amber-500', bgLight: 'bg-amber-100 dark:bg-amber-950', text: 'text-amber-700 dark:text-amber-300', dot: 'bg-amber-500', border: 'border-amber-300 dark:border-amber-800' },
  { bg: 'bg-rose-500', bgLight: 'bg-rose-100 dark:bg-rose-950', text: 'text-rose-700 dark:text-rose-300', dot: 'bg-rose-500', border: 'border-rose-300 dark:border-rose-800' },
  { bg: 'bg-cyan-500', bgLight: 'bg-cyan-100 dark:bg-cyan-950', text: 'text-cyan-700 dark:text-cyan-300', dot: 'bg-cyan-500', border: 'border-cyan-300 dark:border-cyan-800' },
  { bg: 'bg-orange-500', bgLight: 'bg-orange-100 dark:bg-orange-950', text: 'text-orange-700 dark:text-orange-300', dot: 'bg-orange-500', border: 'border-orange-300 dark:border-orange-800' },
  { bg: 'bg-indigo-500', bgLight: 'bg-indigo-100 dark:bg-indigo-950', text: 'text-indigo-700 dark:text-indigo-300', dot: 'bg-indigo-500', border: 'border-indigo-300 dark:border-indigo-800' },
  { bg: 'bg-pink-500', bgLight: 'bg-pink-100 dark:bg-pink-950', text: 'text-pink-700 dark:text-pink-300', dot: 'bg-pink-500', border: 'border-pink-300 dark:border-pink-800' },
  { bg: 'bg-teal-500', bgLight: 'bg-teal-100 dark:bg-teal-950', text: 'text-teal-700 dark:text-teal-300', dot: 'bg-teal-500', border: 'border-teal-300 dark:border-teal-800' },
  { bg: 'bg-lime-500', bgLight: 'bg-lime-100 dark:bg-lime-950', text: 'text-lime-700 dark:text-lime-300', dot: 'bg-lime-500', border: 'border-lime-300 dark:border-lime-800' },
  { bg: 'bg-fuchsia-500', bgLight: 'bg-fuchsia-100 dark:bg-fuchsia-950', text: 'text-fuchsia-700 dark:text-fuchsia-300', dot: 'bg-fuchsia-500', border: 'border-fuchsia-300 dark:border-fuchsia-800' },
]

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  ACTIVE: 'Active',
  IN_REVIEW: 'In Review',
  APPROVED: 'Approved',
  COMPLETED: 'Completed',
  ARCHIVED: 'Archived',
}

const STATUS_BADGE_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  ACTIVE: 'bg-green-100 text-green-700',
  IN_REVIEW: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-purple-100 text-purple-700',
  ARCHIVED: 'bg-gray-100 text-gray-500',
}

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  const day = new Date(year, month, 1).getDay()
  return day === 0 ? 6 : day - 1
}

function formatDateRange(startDate: string | null, endDate: string | null) {
  if (!startDate) return 'No dates set'
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  if (!endDate) return fmt(startDate)
  return `${fmt(startDate)} – ${fmt(endDate)}`
}

function isCampaignOnDay(campaign: CalendarCampaign, day: number, month: number, year: number): boolean {
  if (!campaign.startDate) return false
  const start = new Date(campaign.startDate)
  const end = campaign.endDate ? new Date(campaign.endDate) : start
  const cellDate = new Date(year, month, day)
  return cellDate >= new Date(start.getFullYear(), start.getMonth(), start.getDate()) &&
         cellDate <= new Date(end.getFullYear(), end.getMonth(), end.getDate())
}

function getCampaignBarPosition(
  campaign: CalendarCampaign,
  day: number,
  month: number,
  year: number
): 'start' | 'end' | 'middle' | 'single' {
  if (!campaign.startDate) return 'single'
  const start = new Date(campaign.startDate)
  const end = campaign.endDate ? new Date(campaign.endDate) : start
  const isStart = start.getDate() === day && start.getMonth() === month && start.getFullYear() === year
  const isEnd = end.getDate() === day && end.getMonth() === month && end.getFullYear() === year
  if (isStart && isEnd) return 'single'
  if (isStart) return 'start'
  if (isEnd) return 'end'
  // Check if it's the first day of the month but campaign started earlier
  if (day === 1 && start < new Date(year, month, 1)) return 'start'
  return 'middle'
}

// Campaign detail popover content
function CampaignPopover({ campaign, color, onNavigate }: {
  campaign: CalendarCampaign
  color: typeof CAMPAIGN_COLORS[0]
  onNavigate: () => void
}) {
  const totalDeliverables = campaign.deliverables.length
  const upcomingDeadlines = campaign.deliverables.filter(
    (d) => d.dueDate && new Date(d.dueDate).getTime() > Date.now()
  ).length

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className={cn('h-3 w-3 rounded-full mt-1.5 shrink-0', color.dot)} />
        <div className="min-w-0 flex-1">
          <h4 className="font-semibold text-sm leading-tight">{campaign.name}</h4>
          <p className="text-xs text-muted-foreground mt-0.5">{campaign.project.client.name}</p>
        </div>
      </div>

      {/* Status + dates */}
      <div className="flex items-center gap-2">
        <Badge className={cn('text-[10px] font-medium', STATUS_BADGE_COLORS[campaign.status] || 'bg-gray-100')}>
          {STATUS_LABELS[campaign.status] || campaign.status}
        </Badge>
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {formatDateRange(campaign.startDate, campaign.endDate)}
        </span>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-md bg-muted/50 p-2 text-center">
          <div className="text-sm font-semibold">{totalDeliverables}</div>
          <div className="text-[10px] text-muted-foreground">Deliverables</div>
        </div>
        <div className="rounded-md bg-muted/50 p-2 text-center">
          <div className="text-sm font-semibold text-green-600">{campaign._approvedCount}</div>
          <div className="text-[10px] text-muted-foreground">Approved</div>
        </div>
        <div className="rounded-md bg-muted/50 p-2 text-center">
          <div className={cn('text-sm font-semibold', campaign._overdueCount > 0 ? 'text-red-600' : '')}>
            {campaign._overdueCount}
          </div>
          <div className="text-[10px] text-muted-foreground">Overdue</div>
        </div>
      </div>

      {/* Overdue warning */}
      {campaign._overdueCount > 0 && (
        <div className="flex items-center gap-2 rounded-md bg-red-50 dark:bg-red-950/30 px-3 py-2 text-xs text-red-700 dark:text-red-400">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          {campaign._overdueCount} overdue deliverable{campaign._overdueCount > 1 ? 's' : ''}
        </div>
      )}

      {/* Upcoming deadlines */}
      {upcomingDeadlines > 0 && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <FileCheck className="h-3 w-3" />
          {upcomingDeadlines} upcoming deadline{upcomingDeadlines > 1 ? 's' : ''}
        </p>
      )}

      {/* Action */}
      <Button size="sm" className="w-full h-8 text-xs" onClick={onNavigate}>
        <ExternalLink className="mr-1.5 h-3 w-3" />
        View Campaign
      </Button>
    </div>
  )
}

export function CampaignsCalendarView({ campaigns }: CampaignsCalendarViewProps) {
  const router = useRouter()
  const today = new Date()
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [currentYear, setCurrentYear] = useState(today.getFullYear())

  const daysInMonth = getDaysInMonth(currentYear, currentMonth)
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth)
  const monthStart = new Date(currentYear, currentMonth, 1)
  const monthEnd = new Date(currentYear, currentMonth, daysInMonth, 23, 59, 59)

  // Assign stable colors to campaigns by id
  const campaignColorMap = useMemo(() => {
    const map = new Map<string, typeof CAMPAIGN_COLORS[0]>()
    campaigns.forEach((c, i) => {
      map.set(c.id, CAMPAIGN_COLORS[i % CAMPAIGN_COLORS.length])
    })
    return map
  }, [campaigns])

  // Campaigns active in this month
  const monthCampaigns = useMemo(() => {
    return campaigns.filter((c) => {
      if (!c.startDate) return false
      const start = new Date(c.startDate)
      const end = c.endDate ? new Date(c.endDate) : start
      return start <= monthEnd && end >= monthStart
    })
  }, [campaigns, monthStart, monthEnd])

  // Deadline markers for each day
  const deadlinesByDay = useMemo(() => {
    const map = new Map<number, { campaign: CalendarCampaign; count: number }[]>()
    for (const c of campaigns) {
      for (const d of c.deliverables) {
        if (!d.dueDate) continue
        const due = new Date(d.dueDate)
        if (due.getMonth() === currentMonth && due.getFullYear() === currentYear) {
          const day = due.getDate()
          const existing = map.get(day) || []
          const found = existing.find((e) => e.campaign.id === c.id)
          if (found) {
            found.count++
          } else {
            existing.push({ campaign: c, count: 1 })
          }
          map.set(day, existing)
        }
      }
    }
    return map
  }, [campaigns, currentMonth, currentYear])

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(currentYear - 1)
    } else {
      setCurrentMonth(currentMonth - 1)
    }
  }

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear(currentYear + 1)
    } else {
      setCurrentMonth(currentMonth + 1)
    }
  }

  const goToToday = () => {
    setCurrentMonth(today.getMonth())
    setCurrentYear(today.getFullYear())
  }

  // Build calendar grid
  const cells: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  const isCurrentMonthToday = currentMonth === today.getMonth() && currentYear === today.getFullYear()

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-lg border bg-background">
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-r-none" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-base font-semibold min-w-[180px] text-center px-2">
              {new Date(currentYear, currentMonth).toLocaleDateString('en-US', {
                month: 'long',
                year: 'numeric',
              })}
            </h2>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-l-none" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          {!isCurrentMonthToday && (
            <Button variant="outline" size="sm" className="text-xs h-8" onClick={goToToday}>
              <CalendarDays className="mr-1.5 h-3.5 w-3.5" />
              Today
            </Button>
          )}
        </div>

        {/* Campaign count */}
        <div className="text-sm text-muted-foreground">
          {monthCampaigns.length} campaign{monthCampaigns.length !== 1 ? 's' : ''} this month
        </div>
      </div>

      {/* Campaign legend */}
      {monthCampaigns.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          {monthCampaigns.slice(0, 8).map((c) => {
            const color = campaignColorMap.get(c.id) || CAMPAIGN_COLORS[0]
            return (
              <Popover key={c.id}>
                <PopoverTrigger asChild>
                  <button className="flex items-center gap-2 rounded-full border px-3 py-1 text-xs hover:bg-muted/50 transition-colors">
                    <div className={cn('h-2.5 w-2.5 rounded-full', color.dot)} />
                    <span className="truncate max-w-[140px] font-medium">{c.name}</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="p-4" align="start">
                  <CampaignPopover
                    campaign={c}
                    color={color}
                    onNavigate={() => router.push(`/dashboard/campaigns/${c.id}`)}
                  />
                </PopoverContent>
              </Popover>
            )
          })}
          {monthCampaigns.length > 8 && (
            <span className="text-xs text-muted-foreground">+{monthCampaigns.length - 8} more</span>
          )}
        </div>
      )}

      {/* Calendar grid */}
      <div className="rounded-xl border bg-background shadow-sm overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b">
          {DAYS_OF_WEEK.map((day) => (
            <div
              key={day}
              className="text-center text-xs font-semibold text-muted-foreground py-3 uppercase tracking-wider"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {cells.map((day, i) => {
            const isToday = day === today.getDate() && isCurrentMonthToday
            const isWeekend = i % 7 === 5 || i % 7 === 6
            const deadlines = day ? deadlinesByDay.get(day) : undefined

            // Get campaigns that span this day
            const dayCampaigns = day
              ? monthCampaigns.filter((c) => isCampaignOnDay(c, day, currentMonth, currentYear))
              : []

            return (
              <div
                key={i}
                className={cn(
                  'min-h-[100px] border-b border-r p-1.5 transition-colors',
                  !day && 'bg-muted/10',
                  isWeekend && day && 'bg-muted/5',
                  isToday && 'bg-primary/[0.03]'
                )}
              >
                {day && (
                  <>
                    {/* Date number */}
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={cn(
                          'h-7 w-7 flex items-center justify-center rounded-full text-sm',
                          isToday
                            ? 'bg-primary text-primary-foreground font-bold'
                            : 'font-medium text-foreground'
                        )}
                      >
                        {day}
                      </span>

                      {/* Deadline count badge */}
                      {deadlines && deadlines.length > 0 && (
                        <span className={cn(
                          'text-[10px] font-medium px-1.5 py-0.5 rounded-full',
                          deadlines.some((dl) => dl.campaign._overdueCount > 0)
                            ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400'
                            : 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400'
                        )}>
                          {deadlines.reduce((sum, dl) => sum + dl.count, 0)} due
                        </span>
                      )}
                    </div>

                    {/* Campaign bars */}
                    <div className="space-y-0.5">
                      {dayCampaigns.slice(0, 3).map((c) => {
                        const color = campaignColorMap.get(c.id) || CAMPAIGN_COLORS[0]
                        const position = getCampaignBarPosition(c, day, currentMonth, currentYear)

                        return (
                          <Popover key={c.id}>
                            <PopoverTrigger asChild>
                              <button
                                className={cn(
                                  'w-full h-5 text-[10px] font-medium truncate px-1.5 flex items-center gap-1 transition-opacity hover:opacity-80',
                                  color.bgLight,
                                  color.text,
                                  position === 'single' && 'rounded-md',
                                  position === 'start' && 'rounded-l-md -mr-1.5 pr-2',
                                  position === 'end' && 'rounded-r-md -ml-1.5 pl-2',
                                  position === 'middle' && '-mx-1.5 px-2'
                                )}
                              >
                                {(position === 'start' || position === 'single') && (
                                  <>
                                    <div className={cn('h-1.5 w-1.5 rounded-full shrink-0', color.dot)} />
                                    <span className="truncate">{c.name}</span>
                                  </>
                                )}
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="p-4" align="start">
                              <CampaignPopover
                                campaign={c}
                                color={color}
                                onNavigate={() => router.push(`/dashboard/campaigns/${c.id}`)}
                              />
                            </PopoverContent>
                          </Popover>
                        )
                      })}

                      {dayCampaigns.length > 3 && (
                        <span className="text-[10px] text-muted-foreground pl-1">
                          +{dayCampaigns.length - 3} more
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

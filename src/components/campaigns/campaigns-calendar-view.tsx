"use client"

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/ui/status-badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
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

const STATUS_BAR_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-300',
  ACTIVE: 'bg-green-400',
  IN_REVIEW: 'bg-yellow-400',
  APPROVED: 'bg-blue-400',
  COMPLETED: 'bg-purple-400',
}

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  // 0 = Monday, 6 = Sunday (ISO)
  const day = new Date(year, month, 1).getDay()
  return day === 0 ? 6 : day - 1
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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="text-sm font-semibold min-w-[160px] text-center">
            {new Date(currentYear, currentMonth).toLocaleDateString('en-US', {
              month: 'long',
              year: 'numeric',
            })}
          </h3>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button variant="ghost" size="sm" className="text-xs" onClick={goToToday}>
          Today
        </Button>
      </div>

      {/* Campaign bars legend */}
      {monthCampaigns.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap text-xs">
          <span className="text-muted-foreground">{monthCampaigns.length} campaigns this month:</span>
          {monthCampaigns.slice(0, 5).map((c) => (
            <button
              key={c.id}
              className="flex items-center gap-1 hover:underline"
              onClick={() => router.push(`/dashboard/campaigns/${c.id}`)}
            >
              <div className={cn('h-2 w-2 rounded-full', STATUS_BAR_COLORS[c.status] || 'bg-gray-300')} />
              <span className="truncate max-w-[120px]">{c.name}</span>
            </button>
          ))}
          {monthCampaigns.length > 5 && (
            <span className="text-muted-foreground">+{monthCampaigns.length - 5} more</span>
          )}
        </div>
      )}

      {/* Calendar grid */}
      <div className="border rounded-lg overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 bg-muted/50">
          {DAYS_OF_WEEK.map((day) => (
            <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2 border-b">
              {day}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {cells.map((day, i) => {
            const isToday = day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear()
            const deadlines = day ? deadlinesByDay.get(day) : undefined
            const dayCampaigns = day ? monthCampaigns.filter((c) => {
              const start = new Date(c.startDate!).getDate()
              const end = c.endDate ? new Date(c.endDate).getDate() : start
              const startMonth = new Date(c.startDate!).getMonth()
              const endMonth = c.endDate ? new Date(c.endDate).getMonth() : startMonth
              // Simplified: show bar on start day and end day only
              if (startMonth === currentMonth && start === day) return true
              if (endMonth === currentMonth && end === day) return true
              return false
            }) : []

            return (
              <div
                key={i}
                className={cn(
                  'min-h-[80px] p-1 border-b border-r text-xs',
                  !day && 'bg-muted/20',
                  isToday && 'bg-primary/5'
                )}
              >
                {day && (
                  <>
                    <div className={cn(
                      'h-6 w-6 flex items-center justify-center rounded-full mb-1',
                      isToday && 'bg-primary text-primary-foreground font-medium'
                    )}>
                      {day}
                    </div>

                    {/* Campaign start/end indicators */}
                    <div className="space-y-0.5">
                      {monthCampaigns.filter((c) => {
                        const start = new Date(c.startDate!)
                        if (start.getDate() === day && start.getMonth() === currentMonth) return true
                        return false
                      }).slice(0, 2).map((c) => (
                        <TooltipProvider key={c.id}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                className={cn(
                                  'w-full h-4 rounded-sm text-[9px] text-white truncate px-1 text-left',
                                  STATUS_BAR_COLORS[c.status] || 'bg-gray-300'
                                )}
                                onClick={() => router.push(`/dashboard/campaigns/${c.id}`)}
                              >
                                {c.name}
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="font-medium">{c.name}</p>
                              <p className="text-xs text-muted-foreground">{c.project.client.name}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ))}

                      {/* Deadline dots */}
                      {deadlines && deadlines.length > 0 && (
                        <div className="flex items-center gap-0.5 mt-0.5">
                          {deadlines.slice(0, 3).map((dl, idx) => (
                            <div
                              key={idx}
                              className={cn(
                                'h-1.5 w-1.5 rounded-full',
                                dl.campaign._overdueCount > 0 ? 'bg-red-500' : 'bg-orange-400'
                              )}
                              title={`${dl.count} deadline(s) for ${dl.campaign.name}`}
                            />
                          ))}
                        </div>
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

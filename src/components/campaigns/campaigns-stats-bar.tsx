"use client"

import { Megaphone, Activity, CalendarClock, Users, DollarSign } from 'lucide-react'
import { StatsCard } from '@/components/ui/stats-card'
import { formatCurrency } from '@/lib/currency'
import type { CampaignStats } from '@/hooks/use-campaigns-list'

interface CampaignsStatsBarProps {
  stats: CampaignStats
}

export function CampaignsStatsBar({ stats }: CampaignsStatsBarProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      <StatsCard title="Total Campaigns" value={stats.total} icon={Megaphone} />
      <StatsCard title="Live Now" value={stats.liveNow} icon={Activity} />
      <StatsCard title="Going Live This Week" value={stats.goingLiveThisWeek} icon={CalendarClock} />
      <StatsCard title="Total Influencers" value={stats.totalInfluencers} icon={Users} />
      <StatsCard
        title="Total Budget"
        value={formatCurrency(stats.totalBudget, stats.currency)}
        icon={DollarSign}
      />
    </div>
  )
}

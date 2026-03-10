"use client"

import { Briefcase, Activity, DollarSign, AlertCircle } from 'lucide-react'
import { StatsCard } from '@/components/ui/stats-card'
import { formatCurrency } from '@/lib/currency'
import type { ProjectStats } from '@/hooks/use-projects-list'

interface ProjectsStatsBarProps {
  stats: ProjectStats
}

export function ProjectsStatsBar({ stats }: ProjectsStatsBarProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatsCard title="Total Projects" value={stats.total} icon={Briefcase} />
      <StatsCard title="Active Projects" value={stats.active} icon={Activity} />
      <StatsCard title="Total Budget" value={formatCurrency(stats.totalBudget, stats.currency)} icon={DollarSign} />
      <StatsCard title="Outstanding" value="—" icon={AlertCircle} />
    </div>
  )
}

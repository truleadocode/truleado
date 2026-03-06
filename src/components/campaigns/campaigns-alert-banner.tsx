"use client"

import { useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { CampaignAlert } from '@/hooks/use-campaigns-list'

interface CampaignsAlertBannerProps {
  alerts: CampaignAlert[]
}

const ALERT_COLORS: Record<string, string> = {
  overdue_submissions: 'bg-red-100 text-red-700 hover:bg-red-200',
  pending_approvals: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200',
  going_live_unapproved: 'bg-orange-100 text-orange-700 hover:bg-orange-200',
  unpaid_fees: 'bg-purple-100 text-purple-700 hover:bg-purple-200',
}

export function CampaignsAlertBanner({ alerts }: CampaignsAlertBannerProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  const visible = alerts.filter((a) => !dismissed.has(a.type))
  if (visible.length === 0) return null

  return (
    <div className="flex items-center gap-2 p-3 rounded-lg border border-amber-200 bg-amber-50">
      <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
      <div className="flex items-center gap-2 flex-wrap flex-1">
        {visible.map((alert) => (
          <Badge
            key={alert.type}
            className={`gap-1 pr-1 ${ALERT_COLORS[alert.type] || 'bg-gray-100 text-gray-700'}`}
          >
            <span className="text-xs">{alert.label}</span>
            <button
              onClick={() => setDismissed((prev) => new Set([...prev, alert.type]))}
              className="ml-0.5 rounded-full p-0.5 hover:bg-black/10"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
    </div>
  )
}

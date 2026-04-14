"use client"

import { useCallback, useEffect, useRef, useState } from 'react'
import { graphqlRequest, queries } from '@/lib/graphql/client'

export interface DashboardStats {
  activeClients: number
  activeProjects: number
  runningCampaigns: number
  pendingApprovals: number
}

export interface ActivityItem {
  id: string
  entityType: string
  entityId: string
  action: string
  actorType: 'user' | 'system'
  metadata: Record<string, unknown> | null
  createdAt: string
  actor: { id: string; name: string | null; email: string | null } | null
}

export interface AgencyProfile {
  id: string
  primaryEmail: string | null
  phone: string | null
  addressLine1: string | null
  city: string | null
  country: string | null
  subscriptionStatus: string | null
}

interface StatsResult { dashboardStats: DashboardStats }
interface ActivityResult { recentActivity: ActivityItem[] }
interface ProfileResult { agency: AgencyProfile | null }

export function useDashboardData(agencyId: string | undefined) {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [activity, setActivity] = useState<ActivityItem[] | null>(null)
  const [profile, setProfile] = useState<AgencyProfile | null>(null)
  const [loading, setLoading] = useState(false)
  const inFlight = useRef(false)

  const refetch = useCallback(async () => {
    if (!agencyId || inFlight.current) return
    inFlight.current = true
    setLoading(true)
    try {
      const [s, a, p] = await Promise.all([
        graphqlRequest<StatsResult>(queries.dashboardStats, { agencyId }),
        graphqlRequest<ActivityResult>(queries.recentActivity, { agencyId, limit: 10 }),
        graphqlRequest<ProfileResult>(queries.agencyProfileCompleteness, { id: agencyId }),
      ])
      setStats(s.dashboardStats)
      setActivity(a.recentActivity)
      setProfile(p.agency)
    } catch {
      // Dashboard is non-blocking; silently keep last-good values.
    } finally {
      inFlight.current = false
      setLoading(false)
    }
  }, [agencyId])

  useEffect(() => {
    setStats(null)
    setActivity(null)
    setProfile(null)
    refetch()
  }, [refetch])

  useEffect(() => {
    const onFocus = () => {
      if (document.visibilityState === 'visible') refetch()
    }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [refetch])

  return { stats, activity, profile, loading, refetch }
}

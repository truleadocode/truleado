"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Users,
  Briefcase,
  Megaphone,
  FileCheck,
  TrendingUp,
  ArrowRight,
  Plus,
  Clock,
  AlertCircle,
  Check,
  X,
  PartyPopper
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Header } from '@/components/layout/header'
import { useAuth } from '@/contexts/auth-context'
import { graphqlRequest } from '@/lib/graphql/client'

const stats = [
  { name: 'Active Clients', value: '0', icon: Users, href: '/dashboard/clients', color: 'text-blue-600 bg-blue-100' },
  { name: 'Active Projects', value: '0', icon: Briefcase, href: '/dashboard/projects', color: 'text-purple-600 bg-purple-100' },
  { name: 'Running Campaigns', value: '0', icon: Megaphone, href: '/dashboard/campaigns', color: 'text-green-600 bg-green-100' },
  { name: 'Pending Approvals', value: '0', icon: FileCheck, href: '/dashboard/approvals', color: 'text-orange-600 bg-orange-100' },
]

const quickActions = [
  { name: 'Add Client', href: '/dashboard/clients/new', icon: Users },
  { name: 'Create Project', href: '/dashboard/projects/new', icon: Briefcase },
  { name: 'Start Campaign', href: '/dashboard/campaigns/new', icon: Megaphone },
  { name: 'Upload Deliverable', href: '/dashboard/deliverables/new', icon: FileCheck },
]

const checklistItems = [
  {
    key: 'add-client',
    title: 'Add your first client',
    description: 'Create a client profile to start organizing your work',
    href: '/dashboard/clients/new',
    cta: 'Add Client',
  },
  {
    key: 'create-project',
    title: 'Create a project',
    description: 'Projects help you organize campaigns for each client',
    href: '/dashboard/projects/new',
    cta: 'Create Project',
  },
  {
    key: 'launch-campaign',
    title: 'Launch your first campaign',
    description: 'Start managing influencer content and approvals',
    href: '/dashboard/campaigns/new',
    cta: 'Start Campaign',
  },
]

function getStorageKey(agencyId: string) {
  return `truleado_onboarding_${agencyId}`
}

interface OnboardingState {
  dismissed: boolean
  completed: string[]
}

function loadOnboardingState(agencyId: string): OnboardingState {
  try {
    const raw = localStorage.getItem(getStorageKey(agencyId))
    if (raw) return JSON.parse(raw)
  } catch {}
  return { dismissed: false, completed: [] }
}

function saveOnboardingState(agencyId: string, state: OnboardingState) {
  localStorage.setItem(getStorageKey(agencyId), JSON.stringify(state))
}

const ONBOARDING_CHECK_QUERY = `
  query OnboardingCheck($agencyId: ID!) {
    clients(agencyId: $agencyId) { id }
    agencyProjects(agencyId: $agencyId) { id }
    allCampaigns(agencyId: $agencyId) { id }
  }
`

interface OnboardingCheckResult {
  clients: { id: string }[]
  agencyProjects: { id: string }[]
  allCampaigns: { id: string }[]
}

export default function DashboardPage() {
  const { user, currentAgency } = useAuth()
  const [onboarding, setOnboarding] = useState<OnboardingState>({ dismissed: false, completed: [] })
  const [loaded, setLoaded] = useState(false)
  const syncedRef = useRef(false)

  const agencyId = currentAgency?.id

  // Load from cache immediately, then sync with real data in background
  useEffect(() => {
    if (!agencyId) return
    const cached = loadOnboardingState(agencyId)
    setOnboarding(cached)
    setLoaded(true)

    // Skip background sync if already dismissed or already synced this session
    if (cached.dismissed || syncedRef.current) return
    syncedRef.current = true

    // Background fetch — non-blocking, fire-and-forget
    graphqlRequest<OnboardingCheckResult>(ONBOARDING_CHECK_QUERY, { agencyId })
      .then(data => {
        const detected: string[] = []
        if (data.clients?.length > 0) detected.push('add-client')
        if (data.agencyProjects?.length > 0) detected.push('create-project')
        if (data.allCampaigns?.length > 0) detected.push('launch-campaign')

        if (detected.length === 0) return

        setOnboarding(prev => {
          // Merge: keep anything already completed + add newly detected
          const merged = Array.from(new Set([...prev.completed, ...detected]))
          if (merged.length === prev.completed.length) return prev // no change
          const next = { ...prev, completed: merged }
          saveOnboardingState(agencyId, next)
          return next
        })
      })
      .catch(() => {
        // Silent — onboarding check is non-critical
      })
  }, [agencyId])

  const updateOnboarding = useCallback((updater: (prev: OnboardingState) => OnboardingState) => {
    if (!agencyId) return
    setOnboarding(prev => {
      const next = updater(prev)
      saveOnboardingState(agencyId, next)
      return next
    })
  }, [agencyId])

  const toggleItem = (key: string) => {
    updateOnboarding(prev => {
      const completed = prev.completed.includes(key)
        ? prev.completed.filter(k => k !== key)
        : [...prev.completed, key]
      return { ...prev, completed }
    })
  }

  const dismiss = () => {
    updateOnboarding(prev => ({ ...prev, dismissed: true }))
  }

  const completedCount = onboarding.completed.length
  const totalCount = checklistItems.length
  const allDone = completedCount === totalCount
  const progressPercent = Math.round((completedCount / totalCount) * 100)
  const showOnboarding = loaded && !onboarding.dismissed

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <>
      <Header
        title={`${getGreeting()}, ${user?.name?.split(' ')[0] || user?.email?.split('@')[0] || 'there'}`}
        subtitle={currentAgency?.name ? `Managing ${currentAgency.name}` : undefined}
      />

      <div className="p-6 space-y-6">
        {/* Getting Started - moved to top */}
        {showOnboarding && (
          <Card className="border-dashed">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    {allDone
                      ? <PartyPopper className="h-5 w-5 text-primary" />
                      : <TrendingUp className="h-5 w-5 text-primary" />
                    }
                  </div>
                  <div>
                    <CardTitle className="text-lg">
                      {allDone ? 'You\'re all set!' : 'Get Started with Truleado'}
                    </CardTitle>
                    <CardDescription>
                      {allDone
                        ? 'You\'ve completed all the setup steps'
                        : `${completedCount} of ${totalCount} steps complete`
                      }
                    </CardDescription>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={dismiss}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Progress bar */}
              <div className="mt-3">
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            </CardHeader>

            {!allDone && (
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {checklistItems.map((item) => {
                    const done = onboarding.completed.includes(item.key)
                    return (
                      <div
                        key={item.key}
                        className={`flex items-start gap-4 p-4 rounded-lg bg-muted/50 transition-opacity ${done ? 'opacity-50' : ''}`}
                      >
                        <button
                          onClick={() => toggleItem(item.key)}
                          className={`h-7 w-7 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                            done
                              ? 'bg-primary border-primary text-white'
                              : 'border-muted-foreground/30 hover:border-primary/50'
                          }`}
                        >
                          {done && <Check className="h-4 w-4" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <h4 className={`font-medium text-sm ${done ? 'line-through text-muted-foreground' : ''}`}>
                            {item.title}
                          </h4>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {item.description}
                          </p>
                        </div>
                        {!done && (
                          <Button size="sm" variant="outline" asChild className="shrink-0">
                            <Link href={item.href}>
                              {item.cta}
                            </Link>
                          </Button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            )}

            {allDone && (
              <CardContent className="pt-0">
                <Button variant="outline" size="sm" onClick={dismiss}>
                  Dismiss
                </Button>
              </CardContent>
            )}
          </Card>
        )}

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Link key={stat.name} href={stat.href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        {stat.name}
                      </p>
                      <p className="text-3xl font-bold mt-1">{stat.value}</p>
                    </div>
                    <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${stat.color}`}>
                      <stat.icon className="h-6 w-6" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
              <CardDescription>Common tasks to get you started</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {quickActions.map((action) => (
                  <Link key={action.name} href={action.href}>
                    <Button
                      variant="outline"
                      className="w-full h-auto py-4 flex-col gap-2 hover:border-primary hover:bg-primary/5"
                    >
                      <action.icon className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm">{action.name}</span>
                    </Button>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Recent Activity</CardTitle>
                <CardDescription>Latest updates from your team</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard/activity">
                  View all
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Clock className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium">No recent activity</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Activity will appear here as your team works
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alerts / Notifications */}
        <Card className="border-warning/50 bg-warning/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-warning/20 flex items-center justify-center shrink-0">
                <AlertCircle className="h-5 w-5 text-warning" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Complete your agency profile</p>
                <p className="text-sm text-muted-foreground">
                  Add billing information and invite team members to get the most out of Truleado
                </p>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard/settings">
                  Complete Setup
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}

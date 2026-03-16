"use client"

import { useMemo } from 'react'
import { AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Header } from '@/components/layout/header'
import { useAuth } from '@/contexts/auth-context'
import { useGraphQLQuery } from '@/hooks/use-graphql-query'
import { queries } from '@/lib/graphql/client'
import { CampaignsCalendarView } from '@/components/campaigns/campaigns-calendar-view'

interface CalendarCampaignRaw {
  id: string
  name: string
  status: string
  startDate: string | null
  endDate: string | null
  project: {
    id: string
    name: string
    client: {
      id: string
      name: string
    }
  }
  deliverables: {
    id: string
    status: string
    dueDate: string | null
  }[]
}

export default function CalendarPage() {
  const { currentAgency } = useAuth()

  const { data, isLoading, error, refetch } = useGraphQLQuery<{ allCampaigns: CalendarCampaignRaw[] }>(
    ['allCampaigns', 'calendar', currentAgency?.id],
    queries.allCampaigns,
    { agencyId: currentAgency?.id ?? '' },
    { enabled: !!currentAgency?.id }
  )

  const campaigns = useMemo(() => {
    return (data?.allCampaigns ?? []).map((c) => ({
      ...c,
      _overdueCount: c.deliverables.filter(
        (d) => d.dueDate && new Date(d.dueDate).getTime() < Date.now() && !['APPROVED', 'REJECTED'].includes(d.status)
      ).length,
      _approvedCount: c.deliverables.filter((d) => d.status === 'APPROVED').length,
    }))
  }, [data])

  if (isLoading) {
    return (
      <>
        <Header title="Calendar" subtitle="Agency-wide campaign timeline" />
        <div className="p-6 flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </>
    )
  }

  if (error) {
    return (
      <>
        <Header title="Calendar" subtitle="Agency-wide campaign timeline" />
        <div className="p-6">
          <Card className="border-destructive bg-destructive/10">
            <CardContent className="p-6 flex flex-col items-center text-center">
              <AlertCircle className="h-12 w-12 text-destructive mb-4" />
              <h3 className="text-lg font-semibold">Failed to load calendar</h3>
              <p className="text-muted-foreground mt-2">{error.message}</p>
              <Button variant="outline" className="mt-4" onClick={() => refetch()}>
                Retry
              </Button>
            </CardContent>
          </Card>
        </div>
      </>
    )
  }

  return (
    <>
      <Header title="Calendar" subtitle="Agency-wide campaign timeline" />
      <div className="p-6">
        <CampaignsCalendarView campaigns={campaigns} />
      </div>
    </>
  )
}

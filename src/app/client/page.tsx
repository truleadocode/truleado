'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { FileCheck, LogOut, ChevronRight, Inbox } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/contexts/auth-context'
import { graphqlRequest, queries } from '@/lib/graphql/client'

interface PendingDeliverable {
  id: string
  title: string
  description: string | null
  deliverableType: string
  status: string
  dueDate: string | null
  createdAt: string
  campaign: {
    id: string
    name: string
    project: {
      id: string
      name: string
      client: { id: string; name: string }
    }
  }
}

export default function ClientPortalPage() {
  const router = useRouter()
  const { user, agencies, loading, signOut } = useAuth()
  const [pending, setPending] = useState<PendingDeliverable[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPending = useCallback(async () => {
    try {
      const data = await graphqlRequest<{ deliverablesPendingClientApproval: PendingDeliverable[] }>(
        queries.deliverablesPendingClientApproval
      )
      setPending(data.deliverablesPendingClientApproval ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load pending approvals')
    } finally {
      setLoadingList(false)
    }
  }, [])

  useEffect(() => {
    if (loading) return
    if (!user) {
      router.replace('/client/login')
      return
    }
    if (agencies.length > 0) {
      router.replace('/dashboard')
      return
    }
    fetchPending()
  }, [loading, user, agencies.length, router, fetchPending])

  if (loading || !user) {
    return null
  }

  return (
    <div className="flex-1 container max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-xl font-semibold">Client portal</h1>
        <Button variant="ghost" size="sm" onClick={() => signOut()}>
          <LogOut className="h-4 w-4 mr-2" />
          Sign out
        </Button>
      </div>
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5" />
            Welcome, {user.name || user.email}
          </CardTitle>
          <CardDescription>
            Review and approve deliverables sent to you by your agency.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="space-y-4">
        <h2 className="text-lg font-medium">Pending your approval</h2>
        {loadingList ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Loading…
            </CardContent>
          </Card>
        ) : error ? (
          <Card>
            <CardContent className="py-8 text-center text-destructive">
              {error}
            </CardContent>
          </Card>
        ) : pending.length === 0 ? (
          <Card>
            <CardContent className="py-12 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <Inbox className="h-12 w-12" />
              <p>No deliverables pending your approval.</p>
            </CardContent>
          </Card>
        ) : (
          <ul className="space-y-3">
            {pending.map((d) => (
              <li key={d.id}>
                <Link href={`/client/approvals/${d.id}`}>
                  <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                    <CardContent className="py-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium">{d.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {d.campaign.project.client.name} · {d.campaign.project.name} · {d.campaign.name}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{d.deliverableType}</Badge>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

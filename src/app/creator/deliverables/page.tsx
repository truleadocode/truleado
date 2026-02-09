'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight, Inbox, Calendar, FileCheck } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/contexts/auth-context'
import { graphqlRequest, queries } from '@/lib/graphql/client'

interface Deliverable {
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
  versions: Array<{
    id: string
    versionNumber: number
    fileUrl: string
    fileName: string
    createdAt: string
  }>
  trackingRecord: {
    id: string
    urls: Array<{ id: string; url: string }>
  } | null
}

export default function CreatorDeliverablesPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [deliverables, setDeliverables] = useState<Deliverable[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDeliverables = useCallback(async () => {
    try {
      const data = await graphqlRequest<{ myCreatorDeliverables: Deliverable[] }>(
        queries.myCreatorDeliverables
      )
      setDeliverables(data.myCreatorDeliverables ?? [])
    } catch (err) {
      console.error('Failed to load deliverables:', err)
      setError(err instanceof Error ? err.message : 'Failed to load deliverables')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.replace('/creator/login')
      return
    }
    fetchDeliverables()
  }, [authLoading, user, router, fetchDeliverables])

  if (authLoading || !user) {
    return null
  }

  const formatDate = (date: string | null) => {
    if (!date) return null
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      draft: 'secondary',
      pending_internal: 'outline',
      pending_client: 'outline',
      revision_requested: 'destructive',
      approved: 'default',
    }
    const labels: Record<string, string> = {
      draft: 'Draft',
      pending_internal: 'In Review',
      pending_client: 'Client Review',
      revision_requested: 'Revision Needed',
      approved: 'Approved',
    }
    return (
      <Badge variant={variants[status] || 'secondary'}>
        {labels[status] || status}
      </Badge>
    )
  }

  // Group by status
  const needsAttention = deliverables.filter(
    (d) => d.status === 'draft' || d.status === 'revision_requested'
  )
  const needsTracking = deliverables.filter(
    (d) => d.status === 'approved' && (!d.trackingRecord || d.trackingRecord.urls.length === 0)
  )
  const inReview = deliverables.filter(
    (d) => d.status === 'pending_internal' || d.status === 'pending_client'
  )
  const completed = deliverables.filter(
    (d) => d.status === 'approved' && d.trackingRecord && d.trackingRecord.urls.length > 0
  )

  const renderDeliverableList = (items: Deliverable[], emptyMessage: string) => {
    if (items.length === 0) {
      return (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {emptyMessage}
          </CardContent>
        </Card>
      )
    }

    return (
      <ul className="space-y-3">
        {items.map((d) => (
          <li key={d.id}>
            <Link href={`/creator/deliverables/${d.id}`}>
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium">{d.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {d.campaign.project.client.name} · {d.campaign.name}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        {d.dueDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Due: {formatDate(d.dueDate)}
                          </span>
                        )}
                        <span>{d.versions.length} version{d.versions.length !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(d.status)}
                      <Badge variant="outline">{d.deliverableType}</Badge>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    )
  }

  return (
    <div className="flex-1 container max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1">My Deliverables</h1>
        <p className="text-muted-foreground">
          View and manage your assigned deliverables
        </p>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Loading...
          </CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="py-8 text-center text-destructive">
            {error}
          </CardContent>
        </Card>
      ) : deliverables.length === 0 ? (
        <Card>
          <CardContent className="py-12 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Inbox className="h-12 w-12" />
            <p>No deliverables assigned yet.</p>
            <p className="text-sm">Deliverables will appear here once agencies assign them to you.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Needs Attention */}
          {needsAttention.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-orange-600">Needs Your Attention</h2>
              {renderDeliverableList(needsAttention, '')}
            </div>
          )}

          {/* Needs Tracking URLs */}
          {needsTracking.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-green-600">Add Tracking URLs</h2>
              {renderDeliverableList(needsTracking, '')}
            </div>
          )}

          {/* In Review */}
          {inReview.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">In Review</h2>
              {renderDeliverableList(inReview, '')}
            </div>
          )}

          {/* Completed */}
          {completed.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-muted-foreground">Completed</h2>
              {renderDeliverableList(completed, '')}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

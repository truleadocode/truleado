"use client"

import { useState, useEffect } from 'react'
import { Database, Trash2, Plus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { graphqlRequest, queries, mutations } from '@/lib/graphql/client'
import { useToast } from '@/hooks/use-toast'

interface SampleDataCardProps {
  agencyId: string | undefined
}

export function SampleDataCard({ agencyId }: SampleDataCardProps) {
  const { toast } = useToast()
  const [hasDummyData, setHasDummyData] = useState(false)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    if (!agencyId) return
    graphqlRequest<{ onboardingStatus: { hasDummyData: boolean } }>(
      queries.onboardingStatus,
      { agencyId }
    )
      .then((data) => setHasDummyData(data.onboardingStatus.hasDummyData))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [agencyId])

  const handleSeed = async () => {
    if (!agencyId) return
    setActionLoading(true)
    try {
      await graphqlRequest(mutations.seedDummyData, { agencyId })
      setHasDummyData(true)
      toast({ title: 'Sample data added successfully' })
    } catch (err) {
      toast({
        title: 'Failed to add sample data',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setActionLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!agencyId) return
    setActionLoading(true)
    try {
      await graphqlRequest(mutations.deleteDummyData, { agencyId })
      setHasDummyData(false)
      toast({ title: 'Sample data deleted successfully' })
    } catch (err) {
      toast({
        title: 'Failed to delete sample data',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) return null

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Database className="h-4 w-4" />
          Sample Data
        </CardTitle>
        <CardDescription>
          {hasDummyData
            ? 'Your agency has sample data loaded. You can delete it at any time.'
            : 'Add sample data to explore the platform with realistic clients, projects, and campaigns.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {hasDummyData ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" disabled={actionLoading}>
                {actionLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Delete Sample Data
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete sample data?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently remove all sample clients, contacts, projects, campaigns, deliverables, and creators. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : (
          <Button variant="outline" size="sm" onClick={handleSeed} disabled={actionLoading}>
            {actionLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            Add Sample Data
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

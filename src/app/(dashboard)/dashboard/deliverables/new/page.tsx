"use client"

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, AlertCircle, FileCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Header } from '@/components/layout/header'
import { DatePicker } from '@/components/ui/date-picker'
import { graphqlRequest, queries, mutations } from '@/lib/graphql/client'

const deliverableTypes = [
  { value: 'instagram_post', label: 'Instagram Post' },
  { value: 'instagram_story', label: 'Instagram Story' },
  { value: 'instagram_reel', label: 'Instagram Reel' },
  { value: 'youtube_video', label: 'YouTube Video' },
  { value: 'youtube_short', label: 'YouTube Short' },
  { value: 'tiktok_video', label: 'TikTok Video' },
  { value: 'twitter_post', label: 'Twitter/X Post' },
  { value: 'blog_post', label: 'Blog Post' },
  { value: 'other', label: 'Other' },
]

const createDeliverableSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters'),
  deliverableType: z.string().min(1, 'Please select a type'),
  description: z.string().optional(),
})

type CreateDeliverableFormData = z.infer<typeof createDeliverableSchema>

interface Campaign {
  id: string
  name: string
  project: {
    id: string
    name: string
    client: {
      id: string
      name: string
    }
  }
}

export default function NewDeliverablePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const campaignId = searchParams.get('campaignId')
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [loading, setLoading] = useState(true)
  const [dueDate, setDueDate] = useState<Date | undefined>()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateDeliverableFormData>({
    resolver: zodResolver(createDeliverableSchema),
    defaultValues: {
      deliverableType: 'instagram_post',
    },
  })

  // Fetch campaign details
  useEffect(() => {
    async function fetchCampaign() {
      if (!campaignId) {
        setError('Campaign ID is required')
        setLoading(false)
        return
      }
      
      try {
        const data = await graphqlRequest<{ campaign: Campaign }>(
          queries.campaign,
          { id: campaignId }
        )
        setCampaign(data.campaign)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load campaign')
      } finally {
        setLoading(false)
      }
    }

    fetchCampaign()
  }, [campaignId])

  const onSubmit = async (data: CreateDeliverableFormData) => {
    if (!campaignId) return
    
    setError(null)
    setIsSubmitting(true)
    
    try {
      const result = await graphqlRequest<{ createDeliverable: { id: string } }>(
        mutations.createDeliverable,
        {
          campaignId,
          title: data.title,
          deliverableType: data.deliverableType,
          description: data.description || null,
          dueDate: dueDate?.toISOString() || null,
        }
      )
      
      router.push(`/dashboard/deliverables/${result.createDeliverable.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create deliverable')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <>
        <Header title="Loading..." />
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-48 bg-muted rounded" />
            <div className="h-64 bg-muted rounded-lg" />
          </div>
        </div>
      </>
    )
  }

  if (!campaignId || !campaign) {
    return (
      <>
        <Header title="Error" />
        <div className="p-6">
          <Card className="border-destructive bg-destructive/10">
            <CardContent className="p-6 text-center">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h3 className="text-lg font-semibold">Campaign Required</h3>
              <p className="text-muted-foreground mt-2">
                Please create a deliverable from within a campaign.
              </p>
              <Button className="mt-4" onClick={() => router.push('/dashboard/campaigns')}>
                Go to Campaigns
              </Button>
            </CardContent>
          </Card>
        </div>
      </>
    )
  }

  return (
    <>
      <Header title="New Deliverable" subtitle={`${campaign.name}`} />
      
      <div className="p-6 max-w-2xl">
        <Link
          href={`/dashboard/campaigns/${campaignId}`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to {campaign.name}
        </Link>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <FileCheck className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <CardTitle>Deliverable Details</CardTitle>
                <CardDescription>
                  Add a content deliverable to track and approve
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {error && (
                <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-lg">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., Product Launch Reel"
                  error={!!errors.title}
                  {...register('title')}
                />
                {errors.title && (
                  <p className="text-sm text-destructive">{errors.title.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="deliverableType">Content Type *</Label>
                <select
                  id="deliverableType"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  {...register('deliverableType')}
                >
                  {deliverableTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                {errors.deliverableType && (
                  <p className="text-sm text-destructive">{errors.deliverableType.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Due Date</Label>
                <DatePicker
                  date={dueDate}
                  onDateChange={setDueDate}
                  placeholder="Select due date (optional)"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <textarea
                  id="description"
                  rows={3}
                  placeholder="Additional details about this deliverable..."
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  {...register('description')}
                />
              </div>

              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm text-muted-foreground">
                  <strong>Next steps:</strong> After creating, you can upload content files 
                  and submit for review through the approval workflow.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Create Deliverable'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  )
}

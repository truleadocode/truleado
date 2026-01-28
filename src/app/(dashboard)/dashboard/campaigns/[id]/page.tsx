"use client"

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Megaphone,
  Building2,
  Briefcase,
  User,
  Calendar,
  FileCheck,
  Users,
  Plus,
  MoreHorizontal,
  AlertCircle,
  Play,
  Send,
  CheckCircle,
  Flag,
  ArrowRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Header } from '@/components/layout/header'
import { graphqlRequest, queries, mutations } from '@/lib/graphql/client'

interface DeliverableVersion {
  id: string
  versionNumber: number
  createdAt: string
}

interface Deliverable {
  id: string
  title: string
  status: string
  deliverableType: string
  dueDate: string | null
  versions: DeliverableVersion[]
}

interface Creator {
  id: string
  displayName: string
  instagramHandle: string | null
  youtubeHandle: string | null
  tiktokHandle: string | null
}

interface Campaign {
  id: string
  name: string
  description: string | null
  status: string
  campaignType: string
  startDate: string | null
  endDate: string | null
  createdAt: string
  project: {
    id: string
    name: string
    client: {
      id: string
      name: string
      accountManager: {
        id: string
        name: string | null
        email: string
      } | null
    }
  }
  deliverables: Deliverable[]
  creators: Creator[]
}

// Campaign state machine
const STATUS_TRANSITIONS: Record<string, { next: string; action: string; icon: React.ReactNode; color: string }> = {
  draft: { next: 'active', action: 'Activate Campaign', icon: <Play className="h-4 w-4" />, color: 'bg-green-600 hover:bg-green-700' },
  active: { next: 'in_review', action: 'Submit for Review', icon: <Send className="h-4 w-4" />, color: 'bg-yellow-600 hover:bg-yellow-700' },
  in_review: { next: 'approved', action: 'Approve Campaign', icon: <CheckCircle className="h-4 w-4" />, color: 'bg-blue-600 hover:bg-blue-700' },
  approved: { next: 'completed', action: 'Mark Complete', icon: <Flag className="h-4 w-4" />, color: 'bg-purple-600 hover:bg-purple-700' },
}

export default function CampaignDetailPage() {
  const params = useParams()
  const router = useRouter()
  const campaignId = params.id as string
  
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [transitioning, setTransitioning] = useState(false)

  const fetchCampaign = async () => {
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

  useEffect(() => {
    fetchCampaign()
  }, [campaignId])

  const handleStatusTransition = async () => {
    if (!campaign) return
    
    const transition = STATUS_TRANSITIONS[campaign.status.toLowerCase()]
    if (!transition) return
    
    setTransitioning(true)
    
    try {
      let mutation = ''
      switch (campaign.status.toLowerCase()) {
        case 'draft':
          mutation = mutations.activateCampaign
          break
        case 'active':
          mutation = mutations.submitCampaignForReview
          break
        case 'in_review':
          mutation = mutations.approveCampaign
          break
        case 'approved':
          mutation = mutations.completeCampaign
          break
        default:
          return
      }
      
      await graphqlRequest(mutation, { campaignId })
      await fetchCampaign() // Refresh data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update campaign status')
    } finally {
      setTransitioning(false)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const getInitials = (name: string | null | undefined) => {
    if (!name) return '?'
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      DRAFT: 'bg-gray-100 text-gray-700',
      ACTIVE: 'bg-green-100 text-green-700',
      IN_REVIEW: 'bg-yellow-100 text-yellow-700',
      APPROVED: 'bg-blue-100 text-blue-700',
      COMPLETED: 'bg-purple-100 text-purple-700',
      ARCHIVED: 'bg-gray-100 text-gray-500',
      PENDING: 'bg-gray-100 text-gray-700',
      SUBMITTED: 'bg-blue-100 text-blue-700',
      INTERNAL_REVIEW: 'bg-yellow-100 text-yellow-700',
      CLIENT_REVIEW: 'bg-orange-100 text-orange-700',
      REJECTED: 'bg-red-100 text-red-700',
    }
    return colors[status.toUpperCase()] || 'bg-gray-100 text-gray-700'
  }

  if (loading) {
    return (
      <>
        <Header title="Loading..." />
        <div className="p-6">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-48 bg-muted rounded" />
            <div className="h-32 bg-muted rounded-lg" />
            <div className="h-64 bg-muted rounded-lg" />
          </div>
        </div>
      </>
    )
  }

  if (error || !campaign) {
    return (
      <>
        <Header title="Error" />
        <div className="p-6">
          <Card className="border-destructive bg-destructive/10">
            <CardContent className="p-6 flex flex-col items-center text-center">
              <AlertCircle className="h-12 w-12 text-destructive mb-4" />
              <h3 className="text-lg font-semibold">Failed to load campaign</h3>
              <p className="text-muted-foreground mt-2">{error || 'Campaign not found'}</p>
              <Button variant="outline" className="mt-4" onClick={() => router.push('/dashboard/campaigns')}>
                Back to Campaigns
              </Button>
            </CardContent>
          </Card>
        </div>
      </>
    )
  }

  const currentTransition = STATUS_TRANSITIONS[campaign.status.toLowerCase()]

  return (
    <>
      <Header 
        title={campaign.name} 
        subtitle={`${campaign.project.client.name} • ${campaign.project.name}`} 
      />
      
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard/campaigns"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Campaigns
          </Link>
          
          <div className="flex items-center gap-3">
            {currentTransition && (
              <Button
                className={currentTransition.color}
                onClick={handleStatusTransition}
                disabled={transitioning}
              >
                {transitioning ? (
                  <>Processing...</>
                ) : (
                  <>
                    {currentTransition.icon}
                    <span className="ml-2">{currentTransition.action}</span>
                  </>
                )}
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <MoreHorizontal className="mr-2 h-4 w-4" />
                  Actions
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>Edit Campaign</DropdownMenuItem>
                <DropdownMenuItem>Set Dates</DropdownMenuItem>
                <DropdownMenuItem>Manage Creators</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive">
                  Archive Campaign
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Status Progress */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              {['DRAFT', 'ACTIVE', 'IN_REVIEW', 'APPROVED', 'COMPLETED'].map((status, index, arr) => {
                const currentIndex = arr.indexOf(campaign.status.toUpperCase())
                const isComplete = index < currentIndex
                const isCurrent = index === currentIndex
                const isPending = index > currentIndex
                
                return (
                  <div key={status} className="flex items-center">
                    <div className="flex flex-col items-center">
                      <div
                        className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium ${
                          isComplete
                            ? 'bg-green-500 text-white'
                            : isCurrent
                            ? 'bg-primary text-white'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {isComplete ? '✓' : index + 1}
                      </div>
                      <span className={`text-xs mt-1 ${isCurrent ? 'font-medium' : 'text-muted-foreground'}`}>
                        {status.replace('_', ' ')}
                      </span>
                    </div>
                    {index < arr.length - 1 && (
                      <div
                        className={`h-0.5 w-12 mx-2 ${
                          isComplete ? 'bg-green-500' : 'bg-muted'
                        }`}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Campaign Info Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-6">
              <div className="h-20 w-20 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
                <Megaphone className="h-10 w-10 text-green-600" />
              </div>
              <div className="flex-1 grid gap-4 sm:grid-cols-4">
                <div>
                  <p className="text-sm text-muted-foreground">Client</p>
                  <Link 
                    href={`/dashboard/clients/${campaign.project.client.id}`}
                    className="font-medium hover:underline flex items-center gap-1 mt-1"
                  >
                    <Building2 className="h-4 w-4" />
                    {campaign.project.client.name}
                  </Link>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Project</p>
                  <Link 
                    href={`/dashboard/projects/${campaign.project.id}`}
                    className="font-medium hover:underline flex items-center gap-1 mt-1"
                  >
                    <Briefcase className="h-4 w-4" />
                    {campaign.project.name}
                  </Link>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Deliverables</p>
                  <p className="font-medium mt-1">{campaign.deliverables.length}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Creators</p>
                  <p className="font-medium mt-1">{campaign.creators.length}</p>
                </div>
              </div>
            </div>
            
            {campaign.description && (
              <div className="mt-6 pt-6 border-t">
                <p className="text-sm text-muted-foreground mb-1">Description</p>
                <p>{campaign.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Deliverables Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Deliverables</h2>
              <Button size="sm" asChild>
                <Link href={`/dashboard/deliverables/new?campaignId=${campaign.id}`}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Deliverable
                </Link>
              </Button>
            </div>

            {campaign.deliverables.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <FileCheck className="h-10 w-10 text-muted-foreground mb-3" />
                  <h3 className="font-medium">No deliverables yet</h3>
                  <p className="text-sm text-muted-foreground text-center mt-1">
                    Add deliverables to track content
                  </p>
                  <Button size="sm" className="mt-3" asChild>
                    <Link href={`/dashboard/deliverables/new?campaignId=${campaign.id}`}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Deliverable
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {campaign.deliverables.map((deliverable) => (
                  <Card key={deliverable.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <FileCheck className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{deliverable.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {deliverable.deliverableType?.replace('_', ' ')} • {deliverable.versions.length} version{deliverable.versions.length !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(deliverable.status)}`}>
                          {deliverable.status.replace('_', ' ')}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Creators Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Creators</h2>
              <Button size="sm" variant="outline" asChild>
                <Link href={`/dashboard/creators?assign=${campaign.id}`}>
                  <Plus className="mr-2 h-4 w-4" />
                  Assign Creator
                </Link>
              </Button>
            </div>

            {campaign.creators.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <Users className="h-10 w-10 text-muted-foreground mb-3" />
                  <h3 className="font-medium">No creators assigned</h3>
                  <p className="text-sm text-muted-foreground text-center mt-1">
                    Assign creators from your roster
                  </p>
                  <Button size="sm" variant="outline" className="mt-3" asChild>
                    <Link href="/dashboard/creators">
                      View Creator Roster
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {campaign.creators.map((creator) => (
                  <Card key={creator.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>
                            {getInitials(creator.displayName)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{creator.displayName}</p>
                          <div className="flex gap-2 text-xs text-muted-foreground">
                            {creator.instagramHandle && <span>@{creator.instagramHandle}</span>}
                            {creator.youtubeHandle && <span>YT: {creator.youtubeHandle}</span>}
                            {creator.tiktokHandle && <span>TT: @{creator.tiktokHandle}</span>}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

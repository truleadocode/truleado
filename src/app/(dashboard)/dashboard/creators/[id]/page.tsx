"use client"

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  MoreHorizontal,
  Instagram,
  Youtube,
  Facebook,
  Linkedin,
  Music2,
  LayoutDashboard,
  UserCircle,
  AtSign,
  Mail,
  Phone,
  StickyNote,
  ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Header } from '@/components/layout/header'
import { PageBreadcrumb } from '@/components/layout/page-breadcrumb'
import { StatusBadge } from '@/components/ui/status-badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { graphqlRequest, queries, mutations } from '@/lib/graphql/client'
import { useToast } from '@/hooks/use-toast'
import { useSocialFetch } from '@/hooks/use-social-fetch'
import { SocialDashboardTab } from '@/components/creators/social-dashboard-tab'
import { InstagramTab } from '@/components/creators/instagram-tab'
import { YouTubeTab } from '@/components/creators/youtube-tab'
import { CreatorRatesForm, type CreatorRateDraft } from '@/components/creators/creator-rates-form'
import { useAuth } from '@/contexts/auth-context'

function proxiedImageSrc(url: string) {
  return `/api/image-proxy?url=${encodeURIComponent(url)}`
}

function shouldProxyExternalImage(url: string) {
  try {
    const u = new URL(url)
    return (
      u.hostname.includes('instagram.') ||
      u.hostname.includes('cdninstagram.com') ||
      u.hostname.endsWith('.fna.fbcdn.net')
    )
  } catch {
    return false
  }
}

function getInitials(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  const first = parts[0]?.[0] ?? ''
  const second = parts[1]?.[0] ?? parts[0]?.[1] ?? ''
  return (first + second).toUpperCase()
}

interface CampaignAssignment {
  id: string
  status: string
  rateAmount: number | null
  rateCurrency: string | null
  notes: string | null
  campaign: {
    id: string
    name: string
    status: string
  }
  createdAt: string
}

interface CreatorRate {
  id: string
  platform: string
  deliverableType: string
  rateAmount: number
  rateCurrency: string
  createdAt: string
  updatedAt: string
}

interface Creator {
  id: string
  displayName: string
  email: string | null
  phone: string | null
  instagramHandle: string | null
  youtubeHandle: string | null
  tiktokHandle: string | null
  facebookHandle: string | null
  linkedinHandle: string | null
  notes: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  campaignAssignments: CampaignAssignment[]
  rates: CreatorRate[]
}

interface SocialProfile {
  id: string
  platform: string
  platformUsername: string | null
  platformDisplayName: string | null
  profilePicUrl: string | null
  bio: string | null
  followersCount: number | null
  followingCount: number | null
  postsCount: number | null
  isVerified: boolean | null
  isBusinessAccount: boolean | null
  externalUrl: string | null
  subscribersCount: number | null
  totalViews: string | null
  channelId: string | null
  avgLikes: number | null
  avgComments: number | null
  avgViews: number | null
  engagementRate: number | null
  lastFetchedAt: string
}

interface SocialPost {
  id: string
  platform: string
  platformPostId: string
  postType: string | null
  caption: string | null
  url: string | null
  thumbnailUrl: string | null
  likesCount: number | null
  commentsCount: number | null
  viewsCount: number | null
  publishedAt: string | null
}

type Tab = 'dashboard' | 'instagram' | 'youtube' | 'tiktok' | 'facebook' | 'linkedin'

export default function CreatorDetailPage() {
  const params = useParams()
  const { toast } = useToast()
  const { currentAgency } = useAuth()
  const creatorId = params.id as string

  const [creator, setCreator] = useState<Creator | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')

  // Social data state
  const [socialProfiles, setSocialProfiles] = useState<SocialProfile[]>([])
  const [instagramPosts, setInstagramPosts] = useState<SocialPost[]>([])
  const [youtubePosts, setYoutubePosts] = useState<SocialPost[]>([])
  const [socialLoading, setSocialLoading] = useState(false)

  // Edit dialog state
  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState({
    displayName: '',
    email: '',
    phone: '',
    instagramHandle: '',
    youtubeHandle: '',
    tiktokHandle: '',
    facebookHandle: '',
    linkedinHandle: '',
    notes: '',
  })
  const [editRates, setEditRates] = useState<CreatorRateDraft[]>([])
  const [editTab, setEditTab] = useState<'profile' | 'rates'>('profile')
  const [saving, setSaving] = useState(false)
  const [deactivateOpen, setDeactivateOpen] = useState(false)

  const avgRatesByPlatform = (() => {
    const rows = (creator?.rates || []).filter((rate) => rate.platform !== 'flat_rate')
    const buckets = new Map<string, { total: number; count: number; currency: string }>()
    rows.forEach((rate) => {
      const amount =
        typeof rate.rateAmount === 'number'
          ? rate.rateAmount
          : Number.parseFloat(String(rate.rateAmount))
      if (!Number.isFinite(amount)) return
      const current = buckets.get(rate.platform) || { total: 0, count: 0, currency: rate.rateCurrency }
      buckets.set(rate.platform, {
        total: current.total + amount,
        count: current.count + 1,
        currency: current.currency || rate.rateCurrency,
      })
    })
    return Array.from(buckets.entries()).map(([platform, data]) => ({
      platform,
      average: data.count > 0 ? data.total / data.count : 0,
      currency: data.currency,
    }))
  })()

  const platformLabels: Record<string, string> = {
    instagram: 'Instagram',
    youtube: 'YouTube',
    tiktok: 'TikTok',
    x: 'X',
    blog: 'Blog',
  }

  const formatMoney = (value: number, currency?: string) => {
    if (!Number.isFinite(value)) return '—'
    try {
      return new Intl.NumberFormat(currentAgency?.languageCode || 'en-US', {
        style: 'currency',
        currency: currency || 'USD',
        maximumFractionDigits: 0,
      }).format(value)
    } catch {
      return `${currency || 'USD'} ${value.toFixed(0)}`
    }
  }

  const fetchSocialData = useCallback(async () => {
    setSocialLoading(true)
    try {
      const profilesData = await graphqlRequest<{
        creatorSocialProfiles: SocialProfile[]
      }>(queries.creatorSocialProfiles, { creatorId })
      setSocialProfiles(profilesData.creatorSocialProfiles || [])

      // Fetch posts for each platform that has a profile
      const profiles = profilesData.creatorSocialProfiles || []
      const igProfile = profiles.find((p) => p.platform === 'instagram')
      const ytProfile = profiles.find((p) => p.platform === 'youtube')

      if (igProfile) {
        const igData = await graphqlRequest<{
          creatorSocialPosts: SocialPost[]
        }>(queries.creatorSocialPosts, {
          creatorId,
          platform: 'instagram',
          limit: 20,
        })
        setInstagramPosts(igData.creatorSocialPosts || [])
      }

      if (ytProfile) {
        const ytData = await graphqlRequest<{
          creatorSocialPosts: SocialPost[]
        }>(queries.creatorSocialPosts, {
          creatorId,
          platform: 'youtube',
          limit: 20,
        })
        setYoutubePosts(ytData.creatorSocialPosts || [])
      }
    } catch {
      // Social data fetch is best-effort — don't block the page
    } finally {
      setSocialLoading(false)
    }
  }, [creatorId])

  const { triggerFetch, isPollingPlatform } = useSocialFetch(creatorId, {
    onComplete: fetchSocialData,
  })

  const fetchCreator = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await graphqlRequest<{ creator: Creator }>(
        queries.creator,
        { id: creatorId }
      )
      setCreator(data.creator)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load creator')
    } finally {
      setLoading(false)
    }
  }, [creatorId])

  useEffect(() => {
    fetchCreator()
  }, [fetchCreator])

  // Fetch social data once creator is loaded
  useEffect(() => {
    if (creator) {
      fetchSocialData()
    }
  }, [creator, fetchSocialData])

  const handleTriggerFetch = useCallback(
    async (platform: string, jobType: string) => {
      try {
        await triggerFetch(platform, jobType)
        toast({ title: 'Fetching data', description: `Social data fetch started for ${platform}` })
      } catch (err) {
        toast({
          title: 'Fetch failed',
          description: err instanceof Error ? err.message : 'Failed to trigger social data fetch',
          variant: 'destructive',
        })
      }
    },
    [triggerFetch, toast]
  )

  const openEditDialog = () => {
    if (!creator) return
    setEditForm({
      displayName: creator.displayName,
      email: creator.email || '',
      phone: creator.phone || '',
      instagramHandle: creator.instagramHandle || '',
      youtubeHandle: creator.youtubeHandle || '',
      tiktokHandle: creator.tiktokHandle || '',
      facebookHandle: creator.facebookHandle || '',
      linkedinHandle: creator.linkedinHandle || '',
      notes: creator.notes || '',
    })
    setEditRates(
      (creator.rates || []).map((rate) => ({
        platform: rate.platform,
        deliverableType: rate.deliverableType,
        rateAmount: rate.rateAmount?.toString() ?? '',
      }))
    )
    setEditTab('profile')
    setEditOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!editForm.displayName.trim() || editForm.displayName.trim().length < 2) {
      toast({ title: 'Error', description: 'Name must be at least 2 characters', variant: 'destructive' })
      return
    }

    setSaving(true)
    try {
      const preparedRates = editRates
        .map((rate) => ({
          platform: rate.platform,
          deliverableType: rate.deliverableType,
          rateAmount: Number.parseFloat(rate.rateAmount),
          rateCurrency: currentAgency?.currencyCode || 'USD',
        }))
        .filter((rate) => Number.isFinite(rate.rateAmount) && rate.rateAmount > 0)

      await graphqlRequest(mutations.updateCreator, {
        id: creatorId,
        displayName: editForm.displayName.trim(),
        email: editForm.email.trim() || null,
        phone: editForm.phone.trim() || null,
        instagramHandle: editForm.instagramHandle.trim() || null,
        youtubeHandle: editForm.youtubeHandle.trim() || null,
        tiktokHandle: editForm.tiktokHandle.trim() || null,
        facebookHandle: editForm.facebookHandle.trim() || null,
        linkedinHandle: editForm.linkedinHandle.trim() || null,
        notes: editForm.notes.trim() || null,
        rates: preparedRates,
      })
      toast({ title: 'Creator updated' })
      setEditOpen(false)
      fetchCreator()
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to update creator',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDeactivate = async () => {
    if (!creator) return
    try {
      await graphqlRequest(mutations.deactivateCreator, { id: creatorId })
      toast({ title: 'Creator deactivated' })
      setDeactivateOpen(false)
      fetchCreator()
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to deactivate creator',
        variant: 'destructive',
      })
    }
  }

  const handleActivate = async () => {
    if (!creator) return
    try {
      await graphqlRequest(mutations.activateCreator, { id: creatorId })
      toast({ title: 'Creator activated' })
      fetchCreator()
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to activate creator',
        variant: 'destructive',
      })
    }
  }

  if (loading) {
    return (
      <>
        <Header title="Creator" subtitle="Loading..." />
        <div className="p-6 space-y-6">
          <Card className="animate-pulse">
            <CardContent className="p-6">
              <div className="flex gap-6">
                <div className="h-20 w-20 rounded-xl bg-muted" />
                <div className="flex-1 space-y-3">
                  <div className="h-6 w-48 bg-muted rounded" />
                  <div className="h-4 w-64 bg-muted rounded" />
                  <div className="h-4 w-36 bg-muted rounded" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </>
    )
  }

  if (error || !creator) {
    return (
      <>
        <Header title="Creator" subtitle="Error" />
        <div className="p-6">
          <Card className="border-destructive bg-destructive/10">
            <CardContent className="p-4 text-destructive">
              {error || 'Creator not found'}
            </CardContent>
          </Card>
        </div>
      </>
    )
  }

  const hasInstagram = !!creator.instagramHandle
  const hasYouTube = !!creator.youtubeHandle
  const hasTikTok = !!creator.tiktokHandle
  const hasFacebook = !!creator.facebookHandle
  const hasLinkedIn = !!creator.linkedinHandle
  const hasSocialTabs = hasInstagram || hasYouTube || hasTikTok || hasFacebook || hasLinkedIn

  const igProfile = socialProfiles.find((p) => p.platform === 'instagram') || null
  const ytProfile = socialProfiles.find((p) => p.platform === 'youtube') || null

  return (
    <>
      <Header title={creator.displayName} subtitle="Creator Profile" />

      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <PageBreadcrumb items={[
            { label: 'Creators', href: '/dashboard/creators' },
            { label: creator.displayName },
          ]} />

          <div className="flex items-center gap-3">
            {!creator.isActive && (
              <Badge variant="secondary">Inactive</Badge>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={openEditDialog}>Edit</DropdownMenuItem>
                <DropdownMenuSeparator />
                {creator.isActive ? (
                  <DropdownMenuItem onClick={() => setDeactivateOpen(true)}>
                    Deactivate
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={handleActivate}>
                    Activate
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Creator Summary (above tabs, below actions) */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-6">
              <div className="h-20 w-20 rounded-xl bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                {(() => {
                  const raw = igProfile?.profilePicUrl || ytProfile?.profilePicUrl || null
                  if (raw) {
                    const src = shouldProxyExternalImage(raw) ? proxiedImageSrc(raw) : raw
                    return (
                      <img
                        src={src}
                        alt={creator.displayName}
                        className="h-full w-full object-cover"
                      />
                    )
                  }
                  return (
                    <div className="h-full w-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
                      <span className="text-white font-semibold text-xl tracking-tight">
                        {getInitials(creator.displayName)}
                      </span>
                    </div>
                  )
                })()}
              </div>

              <div className="flex-1 space-y-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-semibold">{creator.displayName}</h2>
                    <StatusBadge status={creator.isActive ? 'active' : 'inactive'} />
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {creator.instagramHandle ? `@${creator.instagramHandle}` : 'No Instagram handle'}
                    {creator.youtubeHandle ? ` • ${creator.youtubeHandle}` : ''}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {creator.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a href={`mailto:${creator.email}`} className="text-primary hover:underline">
                        {creator.email}
                      </a>
                    </div>
                  )}
                  {creator.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{creator.phone}</span>
                    </div>
                  )}
                  {creator.instagramHandle && (
                    <div className="flex items-center gap-2 text-sm">
                      <Instagram className="h-4 w-4 text-muted-foreground" />
                      <a
                        href={`https://instagram.com/${creator.instagramHandle}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-1"
                      >
                        @{creator.instagramHandle}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                  {creator.youtubeHandle && (
                    <div className="flex items-center gap-2 text-sm">
                      <Youtube className="h-4 w-4 text-muted-foreground" />
                      <a
                        href={`https://youtube.com/@${creator.youtubeHandle}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-1"
                      >
                        {creator.youtubeHandle}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                </div>

                {creator.notes && (
                  <div className="pt-3 border-t">
                    <div className="flex items-start gap-2 text-sm">
                      <StickyNote className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <p className="text-muted-foreground whitespace-pre-wrap">{creator.notes}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="w-full lg:w-64 xl:w-72">
                <div className="rounded-lg border bg-muted/30 p-4">
                  <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    Average Engagement Rate
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {avgRatesByPlatform.length > 0 ? (
                      avgRatesByPlatform.map((item) => (
                        <span key={item.platform} className="text-xs font-medium rounded bg-muted px-2 py-1">
                          {platformLabels[item.platform] || item.platform}: {formatMoney(item.average, item.currency)}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm font-medium">—</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Social Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as Tab)} className="w-full">
          <TabsList>
            <TabsTrigger value="dashboard">
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Dashboard
            </TabsTrigger>
            {hasInstagram && (
              <TabsTrigger value="instagram">
                <Instagram className="mr-2 h-4 w-4" />
                Instagram
              </TabsTrigger>
            )}
            {hasYouTube && (
              <TabsTrigger value="youtube">
                <Youtube className="mr-2 h-4 w-4" />
                YouTube
              </TabsTrigger>
            )}
            <TabsTrigger value="tiktok" disabled className="opacity-60">
              <Music2 className="mr-2 h-4 w-4" />
              TikTok
              <Badge variant="secondary" className="ml-2 px-1.5 py-0.5 text-[10px]">Soon</Badge>
            </TabsTrigger>
            <TabsTrigger value="facebook" disabled className="opacity-60">
              <Facebook className="mr-2 h-4 w-4" />
              Facebook
              <Badge variant="secondary" className="ml-2 px-1.5 py-0.5 text-[10px]">Soon</Badge>
            </TabsTrigger>
            <TabsTrigger value="linkedin" disabled className="opacity-60">
              <Linkedin className="mr-2 h-4 w-4" />
              LinkedIn
              <Badge variant="secondary" className="ml-2 px-1.5 py-0.5 text-[10px]">Soon</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <SocialDashboardTab creator={creator} profiles={socialProfiles} />
          </TabsContent>

          {hasInstagram && (
            <TabsContent value="instagram">
              <InstagramTab
                profile={igProfile}
                posts={instagramPosts}
                loading={socialLoading}
                onTriggerFetch={(jobType) => handleTriggerFetch('instagram', jobType)}
                fetching={isPollingPlatform('instagram')}
              />
            </TabsContent>
          )}

          {hasYouTube && (
            <TabsContent value="youtube">
              <YouTubeTab
                profile={ytProfile}
                posts={youtubePosts}
                loading={socialLoading}
                onTriggerFetch={(jobType) => handleTriggerFetch('youtube', jobType)}
                fetching={isPollingPlatform('youtube')}
              />
            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <UserCircle className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <DialogTitle>Edit Creator Profile</DialogTitle>
                <DialogDescription>
                  Update identity, contact info, and social handles.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <Tabs value={editTab} onValueChange={(v) => setEditTab(v as 'profile' | 'rates')} className="mt-2">
            <TabsList>
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="rates">Rates</TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="space-y-6 mt-4">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  <UserCircle className="h-3.5 w-3.5" />
                  Identity
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-displayName">Display Name *</Label>
                    <Input
                      id="edit-displayName"
                      value={editForm.displayName}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, displayName: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-notes">Notes</Label>
                    <Input
                      id="edit-notes"
                      value={editForm.notes}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, notes: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  <Mail className="h-3.5 w-3.5" />
                  Contact
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-email">Email</Label>
                    <Input
                      id="edit-email"
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-phone">Phone</Label>
                    <Input
                      id="edit-phone"
                      type="tel"
                      value={editForm.phone}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, phone: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    <AtSign className="h-3.5 w-3.5" />
                    Social Handles
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Instagram + TikTok prefer usernames, YouTube can be channel name.
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-instagram">Instagram</Label>
                    <Input
                      id="edit-instagram"
                      value={editForm.instagramHandle}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, instagramHandle: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-youtube">YouTube</Label>
                    <Input
                      id="edit-youtube"
                      value={editForm.youtubeHandle}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, youtubeHandle: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-tiktok">TikTok</Label>
                    <Input
                      id="edit-tiktok"
                      value={editForm.tiktokHandle}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, tiktokHandle: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-facebook">Facebook</Label>
                    <Input
                      id="edit-facebook"
                      value={editForm.facebookHandle}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, facebookHandle: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="edit-linkedin">LinkedIn</Label>
                    <Input
                      id="edit-linkedin"
                      value={editForm.linkedinHandle}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, linkedinHandle: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="rates" className="mt-4">
              <CreatorRatesForm
                rates={editRates}
                onChange={setEditRates}
                currencyCode={currentAgency?.currencyCode || 'USD'}
              />
            </TabsContent>
          </Tabs>

          <DialogFooter className="flex items-center justify-between sm:justify-between">
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate Confirmation */}
      <Dialog open={deactivateOpen} onOpenChange={setDeactivateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Deactivate Creator?</DialogTitle>
            <DialogDescription>
              This will remove the creator from active use. You can reactivate later from this page.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeactivateOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeactivate}>
              Deactivate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

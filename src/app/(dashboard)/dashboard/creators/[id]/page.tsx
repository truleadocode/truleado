"use client"

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
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
  Sparkles,
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
import { graphqlRequest, queries, mutations } from '@/lib/graphql/client'
import { useToast } from '@/hooks/use-toast'
import { useSocialFetch } from '@/hooks/use-social-fetch'
import { SocialDashboardTab } from '@/components/creators/social-dashboard-tab'
import { InstagramTab } from '@/components/creators/instagram-tab'
import { YouTubeTab } from '@/components/creators/youtube-tab'

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
  const [saving, setSaving] = useState(false)
  const [deactivateOpen, setDeactivateOpen] = useState(false)

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
    setEditOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!editForm.displayName.trim() || editForm.displayName.trim().length < 2) {
      toast({ title: 'Error', description: 'Name must be at least 2 characters', variant: 'destructive' })
      return
    }

    setSaving(true)
    try {
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
          <Link
            href="/dashboard/creators"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Creator Roster
          </Link>

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

        {/* Tab Bar */}
        {hasSocialTabs && (
          <div className="flex items-center gap-1 border-b pb-px">
            <Button
              variant={activeTab === 'dashboard' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('dashboard')}
              className="gap-2"
            >
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </Button>
            {hasInstagram && (
              <Button
                variant={activeTab === 'instagram' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('instagram')}
                className="gap-2"
              >
                <Instagram className="h-4 w-4" />
                Instagram
              </Button>
            )}
            {hasYouTube && (
              <Button
                variant={activeTab === 'youtube' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('youtube')}
                className="gap-2"
              >
                <Youtube className="h-4 w-4" />
                YouTube
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              disabled
              className="gap-2 opacity-60"
            >
              <Music2 className="h-4 w-4" />
              TikTok
              <Badge variant="secondary" className="ml-2 px-1.5 py-0.5 text-[10px]">
                Coming Soon
              </Badge>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled
              className="gap-2 opacity-60"
            >
              <Facebook className="h-4 w-4" />
              Facebook
              <Badge variant="secondary" className="ml-2 px-1.5 py-0.5 text-[10px]">
                Coming Soon
              </Badge>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled
              className="gap-2 opacity-60"
            >
              <Linkedin className="h-4 w-4" />
              LinkedIn
              <Badge variant="secondary" className="ml-2 px-1.5 py-0.5 text-[10px]">
                Coming Soon
              </Badge>
            </Button>
          </div>
        )}

        {/* Tab Content */}
        {activeTab === 'dashboard' && (
          <SocialDashboardTab creator={creator} profiles={socialProfiles} />
        )}

        {activeTab === 'instagram' && hasInstagram && (
          <InstagramTab
            profile={igProfile}
            posts={instagramPosts}
            loading={socialLoading}
            onTriggerFetch={(jobType) => handleTriggerFetch('instagram', jobType)}
            fetching={isPollingPlatform('instagram')}
          />
        )}

        {activeTab === 'youtube' && hasYouTube && (
          <YouTubeTab
            profile={ytProfile}
            posts={youtubePosts}
            loading={socialLoading}
            onTriggerFetch={(jobType) => handleTriggerFetch('youtube', jobType)}
            fetching={isPollingPlatform('youtube')}
          />
        )}

        {/* Fallback: if no social tabs, show dashboard content directly */}
        {!hasSocialTabs && (
          <SocialDashboardTab creator={creator} profiles={[]} />
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-2xl p-0 overflow-hidden">
          <DialogHeader>
            <div className="px-6 pt-6 pb-5 bg-gradient-to-br from-purple-600/10 via-pink-600/10 to-transparent border-b">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shadow-sm">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <DialogTitle className="text-xl tracking-tight">Edit Creator Profile</DialogTitle>
                  <DialogDescription className="mt-1">
                    Update identity, contact info, and social handles. Handles can be entered with or without <span className="font-medium">@</span>.
                  </DialogDescription>
                </div>
              </div>
            </div>
          </DialogHeader>
          <div className="px-6 py-6 space-y-6">
            <div className="rounded-xl border bg-card p-4">
              <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase mb-4">
                <UserCircle className="h-4 w-4" />
                Identity
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-displayName">Display Name *</Label>
                  <div className="relative">
                    <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="edit-displayName"
                      className="pl-9"
                      value={editForm.displayName}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, displayName: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-notes">Notes</Label>
                  <div className="relative">
                    <StickyNote className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <textarea
                      id="edit-notes"
                      className="flex min-h-[42px] w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      value={editForm.notes}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, notes: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border bg-card p-4">
              <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase mb-4">
                <Mail className="h-4 w-4" />
                Contact
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="edit-email"
                      type="email"
                      className="pl-9"
                      value={editForm.email}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-phone">Phone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="edit-phone"
                      type="tel"
                      className="pl-9"
                      value={editForm.phone}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, phone: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border bg-card p-4">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  <AtSign className="h-4 w-4" />
                  Social Handles
                </div>
                <span className="text-xs text-muted-foreground">
                  Instagram + TikTok prefer usernames, YouTube can be channel name.
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-instagram">Instagram</Label>
                  <div className="relative">
                    <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="edit-instagram"
                      className="pl-9"
                      value={editForm.instagramHandle}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, instagramHandle: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-youtube">YouTube</Label>
                  <div className="relative">
                    <Youtube className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="edit-youtube"
                      className="pl-9"
                      value={editForm.youtubeHandle}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, youtubeHandle: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-tiktok">TikTok</Label>
                  <div className="relative">
                    <Music2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="edit-tiktok"
                      className="pl-9"
                      value={editForm.tiktokHandle}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, tiktokHandle: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-facebook">Facebook</Label>
                  <div className="relative">
                    <Facebook className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="edit-facebook"
                      className="pl-9"
                      value={editForm.facebookHandle}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, facebookHandle: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="edit-linkedin">LinkedIn</Label>
                  <div className="relative">
                    <Linkedin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="edit-linkedin"
                      className="pl-9"
                      value={editForm.linkedinHandle}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, linkedinHandle: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <div className="w-full px-6 pb-6 flex items-center justify-between">
              <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveEdit} disabled={saving} className="shadow-sm">
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
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

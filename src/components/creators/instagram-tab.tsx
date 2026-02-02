"use client"

import {
  Instagram,
  ExternalLink,
  Heart,
  MessageCircle,
  BadgeCheck,
  Users,
  ImageIcon,
  Eye,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { SocialPostChart } from './social-post-chart'
import { SocialFetchButton } from './social-fetch-button'

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
  avgLikes: number | null
  avgComments: number | null
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

interface InstagramTabProps {
  profile: SocialProfile | null
  posts: SocialPost[]
  loading: boolean
  onTriggerFetch: (jobType: string) => void
  fetching: boolean
}

function formatNumber(value: number | null | undefined) {
  if (value == null) return '—'
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return value.toLocaleString()
}

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function InstagramTab({
  profile,
  posts,
  loading,
  onTriggerFetch,
  fetching,
}: InstagramTabProps) {
  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-40 rounded-lg bg-muted" />
        <div className="grid grid-cols-3 gap-4">
          <div className="h-32 rounded-lg bg-muted" />
          <div className="h-32 rounded-lg bg-muted" />
          <div className="h-32 rounded-lg bg-muted" />
        </div>
      </div>
    )
  }

  // Empty state
  if (!profile) {
    return (
      <div className="space-y-4">
        <div className="flex gap-2">
          <SocialFetchButton
            label="Get Basic Scraping Data"
            onClick={() => onTriggerFetch('basic_scrape')}
            loading={fetching}
          />
          <SocialFetchButton
            label="Get Enriched Influencer Profile"
            onClick={() => {}}
            loading={false}
            disabled
            icon="sparkle"
          />
        </div>
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Instagram className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No Instagram data yet</h3>
            <p className="text-sm text-muted-foreground text-center mt-2 max-w-md">
              Click &quot;Get Basic Scraping Data&quot; to fetch this creator&apos;s Instagram profile and recent posts.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Action buttons */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <SocialFetchButton
            label="Get Basic Scraping Data"
            onClick={() => onTriggerFetch('basic_scrape')}
            loading={fetching}
          />
          <SocialFetchButton
            label="Get Enriched Influencer Profile"
            onClick={() => {}}
            loading={false}
            disabled
            icon="sparkle"
          />
        </div>
        {profile.lastFetchedAt && (
          <span className="text-xs text-muted-foreground">
            Last updated {timeAgo(profile.lastFetchedAt)}
          </span>
        )}
      </div>

      {/* Profile card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-6">
            {profile.profilePicUrl ? (
              <img
                src={profile.profilePicUrl}
                alt={profile.platformUsername || 'Profile'}
                className="h-20 w-20 rounded-full object-cover shrink-0"
              />
            ) : (
              <div className="h-20 w-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shrink-0">
                <Instagram className="h-10 w-10 text-white" />
              </div>
            )}
            <div className="flex-1 space-y-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold">
                    {profile.platformDisplayName || profile.platformUsername}
                  </h3>
                  {profile.isVerified && (
                    <BadgeCheck className="h-5 w-5 text-blue-500" />
                  )}
                  {profile.isBusinessAccount && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">
                      Business
                    </span>
                  )}
                </div>
                {profile.platformUsername && (
                  <a
                    href={`https://instagram.com/${profile.platformUsername}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline flex items-center gap-1"
                  >
                    @{profile.platformUsername}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
              {profile.bio && (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{profile.bio}</p>
              )}
              <div className="flex gap-6">
                <div className="text-center">
                  <p className="text-lg font-semibold">{formatNumber(profile.followersCount)}</p>
                  <p className="text-xs text-muted-foreground">Followers</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold">{formatNumber(profile.followingCount)}</p>
                  <p className="text-xs text-muted-foreground">Following</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold">{formatNumber(profile.postsCount)}</p>
                  <p className="text-xs text-muted-foreground">Posts</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold">
                    {profile.engagementRate != null ? `${profile.engagementRate.toFixed(2)}%` : '—'}
                  </p>
                  <p className="text-xs text-muted-foreground">Engagement</p>
                </div>
              </div>
              {profile.externalUrl && (
                <a
                  href={profile.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="h-3 w-3" />
                  {profile.externalUrl.replace(/^https?:\/\//, '').slice(0, 50)}
                </a>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      {posts.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3">Engagement Analytics</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SocialPostChart
              posts={posts}
              metric="likesCount"
              chartType="bar"
              title="Likes per Post"
              color="#8b5cf6"
            />
            <SocialPostChart
              posts={posts}
              metric="commentsCount"
              chartType="bar"
              title="Comments per Post"
              color="#3b82f6"
            />
            <SocialPostChart
              posts={posts}
              metric="likesCount"
              chartType="area"
              title="Engagement Trend"
              color="#ec4899"
            />
          </div>
        </div>
      )}

      {/* Post grid */}
      {posts.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3">Recent Posts ({posts.length})</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {posts.map((post) => (
              <a
                key={post.id}
                href={post.url || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <Card className="hover:shadow-md transition-shadow overflow-hidden">
                  {post.thumbnailUrl ? (
                    <div className="aspect-square bg-muted relative">
                      <img
                        src={post.thumbnailUrl}
                        alt={post.caption?.slice(0, 40) || 'Post'}
                        className="w-full h-full object-cover"
                      />
                      {post.postType === 'Video' && (
                        <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded">
                          <Eye className="inline h-3 w-3 mr-1" />
                          {formatNumber(post.viewsCount)}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="aspect-square bg-muted flex items-center justify-center">
                      <ImageIcon className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  <CardContent className="p-3">
                    {post.caption && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                        {post.caption}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Heart className="h-3 w-3" />
                        {formatNumber(post.likesCount)}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="h-3 w-3" />
                        {formatNumber(post.commentsCount)}
                      </span>
                      {post.publishedAt && (
                        <span className="ml-auto">{formatDate(post.publishedAt)}</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { User, Mail, Shield, Bell, LogOut } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { graphqlRequest, queries } from '@/lib/graphql/client'
import { useRouter } from 'next/navigation'

interface CreatorProfile {
  id: string
  displayName: string
  email: string
  bio: string | null
  instagramHandle: string | null
  youtubeHandle: string | null
  twitterHandle: string | null
}

export default function SettingsPage() {
  const router = useRouter()
  const { user, signOut } = useAuth()
  const [profile, setProfile] = useState<CreatorProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProfile = useCallback(async () => {
    try {
      const data = await graphqlRequest<{ myCreatorProfile: CreatorProfile }>(
        queries.myCreatorProfile
      )
      setProfile(data.myCreatorProfile)
    } catch (err) {
      console.error('Failed to load profile:', err)
      setError(err instanceof Error ? err.message : 'Failed to load profile')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user) {
      fetchProfile()
    }
  }, [user, fetchProfile])

  const handleSignOut = async () => {
    await signOut()
    router.replace('/creator/login')
  }

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Loading...
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 lg:p-8">
        <Card>
          <CardContent className="py-8 text-center text-destructive">
            {error}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences
        </p>
      </div>

      <div className="space-y-6">
        {/* Profile Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5" />
              <CardTitle>Profile</CardTitle>
            </div>
            <CardDescription>Your public profile information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  value={profile?.displayName || ''}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={profile?.email || user?.email || ''}
                  disabled
                  className="bg-muted"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Input
                id="bio"
                value={profile?.bio || ''}
                disabled
                placeholder="No bio set"
                className="bg-muted"
              />
            </div>
            <div className="pt-2">
              <Button variant="outline" disabled>
                Edit Profile
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Profile editing coming soon
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Social Handles */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              <CardTitle>Social Handles</CardTitle>
            </div>
            <CardDescription>Your connected social media handles</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Instagram</Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={profile?.instagramHandle || ''}
                    disabled
                    placeholder="Not set"
                    className="bg-muted"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>YouTube</Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={profile?.youtubeHandle || ''}
                    disabled
                    placeholder="Not set"
                    className="bg-muted"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Twitter/X</Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={profile?.twitterHandle || ''}
                    disabled
                    placeholder="Not set"
                    className="bg-muted"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              <CardTitle>Notifications</CardTitle>
            </div>
            <CardDescription>Manage how you receive notifications</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium">Email Notifications</p>
                <p className="text-sm text-muted-foreground">
                  Receive emails about proposals and campaigns
                </p>
              </div>
              <Badge variant="secondary">Enabled</Badge>
            </div>
            <Separator />
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium">In-App Notifications</p>
                <p className="text-sm text-muted-foreground">
                  Receive notifications within the app
                </p>
              </div>
              <Badge variant="secondary">Enabled</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Notification preferences coming soon
            </p>
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              <CardTitle>Security</CardTitle>
            </div>
            <CardDescription>Manage your account security</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium">Authentication Method</p>
                <p className="text-sm text-muted-foreground">
                  Magic link (passwordless)
                </p>
              </div>
              <Badge>Active</Badge>
            </div>
            <Separator />
            <div className="pt-2">
              <Button
                variant="destructive"
                onClick={handleSignOut}
                className="gap-2"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

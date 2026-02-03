"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, UserCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Header } from '@/components/layout/header'
import { useAuth } from '@/contexts/auth-context'
import { graphqlRequest, mutations } from '@/lib/graphql/client'
import { useToast } from '@/hooks/use-toast'

export default function NewCreatorPage() {
  const router = useRouter()
  const { currentAgency } = useAuth()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
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

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const validate = () => {
    const errors: Record<string, string> = {}
    if (!form.displayName.trim() || form.displayName.trim().length < 2) {
      errors.displayName = 'Creator name must be at least 2 characters'
    }
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate() || !currentAgency?.id) return

    setIsSubmitting(true)
    setError(null)

    try {
      const data = await graphqlRequest<{ addCreator: { id: string } }>(
        mutations.addCreator,
        {
          agencyId: currentAgency.id,
          displayName: form.displayName.trim(),
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
          instagramHandle: form.instagramHandle.trim() || null,
          youtubeHandle: form.youtubeHandle.trim() || null,
          tiktokHandle: form.tiktokHandle.trim() || null,
          facebookHandle: form.facebookHandle.trim() || null,
          linkedinHandle: form.linkedinHandle.trim() || null,
          notes: form.notes.trim() || null,
        }
      )
      toast({ title: 'Creator added successfully' })
      router.push(`/dashboard/creators/${data.addCreator.id}`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add creator'
      setError(message)
      toast({ title: 'Error', description: message, variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
  }

  return (
    <>
      <Header title="Add Creator" subtitle="Add a new creator to your roster" />

      <div className="p-6 max-w-2xl">
        <Link
          href="/dashboard/creators"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Creator Roster
        </Link>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <UserCircle className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <CardTitle>Creator Details</CardTitle>
                <CardDescription>Enter the creator&apos;s information</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name *</Label>
                <Input
                  id="displayName"
                  placeholder="Creator's display name"
                  value={form.displayName}
                  onChange={(e) => updateField('displayName', e.target.value)}
                  error={!!fieldErrors.displayName}
                />
                {fieldErrors.displayName && (
                  <p className="text-sm text-destructive">{fieldErrors.displayName}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="creator@email.com"
                    value={form.email}
                    onChange={(e) => updateField('email', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={form.phone}
                    onChange={(e) => updateField('phone', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <Label className="text-base font-medium">Social Handles</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="instagramHandle" className="text-sm font-normal text-muted-foreground">
                      Instagram
                    </Label>
                    <Input
                      id="instagramHandle"
                      placeholder="username (without @)"
                      value={form.instagramHandle}
                      onChange={(e) => updateField('instagramHandle', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="youtubeHandle" className="text-sm font-normal text-muted-foreground">
                      YouTube
                    </Label>
                    <Input
                      id="youtubeHandle"
                      placeholder="channel name"
                      value={form.youtubeHandle}
                      onChange={(e) => updateField('youtubeHandle', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tiktokHandle" className="text-sm font-normal text-muted-foreground">
                      TikTok
                    </Label>
                    <Input
                      id="tiktokHandle"
                      placeholder="username (without @)"
                      value={form.tiktokHandle}
                      onChange={(e) => updateField('tiktokHandle', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="facebookHandle" className="text-sm font-normal text-muted-foreground">
                      Facebook
                    </Label>
                    <Input
                      id="facebookHandle"
                      placeholder="page or profile name"
                      value={form.facebookHandle}
                      onChange={(e) => updateField('facebookHandle', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="linkedinHandle" className="text-sm font-normal text-muted-foreground">
                      LinkedIn
                    </Label>
                    <Input
                      id="linkedinHandle"
                      placeholder="profile or company handle"
                      value={form.linkedinHandle}
                      onChange={(e) => updateField('linkedinHandle', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <textarea
                  id="notes"
                  placeholder="Internal notes about this creator..."
                  className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  value={form.notes}
                  onChange={(e) => updateField('notes', e.target.value)}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => router.push('/dashboard/creators')}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Adding...' : 'Add Creator'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  )
}

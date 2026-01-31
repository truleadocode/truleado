"use client"

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  UserCircle,
  MoreHorizontal,
  Mail,
  Phone,
  Instagram,
  Youtube,
  ExternalLink,
  Megaphone,
  StickyNote,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
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
  notes: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  campaignAssignments: CampaignAssignment[]
}

export default function CreatorDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const creatorId = params.id as string

  const [creator, setCreator] = useState<Creator | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Edit dialog state
  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState({
    displayName: '',
    email: '',
    phone: '',
    instagramHandle: '',
    youtubeHandle: '',
    tiktokHandle: '',
    notes: '',
  })
  const [saving, setSaving] = useState(false)

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

  const openEditDialog = () => {
    if (!creator) return
    setEditForm({
      displayName: creator.displayName,
      email: creator.email || '',
      phone: creator.phone || '',
      instagramHandle: creator.instagramHandle || '',
      youtubeHandle: creator.youtubeHandle || '',
      tiktokHandle: creator.tiktokHandle || '',
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

  const handleToggleActive = async () => {
    if (!creator) return
    try {
      if (creator.isActive) {
        await graphqlRequest(mutations.deactivateCreator, { id: creatorId })
        toast({ title: 'Creator deactivated' })
      } else {
        await graphqlRequest(mutations.activateCreator, { id: creatorId })
        toast({ title: 'Creator activated' })
      }
      fetchCreator()
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to update creator',
        variant: 'destructive',
      })
    }
  }

  const handleDelete = async () => {
    try {
      await graphqlRequest(mutations.deleteCreator, { id: creatorId })
      toast({ title: 'Creator deleted' })
      router.push('/dashboard/creators')
    } catch (err) {
      toast({
        title: 'Cannot delete creator',
        description: err instanceof Error ? err.message : 'Failed to delete creator',
        variant: 'destructive',
      })
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'INVITED': return 'bg-yellow-100 text-yellow-800'
      case 'ACCEPTED': return 'bg-green-100 text-green-800'
      case 'DECLINED': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getCampaignStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'bg-gray-100 text-gray-800'
      case 'ACTIVE': return 'bg-blue-100 text-blue-800'
      case 'IN_REVIEW': return 'bg-yellow-100 text-yellow-800'
      case 'APPROVED': return 'bg-green-100 text-green-800'
      case 'COMPLETED': return 'bg-purple-100 text-purple-800'
      case 'ARCHIVED': return 'bg-gray-100 text-gray-600'
      default: return 'bg-gray-100 text-gray-800'
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

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={openEditDialog}>Edit</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleToggleActive}>
                {creator.isActive ? 'Deactivate' : 'Activate'}
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" onClick={handleDelete}>
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Creator Info Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-6">
              <div className="h-20 w-20 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0">
                <UserCircle className="h-10 w-10 text-purple-500" />
              </div>
              <div className="flex-1 space-y-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-semibold">{creator.displayName}</h2>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${creator.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                      {creator.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Added {formatDate(creator.createdAt)}
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
                  {creator.tiktokHandle && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="h-4 w-4 text-muted-foreground flex items-center justify-center text-xs font-bold">TT</span>
                      <a
                        href={`https://tiktok.com/@${creator.tiktokHandle}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-1"
                      >
                        @{creator.tiktokHandle}
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
            </div>
          </CardContent>
        </Card>

        {/* Campaign Assignments */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Campaign Assignments</h2>
          {creator.campaignAssignments.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-8">
                <Megaphone className="h-10 w-10 text-muted-foreground mb-3" />
                <h3 className="font-medium">No campaign assignments</h3>
                <p className="text-sm text-muted-foreground text-center mt-1">
                  This creator hasn&apos;t been assigned to any campaigns yet.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {creator.campaignAssignments.map((assignment) => (
                <Link key={assignment.id} href={`/dashboard/campaigns/${assignment.campaign.id}`}>
                  <Card className="hover:shadow-sm transition-shadow cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                            <Megaphone className="h-5 w-5 text-blue-500" />
                          </div>
                          <div>
                            <p className="font-medium">{assignment.campaign.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(assignment.status)}`}>
                                {assignment.status}
                              </span>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${getCampaignStatusColor(assignment.campaign.status)}`}>
                                {assignment.campaign.status.replace('_', ' ')}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right text-sm text-muted-foreground">
                          {assignment.rateAmount && (
                            <p className="font-medium text-foreground">
                              {assignment.rateCurrency || 'INR'} {assignment.rateAmount.toLocaleString()}
                            </p>
                          )}
                          <p>{formatDate(assignment.createdAt)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Creator</DialogTitle>
            <DialogDescription>Update the creator&apos;s information</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-displayName">Display Name *</Label>
              <Input
                id="edit-displayName"
                value={editForm.displayName}
                onChange={(e) => setEditForm((prev) => ({ ...prev, displayName: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
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
            <div className="grid grid-cols-2 gap-4">
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
              <Label htmlFor="edit-notes">Notes</Label>
              <textarea
                id="edit-notes"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                value={editForm.notes}
                onChange={(e) => setEditForm((prev) => ({ ...prev, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

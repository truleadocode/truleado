"use client"

import { useState, useEffect, useMemo } from 'react'
import { Search, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/contexts/auth-context'
import { useToast } from '@/hooks/use-toast'
import { graphqlRequest, queries, mutations } from '@/lib/graphql/client'

interface Creator {
  id: string
  displayName: string
  email: string | null
  instagramHandle: string | null
  youtubeHandle: string | null
  tiktokHandle: string | null
  isActive: boolean
}

interface AddInfluencerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  campaignId: string
  existingCreatorIds: string[]
  currency: string | null
  onSuccess: () => void
}

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

function getHandle(c: Creator) {
  return c.instagramHandle || c.youtubeHandle || c.tiktokHandle || ''
}

export function AddInfluencerDialog({
  open,
  onOpenChange,
  campaignId,
  existingCreatorIds,
  currency,
  onSuccess,
}: AddInfluencerDialogProps) {
  const { currentAgency } = useAuth()
  const { toast } = useToast()

  const [creators, setCreators] = useState<Creator[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCreatorId, setSelectedCreatorId] = useState<string | null>(null)
  const [rateAmount, setRateAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open || !currentAgency?.id) return
    setLoading(true)
    graphqlRequest<{ creators: Creator[] }>(queries.creators, {
      agencyId: currentAgency.id,
    })
      .then((data) => setCreators(data.creators || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [open, currentAgency?.id])

  const availableCreators = useMemo(() => {
    const existingSet = new Set(existingCreatorIds)
    let list = creators.filter((c) => c.isActive && !existingSet.has(c.id))
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      list = list.filter(
        (c) =>
          c.displayName.toLowerCase().includes(q) ||
          (c.email || '').toLowerCase().includes(q) ||
          (c.instagramHandle || '').toLowerCase().includes(q) ||
          (c.youtubeHandle || '').toLowerCase().includes(q) ||
          (c.tiktokHandle || '').toLowerCase().includes(q)
      )
    }
    return list
  }, [creators, existingCreatorIds, searchQuery])

  const selectedCreator = creators.find((c) => c.id === selectedCreatorId)

  const handleSubmit = async () => {
    if (!selectedCreatorId) return
    setSubmitting(true)
    try {
      await graphqlRequest(mutations.inviteCreatorToCampaign, {
        campaignId,
        creatorId: selectedCreatorId,
        rateAmount: rateAmount ? parseFloat(rateAmount) : null,
        rateCurrency: currency || currentAgency?.currencyCode || 'USD',
        notes: notes || null,
      })
      toast({ title: 'Influencer added to campaign' })
      setSelectedCreatorId(null)
      setRateAmount('')
      setNotes('')
      setSearchQuery('')
      onOpenChange(false)
      onSuccess()
    } catch (err) {
      toast({
        title: err instanceof Error ? err.message : 'Failed to add influencer',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      setSelectedCreatorId(null)
      setRateAmount('')
      setNotes('')
      setSearchQuery('')
    }
    onOpenChange(isOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Influencer</DialogTitle>
        </DialogHeader>

        {!selectedCreator ? (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search creators..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
            </div>

            <div className="max-h-[300px] overflow-y-auto space-y-1">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : availableCreators.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {searchQuery ? 'No creators found' : 'All creators are already added'}
                </p>
              ) : (
                availableCreators.map((c) => (
                  <button
                    key={c.id}
                    className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-accent text-left transition-colors"
                    onClick={() => setSelectedCreatorId(c.id)}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">{getInitials(c.displayName)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{c.displayName}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {getHandle(c) ? `@${getHandle(c)}` : c.email || ''}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-muted rounded-md">
              <Avatar className="h-10 w-10">
                <AvatarFallback>{getInitials(selectedCreator.displayName)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">{selectedCreator.displayName}</p>
                <p className="text-xs text-muted-foreground">
                  {getHandle(selectedCreator) ? `@${getHandle(selectedCreator)}` : selectedCreator.email || ''}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto text-xs"
                onClick={() => setSelectedCreatorId(null)}
              >
                Change
              </Button>
            </div>

            <div className="space-y-2">
              <Label>Rate ({currency || currentAgency?.currencyCode || 'USD'})</Label>
              <Input
                type="number"
                placeholder="e.g. 50000"
                value={rateAmount}
                onChange={(e) => setRateAmount(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                placeholder="Any notes about this creator..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!selectedCreatorId || submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add Influencer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

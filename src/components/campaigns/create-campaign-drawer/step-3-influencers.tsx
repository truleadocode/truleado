"use client"

import { useState, useMemo, useCallback } from 'react'
import { Search, Plus, Trash2, UserPlus, DollarSign, ChevronDown, ChevronUp } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatCurrency } from '@/lib/currency'
import type { CampaignFormState, CampaignFormInfluencer, CampaignFormDeliverable, CreatorOption } from './types'
import { CONTENT_TYPE_OPTIONS, PLATFORM_OPTIONS } from './types'

interface Step3InfluencersProps {
  form: CampaignFormState
  update: <K extends keyof CampaignFormState>(key: K, value: CampaignFormState[K]) => void
  creators: CreatorOption[]
  loadingCreators: boolean
}

function getInitials(name: string | null | undefined) {
  if (!name) return '?'
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

function getCreatorHandle(c: CreatorOption) {
  return c.instagramHandle || c.youtubeHandle || c.tiktokHandle || c.email || ''
}

// ----- Inline Add New Creator Form -----

function InlineAddCreator({
  onAdd,
}: {
  onAdd: (creator: { displayName: string; handle: string; platform: string }) => void
}) {
  const [name, setName] = useState('')
  const [handle, setHandle] = useState('')
  const [platform, setPlatform] = useState('instagram')
  const [open, setOpen] = useState(false)

  if (!open) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <UserPlus className="mr-1.5 h-4 w-4" />
        Add New Creator
      </Button>
    )
  }

  const handleAdd = () => {
    if (!name.trim()) return
    onAdd({ displayName: name.trim(), handle: handle.trim(), platform })
    setName('')
    setHandle('')
    setPlatform('instagram')
    setOpen(false)
  }

  return (
    <Card className="border-dashed">
      <CardContent className="p-3 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Display Name *</Label>
            <Input
              placeholder="Creator name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Handle</Label>
            <Input
              placeholder="@handle"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Primary Platform</Label>
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PLATFORM_OPTIONS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
          <Button type="button" size="sm" onClick={handleAdd} disabled={!name.trim()}>Add</Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ----- Deliverable Row -----

function DeliverableRow({
  deliverable,
  onChange,
  onRemove,
}: {
  deliverable: CampaignFormDeliverable
  onChange: (d: CampaignFormDeliverable) => void
  onRemove: () => void
}) {
  return (
    <div className="grid grid-cols-[1fr_1fr_60px_1fr_32px] gap-2 items-end">
      <div className="space-y-1">
        <Label className="text-xs">Content Type</Label>
        <Select value={deliverable.contentType || undefined} onValueChange={(v) => onChange({ ...deliverable, contentType: v })}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Select..." />
          </SelectTrigger>
          <SelectContent>
            {CONTENT_TYPE_OPTIONS.map((ct) => (
              <SelectItem key={ct.value} value={ct.value}>{ct.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Platform</Label>
        <Select value={deliverable.platform || undefined} onValueChange={(v) => onChange({ ...deliverable, platform: v })}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Select..." />
          </SelectTrigger>
          <SelectContent>
            {PLATFORM_OPTIONS.map((p) => (
              <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Qty</Label>
        <Input
          type="number"
          min="1"
          className="h-8 text-xs"
          value={deliverable.quantity}
          onChange={(e) => onChange({ ...deliverable, quantity: Number(e.target.value) || 1 })}
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Notes</Label>
        <Input
          className="h-8 text-xs"
          placeholder="Optional notes"
          value={deliverable.notes}
          onChange={(e) => onChange({ ...deliverable, notes: e.target.value })}
        />
      </div>
      <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={onRemove}>
        <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
      </Button>
    </div>
  )
}

// ----- Influencer Card -----

function InfluencerCard({
  influencer,
  currency,
  onChange,
  onRemove,
}: {
  influencer: CampaignFormInfluencer
  currency: string
  onChange: (inf: CampaignFormInfluencer) => void
  onRemove: () => void
}) {
  const [expanded, setExpanded] = useState(true)

  const updateDeliverable = (idx: number, d: CampaignFormDeliverable) => {
    const updated = [...influencer.deliverables]
    updated[idx] = d
    onChange({ ...influencer, deliverables: updated })
  }

  const removeDeliverable = (idx: number) => {
    onChange({ ...influencer, deliverables: influencer.deliverables.filter((_, i) => i !== idx) })
  }

  const addDeliverable = () => {
    onChange({
      ...influencer,
      deliverables: [
        ...influencer.deliverables,
        {
          id: crypto.randomUUID(),
          contentType: '',
          platform: influencer.platform || '',
          quantity: 1,
          notes: '',
        },
      ],
    })
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar className="h-8 w-8">
              {influencer.profilePictureUrl && <AvatarImage src={influencer.profilePictureUrl} />}
              <AvatarFallback className="text-xs">{getInitials(influencer.displayName)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{influencer.displayName}</p>
              {influencer.handle && (
                <p className="text-xs text-muted-foreground truncate">@{influencer.handle}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={onRemove}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {expanded && (
          <>
            {/* Fee & Payment */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Fee ({currency})</Label>
                <Input
                  type="number"
                  min="0"
                  className="h-8 text-xs"
                  placeholder="0"
                  value={influencer.fee || ''}
                  onChange={(e) => onChange({ ...influencer, fee: Number(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Payment Status</Label>
                <Select
                  value={influencer.paymentStatus}
                  onValueChange={(v) => onChange({ ...influencer, paymentStatus: v as 'pending' | 'partial' | 'paid' })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="partial">Partial</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Notes</Label>
                <Input
                  className="h-8 text-xs"
                  placeholder="Optional notes"
                  value={influencer.notes}
                  onChange={(e) => onChange({ ...influencer, notes: e.target.value })}
                />
              </div>
            </div>

            {/* Deliverables */}
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium">Deliverables</p>
                <Button type="button" variant="outline" size="sm" className="h-6 text-xs" onClick={addDeliverable}>
                  <Plus className="mr-1 h-3 w-3" />
                  Add Deliverable
                </Button>
              </div>
              {influencer.deliverables.map((d, idx) => (
                <DeliverableRow
                  key={d.id}
                  deliverable={d}
                  onChange={(updated) => updateDeliverable(idx, updated)}
                  onRemove={() => removeDeliverable(idx)}
                />
              ))}
              {influencer.deliverables.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">
                  No deliverables added. Click &quot;Add Deliverable&quot; to assign content.
                </p>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

// ----- Main Step 3 -----

export function Step3Influencers({ form, update, creators, loadingCreators }: Step3InfluencersProps) {
  const [search, setSearch] = useState('')

  const filteredCreators = useMemo(() => {
    if (!search) return []
    const q = search.toLowerCase()
    // Exclude already-added creators
    const addedIds = new Set(form.influencers.map((i) => i.creatorId))
    return creators
      .filter((c) => !addedIds.has(c.id))
      .filter(
        (c) =>
          (c.displayName || '').toLowerCase().includes(q) ||
          (c.email || '').toLowerCase().includes(q) ||
          (c.instagramHandle || '').toLowerCase().includes(q) ||
          (c.youtubeHandle || '').toLowerCase().includes(q) ||
          (c.tiktokHandle || '').toLowerCase().includes(q)
      )
      .slice(0, 10)
  }, [search, creators, form.influencers])

  const addCreator = useCallback(
    (creator: CreatorOption) => {
      const handle = getCreatorHandle(creator)
      const newInfluencer: CampaignFormInfluencer = {
        creatorId: creator.id,
        displayName: creator.displayName,
        handle,
        platform: creator.instagramHandle ? 'instagram' : creator.youtubeHandle ? 'youtube' : creator.tiktokHandle ? 'tiktok' : '',
        fee: 0,
        currency: form.currency,
        paymentStatus: 'pending',
        notes: '',
        deliverables: [],
      }
      update('influencers', [...form.influencers, newInfluencer])
      setSearch('')
    },
    [form.influencers, form.currency, update]
  )

  const addInlineCreator = useCallback(
    (data: { displayName: string; handle: string; platform: string }) => {
      const newInfluencer: CampaignFormInfluencer = {
        creatorId: `new-${crypto.randomUUID()}`,
        displayName: data.displayName,
        handle: data.handle,
        platform: data.platform,
        fee: 0,
        currency: form.currency,
        paymentStatus: 'pending',
        notes: '',
        deliverables: [],
      }
      update('influencers', [...form.influencers, newInfluencer])
    },
    [form.influencers, form.currency, update]
  )

  const updateInfluencer = (idx: number, inf: CampaignFormInfluencer) => {
    const updated = [...form.influencers]
    updated[idx] = inf
    update('influencers', updated)
  }

  const removeInfluencer = (idx: number) => {
    update('influencers', form.influencers.filter((_, i) => i !== idx))
  }

  // Summary
  const totalFees = form.influencers.reduce((sum, i) => sum + i.fee, 0)
  const totalDeliverables = form.influencers.reduce((sum, i) => sum + i.deliverables.reduce((s, d) => s + d.quantity, 0), 0)
  const budgetCheck = form.totalBudget ? form.totalBudget - totalFees : null

  return (
    <div className="space-y-6">
      {/* Search existing creators */}
      <div className="space-y-3">
        <Label>Search Existing Creators</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder={loadingCreators ? 'Loading creators...' : 'Search by name, handle, or email...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Search results */}
        {search && filteredCreators.length > 0 && (
          <Card className="max-h-48 overflow-y-auto">
            <CardContent className="p-1">
              {filteredCreators.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-accent rounded-md transition-colors"
                  onClick={() => addCreator(c)}
                >
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="text-[10px]">{getInitials(c.displayName)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{c.displayName}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {getCreatorHandle(c) && `@${getCreatorHandle(c)}`}
                      {c.email && ` · ${c.email}`}
                    </p>
                  </div>
                  <Plus className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
            </CardContent>
          </Card>
        )}

        {search && filteredCreators.length === 0 && !loadingCreators && (
          <p className="text-xs text-muted-foreground">No matching creators found. Add a new one below.</p>
        )}
      </div>

      {/* Inline add new creator */}
      <InlineAddCreator onAdd={addInlineCreator} />

      <Separator />

      {/* Added Influencers */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Selected Influencers ({form.influencers.length})</h3>
        </div>

        {form.influencers.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-center">
            <UserPlus className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No influencers added yet.</p>
            <p className="text-xs text-muted-foreground mt-1">Search above or add a new creator to get started.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {form.influencers.map((inf, idx) => (
              <InfluencerCard
                key={inf.creatorId}
                influencer={inf}
                currency={form.currency}
                onChange={(updated) => updateInfluencer(idx, updated)}
                onRemove={() => removeInfluencer(idx)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Summary Bar */}
      {form.influencers.length > 0 && (
        <>
          <Separator />
          <div className="flex items-center justify-between px-4 py-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Influencers:</span>{' '}
                <span className="font-medium">{form.influencers.length}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Deliverables:</span>{' '}
                <span className="font-medium">{totalDeliverables}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Total Fees:</span>{' '}
                <span className="font-medium">{formatCurrency(totalFees, form.currency)}</span>
              </div>
            </div>
            {budgetCheck !== null && (
              <Badge variant={budgetCheck >= 0 ? 'secondary' : 'destructive'}>
                <DollarSign className="mr-1 h-3 w-3" />
                {budgetCheck >= 0
                  ? `${formatCurrency(budgetCheck, form.currency)} remaining`
                  : `${formatCurrency(Math.abs(budgetCheck), form.currency)} over budget`}
              </Badge>
            )}
          </div>
        </>
      )}
    </div>
  )
}

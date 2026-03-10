'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import {
  Send,
  ArrowLeftRight,
  CheckCircle,
  XCircle,
  Trash2,
  MessageCircle,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { formatCurrency } from '@/lib/currency'

interface ProposalVersion {
  id: string
  versionNumber: number
  state: string
  rateAmount: number | null
  rateCurrency: string | null
  notes: string | null
  createdByType: string
  createdAt: string
}

interface ProposalNote {
  id: string
  message: string
  createdByType: string
  createdAt: string
}

interface Creator {
  id: string
  displayName: string
  email: string | null
  instagramHandle: string | null
  youtubeHandle: string | null
  tiktokHandle: string | null
}

interface CampaignCreator {
  id: string
  status: string
  rateAmount: number | null
  rateCurrency: string | null
  notes: string | null
  proposalState: string | null
  currentProposal: ProposalVersion | null
  proposalVersions: ProposalVersion[]
  proposalNotes: ProposalNote[]
  creator: Creator
}

interface ReCounterInput {
  rateAmount: number
  rateCurrency: string
  notes?: string
}

interface ProposalTimelineSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  campaignCreator: CampaignCreator | null
  onAcceptCounter: (campaignCreatorId: string) => Promise<void>
  onDeclineCounter: (campaignCreatorId: string) => Promise<void>
  onReCounter: (campaignCreatorId: string, input: ReCounterInput) => Promise<void>
  onReopen: (campaignCreatorId: string, input: ReCounterInput) => Promise<void>
  onRemove: (campaignCreatorId: string) => Promise<void>
  onAddNote: (campaignCreatorId: string, message: string) => Promise<void>
  isArchived: boolean
}

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

const formatRate = (amount: number | null, currency: string | null) => {
  if (!amount) return null
  return formatCurrency(amount, currency || 'USD')
}

const formatShortDateTime = (dateString: string) => {
  return format(new Date(dateString), 'MMM d, yyyy h:mm a')
}

const getActionText = (createdByType: string, state: string) => {
  const type = createdByType.toLowerCase()
  const stateUpper = state.toUpperCase()

  if (type === 'agency') {
    switch (stateUpper) {
      case 'SENT':
        return 'Agency proposed'
      case 'DRAFT':
        return 'Agency drafted proposal'
      case 'ACCEPTED':
        return 'Agency accepted counter'
      case 'REJECTED':
        return 'Agency declined counter'
      default:
        return 'Agency action'
    }
  } else {
    switch (stateUpper) {
      case 'COUNTERED':
        return 'Creator countered'
      case 'ACCEPTED':
        return 'Creator accepted'
      case 'REJECTED':
        return 'Creator rejected'
      default:
        return 'Creator action'
    }
  }
}

const getEntryIcon = (state: string) => {
  const stateUpper = state.toUpperCase()
  switch (stateUpper) {
    case 'ACCEPTED':
      return <CheckCircle className="h-3 w-3" />
    case 'REJECTED':
      return <XCircle className="h-3 w-3" />
    case 'COUNTERED':
      return <ArrowLeftRight className="h-3 w-3" />
    default:
      return <Send className="h-3 w-3" />
  }
}

const getEntryIconStyle = (state: string, createdByType: string) => {
  const stateUpper = state.toUpperCase()
  if (stateUpper === 'ACCEPTED') return 'bg-green-100 text-green-600'
  if (stateUpper === 'REJECTED') return 'bg-red-100 text-red-600'
  if (stateUpper === 'COUNTERED') return 'bg-orange-100 text-orange-600'
  if (createdByType.toLowerCase() === 'agency') return 'bg-blue-100 text-blue-600'
  return 'bg-gray-100 text-gray-600'
}

// Timeline item type for merged display
type TimelineItem =
  | { type: 'proposal'; data: ProposalVersion }
  | { type: 'note'; data: ProposalNote }

export function ProposalTimelineSheet({
  open,
  onOpenChange,
  campaignCreator,
  onAcceptCounter,
  onDeclineCounter,
  onReCounter,
  onReopen,
  onRemove,
  onAddNote,
  isArchived,
}: ProposalTimelineSheetProps) {
  const [noteMessage, setNoteMessage] = useState('')
  const [isSendingNote, setIsSendingNote] = useState(false)
  const [showReCounterForm, setShowReCounterForm] = useState(false)
  const [showReopenForm, setShowReopenForm] = useState(false)
  const [reCounterRate, setReCounterRate] = useState('')
  const [reCounterNotes, setReCounterNotes] = useState('')
  const [isReCountering, setIsReCountering] = useState(false)
  const [isReopening, setIsReopening] = useState(false)

  if (!campaignCreator) return null

  const { creator, proposalVersions, proposalNotes, proposalState, currentProposal } = campaignCreator
  const isCountered = proposalState?.toLowerCase() === 'countered'
  const isRejected = proposalState?.toLowerCase() === 'rejected'

  // Get current proposed rate info
  const currentRate = currentProposal?.rateAmount
  const currentCurrency = currentProposal?.rateCurrency || 'USD'
  const currentProposedBy = currentProposal?.createdByType?.toLowerCase() === 'agency' ? 'Agency' : 'Creator'

  // Merge proposal versions and notes into a single timeline, sorted newest first
  const timelineItems: TimelineItem[] = [
    ...(proposalVersions || []).map((pv) => ({ type: 'proposal' as const, data: pv })),
    ...(proposalNotes || []).map((pn) => ({ type: 'note' as const, data: pn })),
  ].sort((a, b) => new Date(b.data.createdAt).getTime() - new Date(a.data.createdAt).getTime())

  const handleAcceptCounter = async () => {
    await onAcceptCounter(campaignCreator.id)
    onOpenChange(false)
  }

  const handleDeclineCounter = async () => {
    await onDeclineCounter(campaignCreator.id)
    onOpenChange(false)
  }

  const handleRemove = async () => {
    await onRemove(campaignCreator.id)
    onOpenChange(false)
  }

  const handleSendNote = async () => {
    if (!noteMessage.trim()) return
    setIsSendingNote(true)
    try {
      await onAddNote(campaignCreator.id, noteMessage.trim())
      setNoteMessage('')
    } finally {
      setIsSendingNote(false)
    }
  }

  const handleReCounter = async () => {
    if (!reCounterRate) return
    setIsReCountering(true)
    try {
      await onReCounter(campaignCreator.id, {
        rateAmount: parseFloat(reCounterRate),
        rateCurrency: currentCurrency,
        notes: reCounterNotes.trim() || undefined,
      })
      setShowReCounterForm(false)
      setReCounterRate('')
      setReCounterNotes('')
      onOpenChange(false)
    } finally {
      setIsReCountering(false)
    }
  }

  const handleReopen = async () => {
    if (!reCounterRate) return
    setIsReopening(true)
    try {
      await onReopen(campaignCreator.id, {
        rateAmount: parseFloat(reCounterRate),
        rateCurrency: currentCurrency,
        notes: reCounterNotes.trim() || undefined,
      })
      setShowReopenForm(false)
      setReCounterRate('')
      setReCounterNotes('')
      onOpenChange(false)
    } finally {
      setIsReopening(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:w-3/4 sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="text-lg">
                {getInitials(creator.displayName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <SheetTitle>{creator.displayName}</SheetTitle>
              <SheetDescription className="flex flex-wrap gap-2 mt-1">
                {creator.instagramHandle && (
                  <span>@{creator.instagramHandle}</span>
                )}
                {creator.youtubeHandle && (
                  <span>YT: {creator.youtubeHandle}</span>
                )}
                {creator.tiktokHandle && (
                  <span>TT: @{creator.tiktokHandle}</span>
                )}
                {!creator.instagramHandle && !creator.youtubeHandle && !creator.tiktokHandle && (
                  <span>{creator.email}</span>
                )}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {/* Current Proposed Rate */}
        {currentRate && (
          <div className="bg-muted/50 rounded-lg p-4 mt-2">
            <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
              Current Proposed Rate
            </div>
            <div className="text-2xl font-bold">
              {formatRate(currentRate, currentCurrency)}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              by {currentProposedBy}
            </div>
          </div>
        )}

        {/* Actions */}
        {!isArchived && (
          <div className="py-4 space-y-3">
            {isCountered && !showReCounterForm && (
              <>
                <div className="flex gap-2">
                  <Button
                    onClick={handleAcceptCounter}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Accept
                  </Button>
                  <Button
                    onClick={handleDeclineCounter}
                    variant="destructive"
                    className="flex-1"
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Decline
                  </Button>
                </div>
                <Button
                  onClick={() => setShowReCounterForm(true)}
                  variant="outline"
                  className="w-full"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Re-counter with New Rate
                </Button>
              </>
            )}

            {/* Re-counter Form */}
            {isCountered && showReCounterForm && (
              <div className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Propose New Rate</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowReCounterForm(false)
                      setReCounterRate('')
                      setReCounterNotes('')
                    }}
                  >
                    Cancel
                  </Button>
                </div>
                <div>
                  <Label htmlFor="reCounterRate">New Rate ({currentCurrency})</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      id="reCounterRate"
                      type="number"
                      step="0.01"
                      min="0"
                      value={reCounterRate}
                      onChange={(e) => setReCounterRate(e.target.value)}
                      placeholder="Enter amount"
                      className="max-w-[200px]"
                    />
                    <span className="text-muted-foreground">{currentCurrency}</span>
                  </div>
                </div>
                <div>
                  <Label htmlFor="reCounterNotes">Notes (optional)</Label>
                  <Textarea
                    id="reCounterNotes"
                    value={reCounterNotes}
                    onChange={(e) => setReCounterNotes(e.target.value)}
                    placeholder="Add any notes for the creator..."
                    className="mt-1 resize-none"
                    rows={2}
                  />
                </div>
                <Button
                  onClick={handleReCounter}
                  disabled={!reCounterRate || isReCountering}
                  className="w-full"
                >
                  <Send className="mr-2 h-4 w-4" />
                  {isReCountering ? 'Sending...' : 'Send Counter Proposal'}
                </Button>
              </div>
            )}

            {/* Reopen button for rejected proposals */}
            {isRejected && !showReopenForm && (
              <Button
                onClick={() => setShowReopenForm(true)}
                variant="outline"
                className="w-full"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Reopen Negotiation
              </Button>
            )}

            {/* Reopen Form */}
            {isRejected && showReopenForm && (
              <div className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Reopen with New Offer</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowReopenForm(false)
                      setReCounterRate('')
                      setReCounterNotes('')
                    }}
                  >
                    Cancel
                  </Button>
                </div>
                <div>
                  <Label htmlFor="reopenRate">New Rate ({currentCurrency})</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      id="reopenRate"
                      type="number"
                      step="0.01"
                      min="0"
                      value={reCounterRate}
                      onChange={(e) => setReCounterRate(e.target.value)}
                      placeholder="Enter amount"
                      className="max-w-[200px]"
                    />
                    <span className="text-muted-foreground">{currentCurrency}</span>
                  </div>
                </div>
                <div>
                  <Label htmlFor="reopenNotes">Notes (optional)</Label>
                  <Textarea
                    id="reopenNotes"
                    value={reCounterNotes}
                    onChange={(e) => setReCounterNotes(e.target.value)}
                    placeholder="Add any notes for the creator..."
                    className="mt-1 resize-none"
                    rows={2}
                  />
                </div>
                <Button
                  onClick={handleReopen}
                  disabled={!reCounterRate || isReopening}
                  className="w-full"
                >
                  <Send className="mr-2 h-4 w-4" />
                  {isReopening ? 'Sending...' : 'Send New Proposal'}
                </Button>
              </div>
            )}

            <Button
              onClick={handleRemove}
              variant="outline"
              className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Remove from Campaign
            </Button>
          </div>
        )}

        {/* Message Input */}
        {!isArchived && (
          <>
            <Separator className="my-4" />
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Send a Message
              </h3>
              <div className="flex gap-2">
                <Textarea
                  value={noteMessage}
                  onChange={(e) => setNoteMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="min-h-[60px] resize-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault()
                      handleSendNote()
                    }
                  }}
                />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">
                  Press ⌘+Enter to send
                </span>
                <Button
                  onClick={handleSendNote}
                  disabled={!noteMessage.trim() || isSendingNote}
                  size="sm"
                >
                  <Send className="mr-2 h-4 w-4" />
                  {isSendingNote ? 'Sending...' : 'Send'}
                </Button>
              </div>
            </div>
          </>
        )}

        <Separator className="my-4" />

        {/* Timeline */}
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Negotiation Timeline
          </h3>

          {timelineItems.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              No proposal activity yet.
            </p>
          ) : (
            <div className="mt-4 space-y-0">
              {timelineItems.map((item, index) => (
                <div
                  key={item.data.id}
                  className="relative pl-8 pb-6 last:pb-0"
                >
                  {/* Vertical line - don't show after last item */}
                  {index < timelineItems.length - 1 && (
                    <div className="absolute left-[11px] top-6 bottom-0 w-px bg-border" />
                  )}

                  {item.type === 'proposal' ? (
                    <>
                      {/* Icon circle for proposal */}
                      <div
                        className={`absolute left-0 w-6 h-6 rounded-full flex items-center justify-center ${getEntryIconStyle(
                          item.data.state,
                          item.data.createdByType
                        )}`}
                      >
                        {getEntryIcon(item.data.state)}
                      </div>

                      {/* Content for proposal */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">
                            {getActionText(item.data.createdByType, item.data.state)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatShortDateTime(item.data.createdAt)}
                          </span>
                        </div>

                        {item.data.rateAmount && (
                          <div className="text-sm">
                            <span className="font-semibold">
                              {formatRate(item.data.rateAmount, item.data.rateCurrency)}
                            </span>
                          </div>
                        )}

                        {item.data.notes && (
                          <p className="text-sm text-muted-foreground italic">
                            &ldquo;{item.data.notes}&rdquo;
                          </p>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Icon circle for note */}
                      <div
                        className={`absolute left-0 w-6 h-6 rounded-full flex items-center justify-center ${
                          item.data.createdByType.toLowerCase() === 'agency'
                            ? 'bg-purple-100 text-purple-600'
                            : 'bg-teal-100 text-teal-600'
                        }`}
                      >
                        <MessageCircle className="h-3 w-3" />
                      </div>

                      {/* Content for note */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">
                            {item.data.createdByType.toLowerCase() === 'agency'
                              ? 'Agency message'
                              : 'Creator message'}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatShortDateTime(item.data.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {item.data.message}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

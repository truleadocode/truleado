"use client"

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
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
import { Textarea } from '@/components/ui/textarea'
import { DatePicker } from '@/components/ui/date-picker'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { graphqlRequest, mutations } from '@/lib/graphql/client'

const CONTENT_TYPE_OPTIONS = [
  { value: 'Instagram Post', label: 'Instagram Post' },
  { value: 'Instagram Story', label: 'Instagram Story' },
  { value: 'Reels', label: 'Reels' },
  { value: 'YouTube Video', label: 'YouTube Video' },
  { value: 'YouTube Shorts', label: 'YouTube Shorts' },
  { value: 'TikTok Video', label: 'TikTok Video' },
  { value: 'Facebook Post', label: 'Facebook Post' },
  { value: 'Twitter Post', label: 'Twitter / X Post' },
  { value: 'Blog Post', label: 'Blog Post' },
  { value: 'LinkedIn Post', label: 'LinkedIn Post' },
]

interface AddDeliverableDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  campaignId: string
  creatorId?: string
  creatorName?: string
  creators?: { id: string; displayName: string }[]
  onSuccess: () => void
}

export function AddDeliverableDialog({
  open,
  onOpenChange,
  campaignId,
  creatorId: preselectedCreatorId,
  creatorName: preselectedCreatorName,
  creators = [],
  onSuccess,
}: AddDeliverableDialogProps) {
  const { toast } = useToast()

  const [deliverableType, setDeliverableType] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined)
  const [selectedCreatorId, setSelectedCreatorId] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const effectiveCreatorId = preselectedCreatorId || (selectedCreatorId && selectedCreatorId !== 'none' ? selectedCreatorId : undefined)
  const effectiveCreatorName = preselectedCreatorName || creators.find((c) => c.id === selectedCreatorId)?.displayName || undefined

  const handleSubmit = async () => {
    if (!deliverableType) {
      toast({ title: 'Please select a content type', variant: 'destructive' })
      return
    }

    const finalTitle = title.trim() || (effectiveCreatorName ? `${deliverableType} - ${effectiveCreatorName}` : deliverableType)

    setSubmitting(true)
    try {
      // Create the deliverable
      const result = await graphqlRequest<{ createDeliverable: { id: string } }>(
        mutations.createDeliverable,
        {
          campaignId,
          title: finalTitle,
          deliverableType,
          description: description || null,
          dueDate: dueDate ? dueDate.toISOString() : null,
        }
      )

      // Assign to creator if one is selected
      if (effectiveCreatorId) {
        await graphqlRequest(mutations.assignDeliverableToCreator, {
          deliverableId: result.createDeliverable.id,
          creatorId: effectiveCreatorId,
        })
      }

      toast({ title: 'Deliverable created' })
      resetForm()
      onOpenChange(false)
      onSuccess()
    } catch (err) {
      toast({
        title: err instanceof Error ? err.message : 'Failed to create deliverable',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setDeliverableType('')
    setTitle('')
    setDescription('')
    setDueDate(undefined)
    setSelectedCreatorId('')
  }

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) resetForm()
    onOpenChange(isOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {preselectedCreatorName ? `Add Deliverable for ${preselectedCreatorName}` : 'Add Deliverable'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Creator selector — only shown when no creator is preselected */}
          {!preselectedCreatorId && creators.length > 0 && (
            <div className="space-y-2">
              <Label>Creator (optional)</Label>
              <Select value={selectedCreatorId} onValueChange={setSelectedCreatorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {creators.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.displayName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Content Type *</Label>
            <Select value={deliverableType} onValueChange={setDeliverableType}>
              <SelectTrigger>
                <SelectValue placeholder="Select content type" />
              </SelectTrigger>
              <SelectContent>
                {CONTENT_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Title (optional)</Label>
            <Input
              placeholder={deliverableType ? (effectiveCreatorName ? `${deliverableType} - ${effectiveCreatorName}` : deliverableType) : 'Auto-generated from type'}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Description (optional)</Label>
            <Textarea
              placeholder="Deliverable details..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Due Date (optional)</Label>
            <DatePicker
              date={dueDate}
              onDateChange={setDueDate}
              placeholder="Select due date"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!deliverableType || submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Deliverable
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

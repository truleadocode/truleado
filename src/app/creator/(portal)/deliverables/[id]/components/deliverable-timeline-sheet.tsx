'use client'

import { useState, useMemo } from 'react'
import { format } from 'date-fns'
import {
  Upload,
  MessageCircle,
  CheckCircle,
  XCircle,
  Send,
  Activity,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'

interface DeliverableVersion {
  id: string
  versionNumber: number
  fileName: string | null
  createdAt: string
  uploadedBy: { id: string; name: string | null; email: string } | null
}

interface DeliverableComment {
  id: string
  message: string
  createdByType: string
  createdAt: string
  createdBy: { id: string; name: string | null; email: string } | null
}

interface Approval {
  id: string
  decision: string
  approvalLevel: string
  comment: string | null
  decidedAt: string
  decidedBy: { id: string; name: string | null; email: string }
}

interface SubmissionEvent {
  id: string
  createdAt: string
  submittedBy: { id: string; name: string | null; email: string } | null
}

interface DeliverableTimelineSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  deliverableTitle: string
  versions: DeliverableVersion[]
  comments: DeliverableComment[]
  approvals: Approval[]
  submissionEvents?: SubmissionEvent[]
  onAddComment: (message: string) => Promise<void>
  isCreator?: boolean
}

// Timeline item types
type TimelineItem =
  | { type: 'version'; data: DeliverableVersion }
  | { type: 'comment'; data: DeliverableComment }
  | { type: 'approval'; data: Approval }
  | { type: 'submission'; data: SubmissionEvent }

const formatShortDateTime = (dateString: string) => {
  return format(new Date(dateString), 'MMM d, yyyy h:mm a')
}

export function DeliverableTimelineSheet({
  open,
  onOpenChange,
  deliverableTitle,
  versions,
  comments,
  approvals,
  submissionEvents = [],
  onAddComment,
  isCreator = false,
}: DeliverableTimelineSheetProps) {
  const [commentMessage, setCommentMessage] = useState('')
  const [isSendingComment, setIsSendingComment] = useState(false)

  // Merge all items into a single timeline, sorted newest first
  const timelineItems = useMemo<TimelineItem[]>(() => {
    const items: TimelineItem[] = [
      ...versions.map((v) => ({ type: 'version' as const, data: v })),
      ...comments.map((c) => ({ type: 'comment' as const, data: c })),
      ...approvals.map((a) => ({ type: 'approval' as const, data: a })),
      ...submissionEvents.map((s) => ({ type: 'submission' as const, data: s })),
    ]
    return items.sort((a, b) => {
      const dateA = a.type === 'approval' ? a.data.decidedAt : a.data.createdAt
      const dateB = b.type === 'approval' ? b.data.decidedAt : b.data.createdAt
      return new Date(dateB).getTime() - new Date(dateA).getTime()
    })
  }, [versions, comments, approvals, submissionEvents])

  const handleSendComment = async () => {
    if (!commentMessage.trim()) return
    setIsSendingComment(true)
    try {
      await onAddComment(commentMessage.trim())
      setCommentMessage('')
    } finally {
      setIsSendingComment(false)
    }
  }

  const getItemIcon = (item: TimelineItem) => {
    switch (item.type) {
      case 'version':
        return <Upload className="h-3 w-3" />
      case 'comment':
        return <MessageCircle className="h-3 w-3" />
      case 'submission':
        return <Send className="h-3 w-3" />
      case 'approval':
        return item.data.decision === 'APPROVED' ? (
          <CheckCircle className="h-3 w-3" />
        ) : (
          <XCircle className="h-3 w-3" />
        )
    }
  }

  const getItemIconStyle = (item: TimelineItem) => {
    switch (item.type) {
      case 'version':
        return 'bg-blue-100 text-blue-600'
      case 'comment':
        return item.data.createdByType === 'agency'
          ? 'bg-purple-100 text-purple-600'
          : 'bg-teal-100 text-teal-600'
      case 'submission':
        return 'bg-indigo-100 text-indigo-600'
      case 'approval':
        return item.data.decision === 'APPROVED'
          ? 'bg-green-100 text-green-600'
          : 'bg-red-100 text-red-600'
    }
  }

  const getApprovalLevelLabel = (level: string) => {
    switch (level.toLowerCase()) {
      case 'internal':
        return 'Internal'
      case 'project':
        return 'Project'
      case 'client':
        return 'Client'
      default:
        return level
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:w-3/4 sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Activity Timeline
          </SheetTitle>
          <SheetDescription>{deliverableTitle}</SheetDescription>
        </SheetHeader>

        {/* Comment Input */}
        <div className="space-y-2 mb-6">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Add a Comment
          </h3>
          <Textarea
            value={commentMessage}
            onChange={(e) => setCommentMessage(e.target.value)}
            placeholder={
              isCreator
                ? 'Add a comment for the agency team...'
                : 'Add a comment for the creator...'
            }
            className="min-h-[60px] resize-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                handleSendComment()
              }
            }}
          />
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">
              Press Cmd/Ctrl+Enter to send
            </span>
            <Button
              onClick={handleSendComment}
              disabled={!commentMessage.trim() || isSendingComment}
              size="sm"
            >
              <Send className="mr-2 h-4 w-4" />
              {isSendingComment ? 'Sending...' : 'Send'}
            </Button>
          </div>
        </div>

        <Separator className="my-4" />

        {/* Timeline */}
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Timeline
          </h3>

          {timelineItems.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              No activity yet.
            </p>
          ) : (
            <div className="mt-4 space-y-0">
              {timelineItems.map((item, index) => (
                <div
                  key={`${item.type}-${item.data.id}`}
                  className="relative pl-8 pb-6 last:pb-0"
                >
                  {index < timelineItems.length - 1 && (
                    <div className="absolute left-[11px] top-6 bottom-0 w-px bg-border" />
                  )}

                  <div
                    className={`absolute left-0 w-6 h-6 rounded-full flex items-center justify-center ${getItemIconStyle(item)}`}
                  >
                    {getItemIcon(item)}
                  </div>

                  <div className="space-y-1">
                    {item.type === 'version' && (
                      <>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">
                            Version {item.data.versionNumber} uploaded
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatShortDateTime(item.data.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {item.data.fileName || 'File'}
                          {item.data.uploadedBy && (
                            <>
                              {' '}
                              by {item.data.uploadedBy.name || item.data.uploadedBy.email}
                            </>
                          )}
                        </p>
                      </>
                    )}

                    {item.type === 'comment' && (
                      <>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">
                            {item.data.createdByType === 'agency' ? 'Agency' : 'Creator'} comment
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatShortDateTime(item.data.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm bg-muted/50 rounded-md p-2 mt-1">
                          {item.data.message}
                        </p>
                        {item.data.createdBy && (
                          <p className="text-xs text-muted-foreground">
                            by {item.data.createdBy.name || item.data.createdBy.email}
                          </p>
                        )}
                      </>
                    )}

                    {item.type === 'submission' && (
                      <>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">
                            Submitted for review
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatShortDateTime(item.data.createdAt)}
                          </span>
                        </div>
                        {item.data.submittedBy && (
                          <p className="text-xs text-muted-foreground">
                            by {item.data.submittedBy.name || item.data.submittedBy.email}
                          </p>
                        )}
                      </>
                    )}

                    {item.type === 'approval' && (
                      <>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium capitalize">
                            {item.data.decision === 'APPROVED' ? 'Approved' : 'Rejected'} -{' '}
                            {getApprovalLevelLabel(item.data.approvalLevel)} review
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatShortDateTime(item.data.decidedAt)}
                          </span>
                        </div>
                        {item.data.comment && (
                          <p className="text-sm bg-muted/50 rounded-md p-2 mt-1 italic">
                            &ldquo;{item.data.comment}&rdquo;
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          by {item.data.decidedBy.name || item.data.decidedBy.email}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

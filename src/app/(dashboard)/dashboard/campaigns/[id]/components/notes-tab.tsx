"use client"

import { useState } from 'react'
import {
  Pin,
  Trash2,
  Send,
  Clock,
  MessageSquare,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { ActivityLog } from '../types'

// Since there's no campaign-specific notes system yet, we repurpose activity logs
// and provide a simple in-page notes UI that can be wired up when the backend supports it

interface NotesTabProps {
  activityLogs: ActivityLog[]
}

function getInitials(name: string | null | undefined) {
  if (!name) return '?'
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

function timeAgo(dateStr: string) {
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function NotesTab({ activityLogs }: NotesTabProps) {
  const [newNote, setNewNote] = useState('')
  const [noteType, setNoteType] = useState('general')

  // The notes feature for campaigns is not yet backed by a GraphQL endpoint.
  // For now, we show activity logs as a feed and provide a placeholder for note creation.

  return (
    <div className="space-y-4">
      {/* Add Note */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Select value={noteType} onValueChange={setNoteType}>
              <SelectTrigger className="w-[150px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="client_feedback">Client Feedback</SelectItem>
                <SelectItem value="internal">Internal</SelectItem>
                <SelectItem value="blocker">Blocker</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Textarea
            placeholder="Add a note about this campaign..."
            rows={3}
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
          />
          <div className="flex justify-end">
            <Button size="sm" disabled={!newNote.trim()}>
              <Send className="mr-1.5 h-4 w-4" />
              Add Note
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Activity / Notes Feed */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Activity & Notes</h3>
        {activityLogs.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center py-8">
              <MessageSquare className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">No activity yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {activityLogs.map((log) => (
              <Card key={log.id}>
                <CardContent className="p-3 flex items-start gap-3">
                  <Avatar className="h-7 w-7 mt-0.5">
                    <AvatarFallback className="text-[9px]">{getInitials(log.actor?.name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="font-medium">{log.actor?.name || 'System'}</span>
                      {' '}
                      <span className="text-muted-foreground">{log.action}</span>
                    </p>
                    {log.entityType && (
                      <Badge variant="outline" className="text-[10px] mt-1">{log.entityType}</Badge>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                      <Clock className="h-2.5 w-2.5" />
                      {timeAgo(log.createdAt)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

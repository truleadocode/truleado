"use client"

import { useState, useEffect, useCallback } from 'react'
import {
  Pin,
  Trash2,
  Send,
  Clock,
  MessageSquare,
  Pencil,
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
import { graphqlRequest, queries, mutations } from '@/lib/graphql/client'
import { useToast } from '@/hooks/use-toast'

interface CampaignNote {
  id: string
  message: string
  noteType: string | null
  isPinned: boolean
  createdBy: { id: string; name: string; email: string }
  updatedAt: string
  createdAt: string
}

interface NotesTabProps {
  campaignId: string
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

const NOTE_TYPE_COLORS: Record<string, string> = {
  general: 'bg-gray-100 text-gray-700',
  client_feedback: 'bg-blue-100 text-blue-700',
  internal: 'bg-purple-100 text-purple-700',
  blocker: 'bg-red-100 text-red-700',
}

export function NotesTab({ campaignId }: NotesTabProps) {
  const { toast } = useToast()
  const [notes, setNotes] = useState<CampaignNote[]>([])
  const [loading, setLoading] = useState(true)
  const [newNote, setNewNote] = useState('')
  const [noteType, setNoteType] = useState('general')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editMessage, setEditMessage] = useState('')

  const fetchNotes = useCallback(async () => {
    try {
      const data = await graphqlRequest<{ campaignNotes: CampaignNote[] }>(
        queries.campaignNotes,
        { campaignId }
      )
      setNotes(data.campaignNotes)
    } catch {
      // silently fail on fetch
    } finally {
      setLoading(false)
    }
  }, [campaignId])

  useEffect(() => {
    fetchNotes()
  }, [fetchNotes])

  const handleAddNote = async () => {
    if (!newNote.trim()) return
    try {
      await graphqlRequest(mutations.createCampaignNote, {
        campaignId,
        message: newNote.trim(),
        noteType,
      })
      setNewNote('')
      setNoteType('general')
      toast({ title: 'Note added' })
      await fetchNotes()
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : 'Failed to add note', variant: 'destructive' })
    }
  }

  const handleDeleteNote = async (id: string) => {
    try {
      await graphqlRequest(mutations.deleteCampaignNote, { id })
      toast({ title: 'Note deleted' })
      await fetchNotes()
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : 'Failed to delete note', variant: 'destructive' })
    }
  }

  const handleTogglePin = async (note: CampaignNote) => {
    try {
      await graphqlRequest(mutations.updateCampaignNote, {
        id: note.id,
        isPinned: !note.isPinned,
      })
      await fetchNotes()
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : 'Failed to update note', variant: 'destructive' })
    }
  }

  const handleSaveEdit = async (id: string) => {
    if (!editMessage.trim()) return
    try {
      await graphqlRequest(mutations.updateCampaignNote, {
        id,
        message: editMessage.trim(),
      })
      setEditingId(null)
      toast({ title: 'Note updated' })
      await fetchNotes()
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : 'Failed to update note', variant: 'destructive' })
    }
  }

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
            <Button size="sm" disabled={!newNote.trim()} onClick={handleAddNote}>
              <Send className="mr-1.5 h-4 w-4" />
              Add Note
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notes Feed */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Notes ({notes.length})</h3>
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        ) : notes.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center py-8">
              <MessageSquare className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">No notes yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {notes.map((note) => (
              <Card key={note.id} className={cn(note.isPinned && 'border-yellow-300 bg-yellow-50/50')}>
                <CardContent className="p-3 flex items-start gap-3">
                  <Avatar className="h-7 w-7 mt-0.5">
                    <AvatarFallback className="text-[9px]">{getInitials(note.createdBy?.name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{note.createdBy?.name || 'Unknown'}</span>
                      {note.noteType && (
                        <Badge className={cn('text-[10px]', NOTE_TYPE_COLORS[note.noteType] || 'bg-gray-100')}>
                          {note.noteType.replace('_', ' ')}
                        </Badge>
                      )}
                      {note.isPinned && (
                        <Pin className="h-3 w-3 text-yellow-600" />
                      )}
                    </div>
                    {editingId === note.id ? (
                      <div className="mt-2 space-y-2">
                        <Textarea
                          rows={2}
                          value={editMessage}
                          onChange={(e) => setEditMessage(e.target.value)}
                        />
                        <div className="flex gap-2">
                          <Button size="sm" className="h-7 text-xs" onClick={() => handleSaveEdit(note.id)}>Save</Button>
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingId(null)}>Cancel</Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{note.message}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                      <Clock className="h-2.5 w-2.5" />
                      {timeAgo(note.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleTogglePin(note)}
                      title={note.isPinned ? 'Unpin' : 'Pin'}
                    >
                      <Pin className={cn('h-3 w-3', note.isPinned && 'text-yellow-600')} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => {
                        setEditingId(note.id)
                        setEditMessage(note.message)
                      }}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteNote(note.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
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

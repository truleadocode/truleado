"use client"

import { useState } from 'react'
import {
  Plus,
  Pin,
  PinOff,
  Pencil,
  Trash2,
  StickyNote,
  X,
  Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import type { ProjectNote } from '../types'

interface NotesTabProps {
  notes: ProjectNote[]
  onCreateNote: (message: string) => Promise<void>
  onUpdateNote: (id: string, updates: { message?: string; isPinned?: boolean }) => Promise<void>
  onDeleteNote: (id: string) => Promise<void>
}

function getInitials(name: string | null | undefined) {
  if (!name) return '?'
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

function timeAgo(dateString: string) {
  const now = Date.now()
  const then = new Date(dateString).getTime()
  const diff = Math.floor((now - then) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  if (diff < 2592000) return `${Math.floor(diff / 604800)}w ago`
  return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function NotesTab({ notes, onCreateNote, onUpdateNote, onDeleteNote }: NotesTabProps) {
  const [newNote, setNewNote] = useState('')
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')

  const handleAdd = async () => {
    if (!newNote.trim()) return
    setAdding(true)
    try {
      await onCreateNote(newNote.trim())
      setNewNote('')
    } finally {
      setAdding(false)
    }
  }

  const startEdit = (note: ProjectNote) => {
    setEditingId(note.id)
    setEditText(note.message)
  }

  const handleSaveEdit = async (id: string) => {
    if (!editText.trim()) return
    await onUpdateNote(id, { message: editText.trim() })
    setEditingId(null)
  }

  return (
    <div className="space-y-4">
      {/* Add note */}
      <Card>
        <CardContent className="p-4">
          <Textarea
            placeholder="Add a note..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            rows={3}
            className="resize-none mb-2"
          />
          <div className="flex justify-end">
            <Button size="sm" onClick={handleAdd} disabled={adding || !newNote.trim()}>
              <Plus className="mr-1 h-4 w-4" />
              {adding ? 'Adding...' : 'Add Note'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notes list */}
      {notes.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <StickyNote className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold">No notes yet</h3>
            <p className="text-muted-foreground text-center mt-2">Add your first note above.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <Card key={note.id} className={cn(note.isPinned && 'border-amber-300 bg-amber-50/50')}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-[10px]">
                        {getInitials(note.createdBy.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-muted-foreground">
                      {note.createdBy.name || note.createdBy.email} · {timeAgo(note.createdAt)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => onUpdateNote(note.id, { isPinned: !note.isPinned })}
                    >
                      {note.isPinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => startEdit(note)}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive hover:text-destructive"
                      onClick={() => onDeleteNote(note.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                {editingId === note.id ? (
                  <div className="mt-2">
                    <Textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      rows={3}
                      className="resize-none mb-2"
                    />
                    <div className="flex gap-1 justify-end">
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                        <X className="h-4 w-4" />
                      </Button>
                      <Button size="sm" onClick={() => handleSaveEdit(note.id)}>
                        <Check className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-2 text-sm whitespace-pre-wrap">{note.message}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

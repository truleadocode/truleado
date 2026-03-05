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
import type { ClientNote } from '../types'

interface NotesTabProps {
  notes: ClientNote[]
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
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [saving, setSaving] = useState(false)

  const handleCreate = async () => {
    if (!newNote.trim()) return
    setCreating(true)
    try {
      await onCreateNote(newNote.trim())
      setNewNote('')
    } finally {
      setCreating(false)
    }
  }

  const startEdit = (note: ClientNote) => {
    setEditingId(note.id)
    setEditText(note.message)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditText('')
  }

  const saveEdit = async () => {
    if (!editingId || !editText.trim()) return
    setSaving(true)
    try {
      await onUpdateNote(editingId, { message: editText.trim() })
      setEditingId(null)
      setEditText('')
    } finally {
      setSaving(false)
    }
  }

  const handleTogglePin = async (note: ClientNote) => {
    await onUpdateNote(note.id, { isPinned: !note.isPinned })
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this note?')) return
    await onDeleteNote(id)
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Notes</h2>

      {/* Add note input */}
      <Card>
        <CardContent className="p-4">
          <Textarea
            placeholder="Add a note..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            rows={3}
            className="resize-none"
          />
          <div className="flex justify-end mt-2">
            <Button size="sm" onClick={handleCreate} disabled={!newNote.trim() || creating}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              {creating ? 'Adding...' : 'Add Note'}
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
            <p className="text-muted-foreground text-center mt-2 max-w-sm">
              Add notes to keep track of important information about this client.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {notes.map((note) => (
            <Card key={note.id} className={note.isPinned ? 'border-amber-200 bg-amber-50/30' : ''}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  {/* Author + timestamp */}
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-[10px]">
                        {getInitials(note.createdBy?.name || note.createdBy?.email)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">
                      {note.createdBy?.name || note.createdBy?.email}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {timeAgo(note.createdAt)}
                    </span>
                    {note.isPinned && (
                      <Pin className="h-3 w-3 text-amber-500 fill-amber-500" />
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-0.5 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleTogglePin(note)}
                      title={note.isPinned ? 'Unpin' : 'Pin'}
                    >
                      {note.isPinned ? (
                        <PinOff className="h-3.5 w-3.5 text-amber-500" />
                      ) : (
                        <Pin className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => startEdit(note)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => handleDelete(note.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Note content — show textarea when editing */}
                {editingId === note.id ? (
                  <div className="mt-2">
                    <Textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      rows={3}
                      className="resize-none"
                    />
                    <div className="flex items-center gap-2 mt-2 justify-end">
                      <Button variant="ghost" size="sm" onClick={cancelEdit}>
                        <X className="mr-1 h-3.5 w-3.5" />
                        Cancel
                      </Button>
                      <Button size="sm" onClick={saveEdit} disabled={saving || !editText.trim()}>
                        <Check className="mr-1 h-3.5 w-3.5" />
                        {saving ? 'Saving...' : 'Save'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm mt-2 whitespace-pre-wrap">{note.message}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

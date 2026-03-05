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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Textarea } from '@/components/ui/textarea'
import type { ContactNote } from '../types'

interface ContactNotesSectionProps {
  notes: ContactNote[]
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

export function ContactNotesSection({ notes, onCreateNote, onUpdateNote, onDeleteNote }: ContactNotesSectionProps) {
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

  const startEdit = (note: ContactNote) => {
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

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Notes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Add note */}
        <div>
          <Textarea
            placeholder="Add a note..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            rows={2}
            className="resize-none"
          />
          <div className="flex justify-end mt-2">
            <Button size="sm" onClick={handleCreate} disabled={!newNote.trim() || creating}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              {creating ? 'Adding...' : 'Add Note'}
            </Button>
          </div>
        </div>

        {/* Notes list */}
        {notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8">
            <StickyNote className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No notes yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notes.map((note) => (
              <div
                key={note.id}
                className={`rounded-lg border p-3 ${note.isPinned ? 'border-amber-200 bg-amber-50/30' : ''}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-5 w-5">
                      <AvatarFallback className="text-[9px]">
                        {getInitials(note.createdBy?.name || note.createdBy?.email)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium">{note.createdBy?.name || note.createdBy?.email}</span>
                    <span className="text-[11px] text-muted-foreground">{timeAgo(note.createdAt)}</span>
                    {note.isPinned && <Pin className="h-3 w-3 text-amber-500 fill-amber-500" />}
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => onUpdateNote(note.id, { isPinned: !note.isPinned })}
                      title={note.isPinned ? 'Unpin' : 'Pin'}
                    >
                      {note.isPinned ? (
                        <PinOff className="h-3 w-3 text-amber-500" />
                      ) : (
                        <Pin className="h-3 w-3 text-muted-foreground" />
                      )}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => startEdit(note)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive"
                      onClick={() => { if (confirm('Delete this note?')) onDeleteNote(note.id) }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {editingId === note.id ? (
                  <div className="mt-2">
                    <Textarea value={editText} onChange={(e) => setEditText(e.target.value)} rows={2} className="resize-none" />
                    <div className="flex items-center gap-2 mt-2 justify-end">
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={cancelEdit}>
                        <X className="mr-1 h-3 w-3" /> Cancel
                      </Button>
                      <Button size="sm" className="h-7 text-xs" onClick={saveEdit} disabled={saving || !editText.trim()}>
                        <Check className="mr-1 h-3 w-3" /> {saving ? 'Saving...' : 'Save'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm mt-2 whitespace-pre-wrap">{note.message}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

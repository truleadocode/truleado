"use client"

import Link from 'next/link'
import {
  Phone,
  Mail,
  Video,
  MessageCircle,
  MoreHorizontal,
  Plus,
  Bell,
  BellOff,
  Trash2,
  Users,
  Cake,
  Calendar,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import type { ContactDetail, ContactInteraction, ContactReminder, RelatedContact } from '../types'

interface ContactSidebarProps {
  contact: ContactDetail
  interactions: ContactInteraction[]
  reminders: ContactReminder[]
  onLogInteraction: () => void
  onAddReminder: () => void
  onDismissReminder: (id: string) => Promise<void>
  onDeleteReminder: (id: string) => Promise<void>
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

function formatShortDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric',
  })
}

function timeAgo(dateString: string) {
  const now = Date.now()
  const then = new Date(dateString).getTime()
  const diff = Math.floor((now - then) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return formatShortDate(dateString)
}

function getInitials(first: string, last: string) {
  return `${first?.[0] || ''}${last?.[0] || ''}`.toUpperCase() || '?'
}

const interactionIcons: Record<string, typeof Phone> = {
  call: Phone,
  email: Mail,
  meeting: Video,
  whatsapp: MessageCircle,
}

const contactTypeColors: Record<string, string> = {
  decision_maker: 'bg-purple-100 text-purple-700',
  influencer: 'bg-blue-100 text-blue-700',
  champion: 'bg-teal-100 text-teal-700',
  end_user: 'bg-gray-100 text-gray-700',
  gatekeeper: 'bg-orange-100 text-orange-700',
}

function formatContactType(type: string | null) {
  if (!type) return null
  return type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
}

function isBirthdaySoon(birthday: string | null, daysAhead = 30): boolean {
  if (!birthday) return false
  const today = new Date()
  const bday = new Date(birthday)
  bday.setFullYear(today.getFullYear())
  if (bday < today) bday.setFullYear(today.getFullYear() + 1)
  const diff = (bday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  return diff >= 0 && diff <= daysAhead
}

export function ContactSidebar({
  contact,
  interactions,
  reminders,
  onLogInteraction,
  onAddReminder,
  onDismissReminder,
  onDeleteReminder,
}: ContactSidebarProps) {
  const relatedContacts = (contact.client.contacts || []).filter(
    (c: RelatedContact) => c.id !== contact.id
  )

  return (
    <aside className="w-[300px] shrink-0 space-y-4">
      {/* Internal Info */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Internal Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Contact Type</span>
            <span className="font-medium capitalize">
              {formatContactType(contact.contactType) || '—'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Notification</span>
            <span className="font-medium capitalize">
              {contact.notificationPreference || '—'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Date Added</span>
            <span className="font-medium">{formatDate(contact.createdAt)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Last Updated</span>
            <span className="font-medium">{formatDate(contact.updatedAt)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Interaction Tracker */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Interactions</CardTitle>
            <span className="text-xs text-muted-foreground">{interactions.length} total</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button size="sm" variant="outline" className="w-full" onClick={onLogInteraction}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Log Interaction
          </Button>

          {interactions.length > 0 ? (
            <div className="space-y-2">
              {interactions.slice(0, 5).map((interaction) => {
                const Icon = interactionIcons[interaction.interactionType] || MoreHorizontal
                return (
                  <div key={interaction.id} className="flex items-start gap-2">
                    <div className="mt-0.5 h-6 w-6 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <Icon className="h-3 w-3 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium capitalize">{interaction.interactionType}</span>
                        <span className="text-[11px] text-muted-foreground">
                          {timeAgo(interaction.interactionDate)}
                        </span>
                      </div>
                      {interaction.note && (
                        <p className="text-[11px] text-muted-foreground truncate">{interaction.note}</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-2">No interactions logged</p>
          )}
        </CardContent>
      </Card>

      {/* Reminders */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Reminders</CardTitle>
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onAddReminder}>
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {/* Auto birthday reminder */}
          {contact.birthday && isBirthdaySoon(contact.birthday) && (
            <div className="flex items-center gap-2 p-2 rounded-md bg-pink-50 border border-pink-100">
              <Cake className="h-4 w-4 text-pink-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-pink-700">Birthday coming up!</p>
                <p className="text-[11px] text-pink-600">
                  {new Date(contact.birthday).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                </p>
              </div>
            </div>
          )}

          {reminders.length > 0 ? (
            reminders.map((reminder) => (
              <div key={reminder.id} className="flex items-start gap-2 p-2 rounded-md border">
                <Bell className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs font-medium">{formatDate(reminder.reminderDate)}</span>
                  </div>
                  {reminder.note && (
                    <p className="text-[11px] text-muted-foreground mt-0.5">{reminder.note}</p>
                  )}
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={() => onDismissReminder(reminder.id)}
                    title="Dismiss"
                  >
                    <BellOff className="h-3 w-3 text-muted-foreground" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 text-destructive"
                    onClick={() => onDeleteReminder(reminder.id)}
                    title="Delete"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))
          ) : (
            !contact.birthday || !isBirthdaySoon(contact.birthday) ? (
              <p className="text-xs text-muted-foreground text-center py-2">No active reminders</p>
            ) : null
          )}
        </CardContent>
      </Card>

      {/* Related Contacts */}
      {relatedContacts.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Related Contacts</CardTitle>
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {relatedContacts.slice(0, 5).map((rc: RelatedContact) => {
              const typeColor = rc.contactType ? contactTypeColors[rc.contactType] || 'bg-gray-100 text-gray-700' : null
              return (
                <Link
                  key={rc.id}
                  href={`/dashboard/contacts/${rc.id}`}
                  className="flex items-center gap-2 p-1.5 rounded-md hover:bg-muted/50 transition-colors"
                >
                  <Avatar className="h-7 w-7">
                    {rc.profilePhotoUrl && <AvatarImage src={rc.profilePhotoUrl} />}
                    <AvatarFallback className="text-[10px]">
                      {getInitials(rc.firstName, rc.lastName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-medium block truncate">
                      {rc.firstName} {rc.lastName}
                    </span>
                    {rc.jobTitle && (
                      <span className="text-[11px] text-muted-foreground block truncate">{rc.jobTitle}</span>
                    )}
                  </div>
                  {typeColor && (
                    <Badge variant="secondary" className={`text-[9px] px-1.5 py-0 ${typeColor}`}>
                      {formatContactType(rc.contactType)}
                    </Badge>
                  )}
                </Link>
              )
            })}
          </CardContent>
        </Card>
      )}
    </aside>
  )
}

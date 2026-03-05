"use client"

import { useState } from 'react'
import {
  Plus,
  Pencil,
  Trash2,
  Users,
  Star,
  Copy,
  Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Contact } from '../types'

interface ContactsTabProps {
  contacts: Contact[]
  onAddContact: () => void
  onEditContact: (contact: Contact) => void
  onDeleteContact: (contactId: string) => void
  clientName: string
}

const contactTypeBadge: Record<string, { label: string; color: string }> = {
  decision_maker: { label: 'Decision Maker', color: 'bg-purple-100 text-purple-700' },
  influencer: { label: 'Influencer', color: 'bg-blue-100 text-blue-700' },
  champion: { label: 'Champion', color: 'bg-teal-100 text-teal-700' },
  end_user: { label: 'End User', color: 'bg-gray-100 text-gray-600' },
  billing: { label: 'Billing', color: 'bg-amber-100 text-amber-700' },
  technical: { label: 'Technical', color: 'bg-indigo-100 text-indigo-700' },
}

const contactStatusBadge: Record<string, { label: string; color: string }> = {
  active: { label: 'Active', color: 'bg-green-100 text-green-700' },
  inactive: { label: 'Inactive', color: 'bg-gray-100 text-gray-500' },
  left_company: { label: 'Left Company', color: 'bg-red-100 text-red-600' },
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

export function ContactsTab({
  contacts,
  onAddContact,
  onEditContact,
  onDeleteContact,
  clientName,
}: ContactsTabProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  // Sort: primary contacts first, then by name
  const sorted = [...contacts].sort((a, b) => {
    if (a.isPrimaryContact !== b.isPrimaryContact) return a.isPrimaryContact ? -1 : 1
    return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Contacts</h2>
        <Button size="sm" onClick={onAddContact}>
          <Plus className="mr-2 h-4 w-4" />
          Add Contact
        </Button>
      </div>

      {sorted.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold">No contacts yet</h3>
            <p className="text-muted-foreground text-center mt-2 max-w-sm">
              Add contacts at {clientName} for approvals and CRM.
            </p>
            <Button className="mt-4" size="sm" onClick={onAddContact}>
              <Plus className="mr-2 h-4 w-4" />
              Add Contact
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[260px]">Contact</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Added</TableHead>
                <TableHead className="w-[100px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((c) => {
                const typeBadge = c.contactType ? contactTypeBadge[c.contactType] : null
                const statusBadge = c.contactStatus ? contactStatusBadge[c.contactStatus] : null

                return (
                  <TableRow key={c.id}>
                    {/* Contact — photo, name, star, job title, type badge */}
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8 shrink-0">
                          {c.profilePhotoUrl && <AvatarImage src={c.profilePhotoUrl} />}
                          <AvatarFallback className="text-xs">
                            {c.firstName[0]}{c.lastName[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-sm truncate">
                              {c.firstName} {c.lastName}
                            </span>
                            {c.isPrimaryContact && (
                              <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500 shrink-0" />
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {c.jobTitle && (
                              <span className="text-xs text-muted-foreground truncate">{c.jobTitle}</span>
                            )}
                            {typeBadge && (
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${typeBadge.color}`}>
                                {typeBadge.label}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    {/* Email with copy */}
                    <TableCell>
                      {c.email ? (
                        <button
                          onClick={() => copyToClipboard(c.email!, `email-${c.id}`)}
                          className="group flex items-center gap-1.5 text-sm hover:text-foreground transition-colors"
                          title="Copy email"
                        >
                          <span className="truncate max-w-[180px]">{c.email}</span>
                          {copiedField === `email-${c.id}` ? (
                            <Check className="h-3 w-3 text-green-500 shrink-0" />
                          ) : (
                            <Copy className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                          )}
                        </button>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>

                    {/* Phone with copy */}
                    <TableCell>
                      {c.phone ? (
                        <button
                          onClick={() => copyToClipboard(c.phone!, `phone-${c.id}`)}
                          className="group flex items-center gap-1.5 text-sm hover:text-foreground transition-colors"
                          title="Copy phone"
                        >
                          <span>{c.phone}</span>
                          {copiedField === `phone-${c.id}` ? (
                            <Check className="h-3 w-3 text-green-500 shrink-0" />
                          ) : (
                            <Copy className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                          )}
                        </button>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      {statusBadge && (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge.color}`}>
                          {statusBadge.label}
                        </span>
                      )}
                    </TableCell>

                    {/* Added date */}
                    <TableCell>
                      <span className="text-xs text-muted-foreground">{timeAgo(c.createdAt)}</span>
                    </TableCell>

                    {/* Actions */}
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEditContact(c)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => onDeleteContact(c.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

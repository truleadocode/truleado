"use client"

import Link from 'next/link'
import {
  Mail,
  MessageCircle,
  Pencil,
  MoreHorizontal,
  Crown,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/ui/status-badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { ContactDetail } from '../types'

interface ContactHeaderProps {
  contact: ContactDetail
  onEditContact: () => void
  onStatusChange: (status: string) => void
  onDeleteContact: () => void
}

const contactStatuses = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'left_company', label: 'Left Company' },
]

const contactTypeColors: Record<string, string> = {
  decision_maker: 'bg-purple-100 text-purple-700',
  influencer: 'bg-blue-100 text-blue-700',
  champion: 'bg-teal-100 text-teal-700',
  end_user: 'bg-gray-100 text-gray-700',
  gatekeeper: 'bg-orange-100 text-orange-700',
}

function getInitials(firstName: string, lastName: string) {
  return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() || '?'
}

function formatContactType(type: string | null) {
  if (!type) return null
  return type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
}

export function ContactHeader({
  contact,
  onEditContact,
  onStatusChange,
  onDeleteContact,
}: ContactHeaderProps) {
  const fullName = `${contact.firstName} ${contact.lastName}`.trim()
  const formattedType = formatContactType(contact.contactType)
  const typeColor = contact.contactType ? contactTypeColors[contact.contactType] || 'bg-gray-100 text-gray-700' : null

  return (
    <div className="space-y-3">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/dashboard/clients" className="hover:text-foreground">Clients</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href={`/dashboard/clients/${contact.client.id}`} className="hover:text-foreground">
          {contact.client.name}
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">{fullName}</span>
      </nav>

      {/* Header row */}
      <div className="flex items-center gap-4">
        {/* Avatar */}
        <Avatar className="h-16 w-16 rounded-full">
          {contact.profilePhotoUrl && <AvatarImage src={contact.profilePhotoUrl} alt={fullName} />}
          <AvatarFallback className="text-lg rounded-full">
            {getInitials(contact.firstName, contact.lastName)}
          </AvatarFallback>
        </Avatar>

        {/* Name + meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-semibold tracking-tight">{fullName}</h1>
            {contact.isPrimaryContact && (
              <span title="Primary Contact"><Crown className="h-4 w-4 text-amber-500 fill-amber-500" /></span>
            )}
            {formattedType && typeColor && (
              <Badge variant="secondary" className={`text-[11px] ${typeColor}`}>
                {formattedType}
              </Badge>
            )}
            <Select
              value={contact.contactStatus || 'active'}
              onValueChange={onStatusChange}
            >
              <SelectTrigger className="h-6 w-auto gap-1 border-none px-0 font-medium text-xs shadow-none focus:ring-0">
                <StatusBadge status={contact.contactStatus || 'active'} />
              </SelectTrigger>
              <SelectContent>
                {contactStatuses.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {[contact.jobTitle, contact.department].filter(Boolean).join(' · ') || 'No title'}
          </p>
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <Button variant="outline" size="sm" onClick={onEditContact}>
            <Pencil className="mr-1.5 h-3.5 w-3.5" />
            Edit
          </Button>
          {contact.email && (
            <Button variant="outline" size="icon" className="h-8 w-8" asChild>
              <a href={`mailto:${contact.email}`} title="Send Email">
                <Mail className="h-4 w-4" />
              </a>
            </Button>
          )}
          {(contact.phone || contact.mobile) && (
            <Button variant="outline" size="icon" className="h-8 w-8" asChild>
              <a
                href={`https://wa.me/${(contact.mobile || contact.phone || '').replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                title="WhatsApp"
              >
                <MessageCircle className="h-4 w-4" />
              </a>
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEditContact}>Edit Contact</DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={onDeleteContact}
              >
                Delete Contact
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
}

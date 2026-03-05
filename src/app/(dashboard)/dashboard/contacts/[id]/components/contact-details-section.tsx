"use client"

import { useState } from 'react'
import {
  Mail,
  Phone,
  Linkedin,
  MessageCircle,
  Cake,
  Copy,
  Check,
  ExternalLink,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { ContactDetail } from '../types'

interface ContactDetailsSectionProps {
  contact: ContactDetail
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={handleCopy}>
      {copied ? (
        <Check className="h-3 w-3 text-green-500" />
      ) : (
        <Copy className="h-3 w-3 text-muted-foreground" />
      )}
    </Button>
  )
}

function isBirthdaySoon(birthday: string | null): boolean {
  if (!birthday) return false
  const today = new Date()
  const bday = new Date(birthday)
  bday.setFullYear(today.getFullYear())
  if (bday < today) bday.setFullYear(today.getFullYear() + 1)
  const diff = (bday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  return diff >= 0 && diff <= 7
}

function formatBirthday(birthday: string | null) {
  if (!birthday) return null
  return new Date(birthday).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
}

export function ContactDetailsSection({ contact }: ContactDetailsSectionProps) {
  const phoneNumber = contact.mobile || contact.phone

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Contact Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Email */}
        {contact.email && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
              <a href={`mailto:${contact.email}`} className="text-sm hover:underline truncate">
                {contact.email}
              </a>
            </div>
            <CopyButton text={contact.email} />
          </div>
        )}

        {/* Phone */}
        {phoneNumber && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm">{phoneNumber}</span>
            </div>
            <div className="flex items-center gap-0.5">
              <CopyButton text={phoneNumber} />
              <Button variant="ghost" size="icon" className="h-6 w-6" asChild>
                <a
                  href={`https://wa.me/${phoneNumber.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="WhatsApp"
                >
                  <MessageCircle className="h-3 w-3 text-muted-foreground" />
                </a>
              </Button>
            </div>
          </div>
        )}

        {/* Office Phone */}
        {contact.officePhone && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm">{contact.officePhone}</span>
              <span className="text-[11px] text-muted-foreground">(Office)</span>
            </div>
            <CopyButton text={contact.officePhone} />
          </div>
        )}

        {/* LinkedIn */}
        {contact.linkedinUrl && (
          <div className="flex items-center gap-2">
            <Linkedin className="h-4 w-4 text-muted-foreground shrink-0" />
            <a
              href={contact.linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline inline-flex items-center gap-1"
            >
              LinkedIn Profile
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}

        {/* Preferred Channel */}
        {contact.preferredChannel && (
          <div className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm text-muted-foreground">Preferred:</span>
            <span className="text-sm font-medium capitalize">{contact.preferredChannel}</span>
          </div>
        )}

        {/* Birthday */}
        {contact.birthday && (
          <div className="flex items-center gap-2">
            <Cake className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm">{formatBirthday(contact.birthday)}</span>
            {isBirthdaySoon(contact.birthday) && (
              <span className="text-xs bg-pink-100 text-pink-700 px-1.5 py-0.5 rounded-full">
                Soon!
              </span>
            )}
          </div>
        )}

        {/* Address */}
        {contact.address && (
          <div className="pt-1 border-t">
            <p className="text-sm text-muted-foreground">{contact.address}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

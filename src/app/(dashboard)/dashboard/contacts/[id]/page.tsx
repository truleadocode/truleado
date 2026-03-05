"use client"

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Header } from '@/components/layout/header'
import { graphqlRequest, queries, mutations } from '@/lib/graphql/client'
import { useToast } from '@/hooks/use-toast'
import { ContactFormDialog, emptyContactForm, type ContactFormData } from '@/components/contacts/contact-form-dialog'
import { ContactHeader } from './components/contact-header'
import { ContactDetailsSection } from './components/contact-details-section'
import { LinkedClientCard } from './components/linked-client-card'
import { CampaignsSection } from './components/campaigns-section'
import { ContactNotesSection } from './components/contact-notes-section'
import { ContactSidebar } from './components/contact-sidebar'
import { LogInteractionDialog } from './components/log-interaction-dialog'
import { AddReminderDialog } from './components/add-reminder-dialog'
import type { ContactDetail, ContactNote, ContactInteraction, ContactReminder } from './types'

export default function ContactDetailPage() {
  const params = useParams()
  const router = useRouter()
  const contactId = params.id as string
  const { toast } = useToast()

  const [contact, setContact] = useState<ContactDetail | null>(null)
  const [notes, setNotes] = useState<ContactNote[]>([])
  const [interactions, setInteractions] = useState<ContactInteraction[]>([])
  const [reminders, setReminders] = useState<ContactReminder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [contactForm, setContactForm] = useState<ContactFormData>({ ...emptyContactForm })
  const [saving, setSaving] = useState(false)
  const [interactionDialogOpen, setInteractionDialogOpen] = useState(false)
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false)

  // ----- Data fetching -----
  const fetchContact = useCallback(async () => {
    try {
      const data = await graphqlRequest<{ contact: ContactDetail }>(queries.contactDetail, { id: contactId })
      setContact(data.contact)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load contact')
    } finally {
      setLoading(false)
    }
  }, [contactId])

  const fetchNotes = useCallback(async () => {
    try {
      const data = await graphqlRequest<{ contactNotes: ContactNote[] }>(queries.contactNotes, { contactId })
      setNotes(data.contactNotes)
    } catch { /* silently fail */ }
  }, [contactId])

  const fetchInteractions = useCallback(async () => {
    try {
      const data = await graphqlRequest<{ contactInteractions: ContactInteraction[] }>(
        queries.contactInteractions, { contactId, limit: 20 }
      )
      setInteractions(data.contactInteractions)
    } catch { /* silently fail */ }
  }, [contactId])

  const fetchReminders = useCallback(async () => {
    try {
      const data = await graphqlRequest<{ contactReminders: ContactReminder[] }>(queries.contactReminders, { contactId })
      setReminders(data.contactReminders)
    } catch { /* silently fail */ }
  }, [contactId])

  useEffect(() => {
    fetchContact()
    fetchNotes()
    fetchInteractions()
    fetchReminders()
  }, [fetchContact, fetchNotes, fetchInteractions, fetchReminders])

  // ----- Contact actions -----
  const handleStatusChange = async (status: string) => {
    try {
      await graphqlRequest(mutations.updateContact, { id: contactId, contactStatus: status })
      toast({ title: 'Status updated' })
      await fetchContact()
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : 'Failed to update status', variant: 'destructive' })
    }
  }

  const handleTogglePrimary = async (isPrimary: boolean) => {
    try {
      await graphqlRequest(mutations.updateContact, { id: contactId, isPrimaryContact: isPrimary })
      toast({ title: isPrimary ? 'Set as primary contact' : 'Removed as primary contact' })
      await fetchContact()
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : 'Failed to update', variant: 'destructive' })
    }
  }

  const openEditContact = () => {
    if (!contact) return
    setContactForm({
      clientId: contact.client.id,
      firstName: contact.firstName,
      lastName: contact.lastName,
      email: contact.email ?? '',
      phone: contact.phone ?? '',
      profilePhotoUrl: contact.profilePhotoUrl ?? '',
      jobTitle: contact.jobTitle ?? '',
      department: contact.department ?? '',
      isPrimaryContact: contact.isPrimaryContact,
      linkedinUrl: contact.linkedinUrl ?? '',
      preferredChannel: contact.preferredChannel ?? '',
      contactType: contact.contactType ?? '',
      contactStatus: contact.contactStatus ?? 'active',
      notificationPreference: contact.notificationPreference ?? '',
      birthday: contact.birthday ?? '',
      notes: contact.notes ?? '',
    })
    setEditDialogOpen(true)
  }

  const handleSaveContact = async () => {
    if (!contactForm.firstName.trim() || !contactForm.lastName.trim()) {
      toast({ title: 'First and last name are required', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      await graphqlRequest(mutations.updateContact, {
        id: contactId,
        firstName: contactForm.firstName.trim(),
        lastName: contactForm.lastName.trim(),
        email: contactForm.email.trim() || null,
        phone: contactForm.phone.trim() || null,
        department: contactForm.department.trim() || null,
        notes: contactForm.notes.trim() || null,
        profilePhotoUrl: contactForm.profilePhotoUrl.trim() || null,
        jobTitle: contactForm.jobTitle.trim() || null,
        isPrimaryContact: contactForm.isPrimaryContact,
        linkedinUrl: contactForm.linkedinUrl.trim() || null,
        preferredChannel: contactForm.preferredChannel || null,
        contactType: contactForm.contactType || null,
        contactStatus: contactForm.contactStatus || null,
        notificationPreference: contactForm.notificationPreference || null,
        birthday: contactForm.birthday || null,
      })
      toast({ title: 'Contact updated' })
      setEditDialogOpen(false)
      await fetchContact()
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : 'Failed to update contact', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteContact = async () => {
    if (!confirm('Delete this contact? This cannot be undone.')) return
    try {
      await graphqlRequest(mutations.deleteContact, { id: contactId })
      toast({ title: 'Contact deleted' })
      router.push('/dashboard/contacts')
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : 'Failed to delete contact', variant: 'destructive' })
    }
  }

  // ----- Notes actions -----
  const handleCreateNote = async (message: string) => {
    try {
      await graphqlRequest(mutations.createContactNote, { contactId, message })
      toast({ title: 'Note added' })
      await fetchNotes()
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : 'Failed to add note', variant: 'destructive' })
    }
  }

  const handleUpdateNote = async (id: string, updates: { message?: string; isPinned?: boolean }) => {
    try {
      await graphqlRequest(mutations.updateContactNote, { id, ...updates })
      await fetchNotes()
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : 'Failed to update note', variant: 'destructive' })
    }
  }

  const handleDeleteNote = async (id: string) => {
    try {
      await graphqlRequest(mutations.deleteContactNote, { id })
      toast({ title: 'Note deleted' })
      await fetchNotes()
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : 'Failed to delete note', variant: 'destructive' })
    }
  }

  // ----- Interaction actions -----
  const handleLogInteraction = async (data: { interactionType: string; interactionDate: string; note: string }) => {
    try {
      await graphqlRequest(mutations.createContactInteraction, {
        contactId,
        interactionType: data.interactionType,
        interactionDate: data.interactionDate,
        note: data.note || null,
      })
      toast({ title: 'Interaction logged' })
      await fetchInteractions()
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : 'Failed to log interaction', variant: 'destructive' })
    }
  }

  // ----- Reminder actions -----
  const handleAddReminder = async (data: { reminderDate: string; note: string }) => {
    try {
      await graphqlRequest(mutations.createContactReminder, {
        contactId,
        reminderType: 'manual',
        reminderDate: data.reminderDate,
        note: data.note || null,
      })
      toast({ title: 'Reminder added' })
      await fetchReminders()
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : 'Failed to add reminder', variant: 'destructive' })
    }
  }

  const handleDismissReminder = async (id: string) => {
    try {
      await graphqlRequest(mutations.dismissContactReminder, { id })
      await fetchReminders()
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : 'Failed to dismiss reminder', variant: 'destructive' })
    }
  }

  const handleDeleteReminder = async (id: string) => {
    try {
      await graphqlRequest(mutations.deleteContactReminder, { id })
      toast({ title: 'Reminder deleted' })
      await fetchReminders()
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : 'Failed to delete reminder', variant: 'destructive' })
    }
  }

  // ----- Loading / Error -----
  if (loading) {
    return (
      <>
        <Header title="Contact" />
        <div className="p-6 space-y-4">
          <div className="h-4 w-48 bg-muted rounded animate-pulse" />
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-muted animate-pulse" />
            <div className="space-y-2">
              <div className="h-6 w-40 bg-muted rounded animate-pulse" />
              <div className="h-4 w-24 bg-muted rounded animate-pulse" />
            </div>
          </div>
          <div className="flex gap-6 mt-6">
            <div className="flex-1 space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-32 bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
            <div className="w-[300px] space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-40 bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </>
    )
  }

  if (error || !contact) {
    return (
      <>
        <Header title="Error" />
        <div className="p-6">
          <Card className="border-destructive bg-destructive/10">
            <CardContent className="p-6 flex flex-col items-center text-center">
              <AlertCircle className="h-12 w-12 text-destructive mb-4" />
              <h3 className="text-lg font-semibold">Failed to load contact</h3>
              <p className="text-muted-foreground mt-2">{error || 'Contact not found'}</p>
              <Button variant="outline" className="mt-4" onClick={() => router.push('/dashboard/contacts')}>
                Back to Contacts
              </Button>
            </CardContent>
          </Card>
        </div>
      </>
    )
  }

  const fullName = `${contact.firstName} ${contact.lastName}`.trim()

  return (
    <>
      <Header title={fullName} />

      <div className="p-6 space-y-6">
        {/* Compact header */}
        <ContactHeader
          contact={contact}
          onEditContact={openEditContact}
          onStatusChange={handleStatusChange}
          onDeleteContact={handleDeleteContact}
        />

        {/* Two-column layout */}
        <div className="flex gap-6">
          {/* Left main content */}
          <div className="flex-1 min-w-0 space-y-6">
            <ContactDetailsSection contact={contact} />
            <LinkedClientCard contact={contact} onTogglePrimary={handleTogglePrimary} />
            <CampaignsSection client={contact.client} />
            <ContactNotesSection
              notes={notes}
              onCreateNote={handleCreateNote}
              onUpdateNote={handleUpdateNote}
              onDeleteNote={handleDeleteNote}
            />
          </div>

          {/* Right sticky sidebar */}
          <div className="sticky top-[57px] self-start">
            <ContactSidebar
              contact={contact}
              interactions={interactions}
              reminders={reminders}
              onLogInteraction={() => setInteractionDialogOpen(true)}
              onAddReminder={() => setReminderDialogOpen(true)}
              onDismissReminder={handleDismissReminder}
              onDeleteReminder={handleDeleteReminder}
            />
          </div>
        </div>
      </div>

      {/* Edit Contact Dialog */}
      <ContactFormDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        mode="edit"
        form={contactForm}
        onFormChange={setContactForm}
        onSubmit={handleSaveContact}
        saving={saving}
      />

      {/* Log Interaction Dialog */}
      <LogInteractionDialog
        open={interactionDialogOpen}
        onOpenChange={setInteractionDialogOpen}
        onSubmit={handleLogInteraction}
      />

      {/* Add Reminder Dialog */}
      <AddReminderDialog
        open={reminderDialogOpen}
        onOpenChange={setReminderDialogOpen}
        onSubmit={handleAddReminder}
      />
    </>
  )
}

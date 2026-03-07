"use client"

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Header } from '@/components/layout/header'
import { PageBreadcrumb } from '@/components/layout/page-breadcrumb'
import { graphqlRequest, queries, mutations } from '@/lib/graphql/client'
import { useToast } from '@/hooks/use-toast'
import { ContactFormDialog, emptyContactForm, type ContactFormData } from '@/components/contacts/contact-form-dialog'
import { ClientEditDialog } from '@/components/clients/client-edit-dialog'
import { ClientSidebar } from './components/client-sidebar'
import { OverviewTab } from './components/overview-tab'
import { ContactsTab } from './components/contacts-tab'
import { ProjectsTab } from './components/projects-tab'
import { CampaignsTab } from './components/campaigns-tab'
import { NotesTab } from './components/notes-tab'
import { FilesTab } from './components/files-tab'
import type { Client, Contact, ClientNote, ActivityLog, ClientFile } from './types'

export default function ClientDetailPage() {
  const params = useParams()
  const router = useRouter()
  const clientId = params.id as string
  const { toast } = useToast()

  const [client, setClient] = useState<Client | null>(null)
  const [notes, setNotes] = useState<ClientNote[]>([])
  const [activityFeed, setActivityFeed] = useState<ActivityLog[]>([])
  const [files, setFiles] = useState<ClientFile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('overview')

  // Contact form state
  const [contactDialogOpen, setContactDialogOpen] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [contactForm, setContactForm] = useState<ContactFormData>({ ...emptyContactForm })
  const [submitting, setSubmitting] = useState(false)

  // Edit client dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false)

  // ----- Data fetching -----
  const fetchClient = useCallback(async () => {
    try {
      const data = await graphqlRequest<{ client: Client }>(queries.client, { id: clientId })
      setClient(data.client)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load client')
    } finally {
      setLoading(false)
    }
  }, [clientId])

  const fetchNotes = useCallback(async () => {
    try {
      const data = await graphqlRequest<{ clientNotes: ClientNote[] }>(queries.clientNotes, { clientId })
      setNotes(data.clientNotes)
    } catch {
      // silently fail for supplementary data
    }
  }, [clientId])

  const fetchActivity = useCallback(async () => {
    try {
      const data = await graphqlRequest<{ clientActivityFeed: ActivityLog[] }>(queries.clientActivityFeed, { clientId, limit: 10 })
      setActivityFeed(data.clientActivityFeed)
    } catch {
      // silently fail
    }
  }, [clientId])

  const fetchFiles = useCallback(async () => {
    try {
      const data = await graphqlRequest<{ clientFiles: ClientFile[] }>(queries.clientFiles, { clientId })
      setFiles(data.clientFiles)
    } catch {
      // silently fail
    }
  }, [clientId])

  useEffect(() => {
    fetchClient()
    fetchNotes()
    fetchActivity()
    fetchFiles()
  }, [fetchClient, fetchNotes, fetchActivity, fetchFiles])

  // ----- Client actions -----
  const handleStatusChange = async (status: string) => {
    try {
      await graphqlRequest(mutations.updateClient, { id: clientId, clientStatus: status })
      toast({ title: 'Status updated' })
      await fetchClient()
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : 'Failed to update status', variant: 'destructive' })
    }
  }

  const handleArchiveClient = async () => {
    try {
      await graphqlRequest(mutations.archiveClient, { id: clientId })
      toast({ title: 'Client archived' })
      router.push('/dashboard/clients')
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : 'Failed to archive client', variant: 'destructive' })
    }
  }

  // ----- Contact actions -----
  const openAddContact = () => {
    setEditingContact(null)
    setContactForm({ ...emptyContactForm })
    setContactDialogOpen(true)
  }

  const openEditContact = (c: Contact) => {
    setEditingContact(c)
    setContactForm({
      clientId: '',
      firstName: c.firstName,
      lastName: c.lastName,
      email: c.email ?? '',
      phone: c.phone ?? '',
      profilePhotoUrl: c.profilePhotoUrl ?? '',
      jobTitle: c.jobTitle ?? '',
      department: c.department ?? '',
      isPrimaryContact: c.isPrimaryContact,
      isClientApprover: c.isClientApprover,
      linkedinUrl: c.linkedinUrl ?? '',
      preferredChannel: c.preferredChannel ?? '',
      contactType: c.contactType ?? '',
      contactStatus: c.contactStatus ?? 'active',
      notificationPreference: c.notificationPreference ?? '',
      birthday: c.birthday ?? '',
      notes: c.notes ?? '',
    })
    setContactDialogOpen(true)
  }

  const handleSaveContact = async () => {
    if (!contactForm.firstName.trim() || !contactForm.lastName.trim()) {
      toast({ title: 'First and last name are required', variant: 'destructive' })
      return
    }
    setSubmitting(true)
    try {
      const commonFields = {
        firstName: contactForm.firstName.trim(),
        lastName: contactForm.lastName.trim(),
        email: contactForm.email.trim() || null,
        phone: contactForm.phone.trim() || null,
        department: contactForm.department.trim() || null,
        notes: contactForm.notes.trim() || null,
        profilePhotoUrl: contactForm.profilePhotoUrl.trim() || null,
        jobTitle: contactForm.jobTitle.trim() || null,
        isPrimaryContact: contactForm.isPrimaryContact,
        isClientApprover: contactForm.isClientApprover,
        linkedinUrl: contactForm.linkedinUrl.trim() || null,
        preferredChannel: contactForm.preferredChannel || null,
        contactType: contactForm.contactType || null,
        contactStatus: contactForm.contactStatus || null,
        notificationPreference: contactForm.notificationPreference || null,
        birthday: contactForm.birthday || null,
      }
      if (editingContact) {
        await graphqlRequest(mutations.updateContact, { id: editingContact.id, ...commonFields })
        toast({ title: 'Contact updated' })
      } else {
        await graphqlRequest(mutations.createContact, { clientId, ...commonFields })
        toast({ title: 'Contact added' })
      }
      setContactDialogOpen(false)
      await fetchClient()
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : 'Failed to save contact', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteContact = async (contactId: string) => {
    if (!confirm('Delete this contact?')) return
    try {
      await graphqlRequest(mutations.deleteContact, { id: contactId })
      toast({ title: 'Contact deleted' })
      await fetchClient()
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : 'Failed to delete contact', variant: 'destructive' })
    }
  }

  // ----- Notes actions -----
  const handleCreateNote = async (message: string) => {
    try {
      await graphqlRequest(mutations.createClientNote, { clientId, message })
      toast({ title: 'Note added' })
      await fetchNotes()
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : 'Failed to add note', variant: 'destructive' })
    }
  }

  const handleUpdateNote = async (id: string, updates: { message?: string; isPinned?: boolean }) => {
    try {
      await graphqlRequest(mutations.updateClientNote, { id, ...updates })
      await fetchNotes()
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : 'Failed to update note', variant: 'destructive' })
    }
  }

  const handleDeleteNote = async (id: string) => {
    try {
      await graphqlRequest(mutations.deleteClientNote, { id })
      toast({ title: 'Note deleted' })
      await fetchNotes()
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : 'Failed to delete note', variant: 'destructive' })
    }
  }

  // ----- Loading / Error states -----
  if (loading) {
    return (
      <>
        <Header title="Client" />
        <div className="flex">
          <div className="w-[260px] shrink-0 border-r p-5 space-y-4">
            <div className="flex flex-col items-center">
              <div className="h-16 w-16 rounded-xl bg-muted animate-pulse" />
              <div className="h-5 w-32 bg-muted rounded animate-pulse mt-3" />
              <div className="h-4 w-20 bg-muted rounded animate-pulse mt-2" />
            </div>
            <div className="space-y-2">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-8 bg-muted rounded animate-pulse" />
              ))}
            </div>
          </div>
          <div className="flex-1 p-6 space-y-6">
            <div className="h-4 w-24 bg-muted rounded animate-pulse" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
            <div className="h-64 bg-muted rounded-lg animate-pulse" />
          </div>
        </div>
      </>
    )
  }

  if (error || !client) {
    return (
      <>
        <Header title="Error" />
        <div className="p-6">
          <Card className="border-destructive bg-destructive/10">
            <CardContent className="p-6 flex flex-col items-center text-center">
              <AlertCircle className="h-12 w-12 text-destructive mb-4" />
              <h3 className="text-lg font-semibold">Failed to load client</h3>
              <p className="text-muted-foreground mt-2">{error || 'Client not found'}</p>
              <Button variant="outline" className="mt-4" onClick={() => router.push('/dashboard/clients')}>
                Back to Clients
              </Button>
            </CardContent>
          </Card>
        </div>
      </>
    )
  }

  const totalCampaigns = client.projects.reduce((sum, p) => sum + p.campaigns.length, 0)

  return (
    <>
      <Header title={client.name} />

      <div className="flex min-h-[calc(100vh-57px)]">
        {/* Left sidebar — sticky */}
        <ClientSidebar
          client={client}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          counts={{
            contacts: client.contacts?.length ?? 0,
            projects: client.projects.length,
            campaigns: totalCampaigns,
            notes: notes.length,
            files: files.length,
          }}
          onStatusChange={handleStatusChange}
          onEditClient={() => setEditDialogOpen(true)}
          onArchiveClient={handleArchiveClient}
          onAddContact={openAddContact}
        />

        {/* Main content area */}
        <main className="flex-1 min-w-0">
          <div className="p-6 space-y-4">
            <PageBreadcrumb items={[
              { label: 'Clients', href: '/dashboard/clients' },
              { label: client.name },
            ]} />

            {activeTab === 'overview' && (
              <OverviewTab client={client} activityFeed={activityFeed} />
            )}

            {activeTab === 'contacts' && (
              <ContactsTab
                contacts={client.contacts || []}
                onAddContact={openAddContact}
                onEditContact={openEditContact}
                onDeleteContact={handleDeleteContact}
                clientName={client.name}
              />
            )}

            {activeTab === 'projects' && (
              <ProjectsTab
                projects={client.projects}
                clientId={client.id}
                clientCurrency={client.currency}
              />
            )}

            {activeTab === 'campaigns' && (
              <CampaignsTab
                projects={client.projects}
                clientCurrency={client.currency}
              />
            )}

            {activeTab === 'notes' && (
              <NotesTab
                notes={notes}
                onCreateNote={handleCreateNote}
                onUpdateNote={handleUpdateNote}
                onDeleteNote={handleDeleteNote}
              />
            )}

            {activeTab === 'files' && (
              <FilesTab
                files={files}
                projects={client.projects}
              />
            )}
          </div>
        </main>
      </div>

      {/* Contact Dialog */}
      <ContactFormDialog
        open={contactDialogOpen}
        onOpenChange={setContactDialogOpen}
        mode={editingContact ? 'edit' : 'create'}
        form={contactForm}
        onFormChange={(f) => setContactForm(f)}
        onSubmit={handleSaveContact}
        saving={submitting}
      />

      {/* Edit Client Dialog */}
      <ClientEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        client={client}
        onUpdated={() => {
          toast({ title: 'Client updated' })
          fetchClient()
        }}
      />
    </>
  )
}

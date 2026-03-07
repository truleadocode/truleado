"use client"

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Users, Search, Building2, Eye, Pencil, Trash2, Plus, Copy, Star, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Header } from '@/components/layout/header'
import { useAuth } from '@/contexts/auth-context'
import { graphqlRequest, mutations, queries } from '@/lib/graphql/client'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { ContactFormDialog, emptyContactForm, type ContactFormData } from '@/components/contacts/contact-form-dialog'

interface ContactRow {
  id: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  mobile: string | null
  officePhone: string | null
  homePhone: string | null
  address: string | null
  department: string | null
  notes: string | null
  isClientApprover: boolean
  profilePhotoUrl: string | null
  jobTitle: string | null
  isPrimaryContact: boolean
  linkedinUrl: string | null
  preferredChannel: string | null
  contactType: string | null
  contactStatus: string | null
  notificationPreference: string | null
  birthday: string | null
  client: { id: string; name: string; logoUrl?: string | null; industry?: string | null; clientStatus?: string | null }
  createdAt: string
  updatedAt: string
}

interface Client {
  id: string
  name: string
  logoUrl?: string | null
  industry?: string | null
  clientStatus?: string | null
}

export default function ContactsPage() {
  const { currentAgency } = useAuth()
  const { toast } = useToast()
  const [contacts, setContacts] = useState<ContactRow[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterClientId, setFilterClientId] = useState<string>('')
  const [filterApprover, setFilterApprover] = useState<boolean | null>(null)
  const [viewContact, setViewContact] = useState<ContactRow | null>(null)
  const [editingContact, setEditingContact] = useState<ContactRow | null>(null)
  const [deleteContact, setDeleteContact] = useState<ContactRow | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [editForm, setEditForm] = useState<ContactFormData>({ ...emptyContactForm })
  const [createForm, setCreateForm] = useState<ContactFormData>({ ...emptyContactForm })

  const fetchContacts = useCallback(async () => {
    if (!currentAgency?.id) return
    setLoading(true)
    setError(null)
    try {
      const data = await graphqlRequest<{ contactsList: ContactRow[] }>(
        queries.contactsList,
        {
          agencyId: currentAgency.id,
          clientId: filterClientId || undefined,
          isClientApprover: filterApprover ?? undefined,
        }
      )
      setContacts(data.contactsList)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load contacts')
    } finally {
      setLoading(false)
    }
  }, [currentAgency?.id, filterClientId, filterApprover])

  const fetchClients = useCallback(async () => {
    if (!currentAgency?.id) return
    try {
      const data = await graphqlRequest<{ clients: Client[] }>(
        queries.clients,
        { agencyId: currentAgency.id }
      )
      setClients(data.clients)
    } catch {
      setClients([])
    }
  }, [currentAgency?.id])

  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  useEffect(() => {
    fetchContacts()
  }, [fetchContacts])

  const normalize = (value: string) =>
    value
      .normalize('NFKD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase()

  const filteredContacts = contacts.filter((c) => {
    const q = normalize(searchQuery)
    if (!q) return true
    return (
      normalize(`${c.firstName} ${c.lastName}`).includes(q) ||
      normalize(c.email ?? '').includes(q) ||
      normalize(`${c.phone ?? ''} ${c.mobile ?? ''}`).includes(q) ||
      normalize(c.department ?? '').includes(q) ||
      normalize(c.client?.name ?? '').includes(q)
    )
  })

  const openEditContact = (c: ContactRow) => {
    setEditingContact(c)
    setEditForm({
      clientId: c.client.id,
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
  }

  const openCreateContact = () => {
    setCreateForm({
      ...emptyContactForm,
      clientId: filterClientId || clients[0]?.id || '',
    })
    setCreateOpen(true)
  }

  const handleCreateContact = async () => {
    if (!createForm.clientId) {
      toast({ title: 'Select a client first', variant: 'destructive' })
      return
    }
    if (!createForm.firstName.trim() || !createForm.lastName.trim()) {
      toast({ title: 'First and last name are required', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      await graphqlRequest(mutations.createContact, {
        clientId: createForm.clientId,
        firstName: createForm.firstName.trim(),
        lastName: createForm.lastName.trim(),
        email: createForm.email.trim() || null,
        phone: createForm.phone.trim() || null,
        department: createForm.department.trim() || null,
        notes: createForm.notes.trim() || null,
        profilePhotoUrl: createForm.profilePhotoUrl.trim() || null,
        jobTitle: createForm.jobTitle.trim() || null,
        isPrimaryContact: createForm.isPrimaryContact,
        isClientApprover: createForm.isClientApprover,
        linkedinUrl: createForm.linkedinUrl.trim() || null,
        preferredChannel: createForm.preferredChannel || null,
        contactType: createForm.contactType || null,
        contactStatus: createForm.contactStatus || null,
        notificationPreference: createForm.notificationPreference || null,
        birthday: createForm.birthday || null,
      })
      toast({ title: 'Contact added' })
      setCreateOpen(false)
      await fetchContacts()
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : 'Failed to add contact', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleSaveContact = async () => {
    if (!editingContact) return
    if (!editForm.firstName.trim() || !editForm.lastName.trim()) {
      toast({ title: 'First and last name are required', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      await graphqlRequest(mutations.updateContact, {
        id: editingContact.id,
        firstName: editForm.firstName.trim(),
        lastName: editForm.lastName.trim(),
        email: editForm.email.trim() || null,
        phone: editForm.phone.trim() || null,
        department: editForm.department.trim() || null,
        notes: editForm.notes.trim() || null,
        profilePhotoUrl: editForm.profilePhotoUrl.trim() || null,
        jobTitle: editForm.jobTitle.trim() || null,
        isPrimaryContact: editForm.isPrimaryContact,
        isClientApprover: editForm.isClientApprover,
        linkedinUrl: editForm.linkedinUrl.trim() || null,
        preferredChannel: editForm.preferredChannel || null,
        contactType: editForm.contactType || null,
        contactStatus: editForm.contactStatus || null,
        notificationPreference: editForm.notificationPreference || null,
        birthday: editForm.birthday || null,
      })
      toast({ title: 'Contact updated' })
      setEditingContact(null)
      await fetchContacts()
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : 'Failed to update contact', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteContact = async () => {
    if (!deleteContact) return
    setDeleting(true)
    try {
      await graphqlRequest(mutations.deleteContact, { id: deleteContact.id })
      toast({ title: 'Contact deleted' })
      setDeleteContact(null)
      await fetchContacts()
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : 'Failed to delete contact', variant: 'destructive' })
    } finally {
      setDeleting(false)
    }
  }

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })

  const timeAgo = (dateString: string) => {
    const now = new Date()
    const date = new Date(dateString)
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays}d ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`
    return `${Math.floor(diffDays / 365)}y ago`
  }

  const contactTypeBadge: Record<string, { label: string; className: string }> = {
    decision_maker: { label: 'Decision Maker', className: 'bg-purple-100 text-purple-700' },
    influencer: { label: 'Influencer', className: 'bg-blue-100 text-blue-700' },
    champion: { label: 'Champion', className: 'bg-teal-100 text-teal-700' },
    end_user: { label: 'End User', className: 'bg-orange-100 text-orange-700' },
    technical: { label: 'Technical', className: 'bg-sky-100 text-sky-700' },
    other: { label: 'Other', className: 'bg-gray-100 text-gray-600' },
  }

  const contactStatusBadge: Record<string, { label: string; className: string }> = {
    active: { label: 'Active', className: 'bg-green-100 text-green-700' },
    inactive: { label: 'Inactive', className: 'bg-gray-100 text-gray-500' },
    left_company: { label: 'Left Company', className: 'bg-red-100 text-red-700' },
  }

  const [copiedId, setCopiedId] = useState<string | null>(null)
  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1500)
  }

  if (!currentAgency) {
    return (
      <>
        <Header title="Contacts" subtitle="Select an agency" />
        <div className="p-6">
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              Select an agency to view contacts.
            </CardContent>
          </Card>
        </div>
      </>
    )
  }

  return (
    <>
      <Header title="Contacts" subtitle="CRM-style view of client contacts" />
      <div className="p-6 space-y-6">
        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex gap-3 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search contacts..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <Button onClick={openCreateContact} disabled={clients.length === 0}>
            <Plus className="mr-2 h-4 w-4" />
            Add Contact
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <Select value={filterClientId || '_all'} onValueChange={(v) => setFilterClientId(v === '_all' ? '' : v)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All clients" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">All clients</SelectItem>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Loading */}
        {loading && (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[280px]">Contact</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Activity</TableHead>
                  <TableHead className="w-[100px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {[1, 2, 3, 4, 5].map((i) => (
                  <TableRow key={i} className="animate-pulse">
                    <TableCell><div className="h-10 w-44 bg-muted rounded" /></TableCell>
                    <TableCell><div className="h-5 w-28 bg-muted rounded" /></TableCell>
                    <TableCell><div className="h-5 w-36 bg-muted rounded" /></TableCell>
                    <TableCell><div className="h-5 w-24 bg-muted rounded" /></TableCell>
                    <TableCell><div className="h-5 w-16 bg-muted rounded-full" /></TableCell>
                    <TableCell><div className="h-5 w-16 bg-muted rounded" /></TableCell>
                    <TableCell />
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <Card className="border-destructive bg-destructive/10">
            <CardContent className="p-4 text-destructive">{error}</CardContent>
          </Card>
        )}

        {/* Empty / No results */}
        {!loading && !error && filteredContacts.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold">
                {contacts.length === 0 ? 'No contacts found' : 'No results found'}
              </h3>
              <p className="text-muted-foreground text-center mt-2 max-w-sm">
                {contacts.length === 0
                  ? 'Add contacts from a client page or use the Add Contact button above.'
                  : `No contacts match "${searchQuery}"`}
              </p>
              {contacts.length === 0 && (
                <Button className="mt-4" asChild>
                  <Link href="/dashboard/clients">
                    <Building2 className="mr-2 h-4 w-4" />
                    Go to Clients
                  </Link>
                </Button>
              )}
              {contacts.length > 0 && (
                <Button variant="outline" className="mt-4" onClick={() => setSearchQuery('')}>
                  Clear search
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Table */}
        {!loading && !error && filteredContacts.length > 0 && (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[280px]">Contact</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Activity</TableHead>
                  <TableHead className="w-[100px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContacts.map((c) => {
                  const ctBadge = c.contactType ? contactTypeBadge[c.contactType] || contactTypeBadge.other : null
                  const csBadge = contactStatusBadge[c.contactStatus || 'active'] || contactStatusBadge.active

                  return (
                    <TableRow key={c.id}>
                      {/* Primary Info: Photo + Name + Job Title + Contact Type Badge */}
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 shrink-0">
                            {c.profilePhotoUrl && <AvatarImage src={c.profilePhotoUrl} alt={`${c.firstName} ${c.lastName}`} />}
                            <AvatarFallback className="text-xs bg-primary/10 text-primary">
                              {c.firstName[0]}{c.lastName[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <Link href={`/dashboard/contacts/${c.id}`} className="font-medium truncate hover:underline">
                                {c.firstName} {c.lastName}
                              </Link>
                              {c.isPrimaryContact && (
                                <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500 shrink-0" />
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              {c.jobTitle && (
                                <span className="text-xs text-muted-foreground truncate">{c.jobTitle}</span>
                              )}
                              {ctBadge && (
                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0 ${ctBadge.className}`}>
                                  {ctBadge.label}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      {/* Linked Client: Logo + Name + Industry */}
                      <TableCell>
                        <Link
                          href={`/dashboard/clients/${c.client.id}`}
                          className="flex items-center gap-2 hover:underline"
                        >
                          <Avatar className="h-6 w-6 rounded shrink-0">
                            {c.client.logoUrl && <AvatarImage src={c.client.logoUrl} alt={c.client.name} />}
                            <AvatarFallback className="rounded text-[9px] bg-muted">
                              {c.client.name.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <span className="text-sm truncate block">{c.client.name}</span>
                            {c.client.industry && (
                              <span className="text-[10px] text-muted-foreground">{c.client.industry}</span>
                            )}
                          </div>
                        </Link>
                      </TableCell>

                      {/* Email with copy */}
                      <TableCell>
                        {c.email ? (
                          <div className="flex items-center gap-1.5 group">
                            <a className="text-sm hover:underline truncate max-w-[180px]" href={`mailto:${c.email}`}>
                              {c.email}
                            </a>
                            <button
                              onClick={(e) => { e.stopPropagation(); copyToClipboard(c.email!, `email-${c.id}`) }}
                              className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                              title="Copy email"
                            >
                              {copiedId === `email-${c.id}` ? (
                                <Check className="h-3.5 w-3.5 text-green-600" />
                              ) : (
                                <Copy className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>

                      {/* Phone with copy */}
                      <TableCell>
                        {(c.phone || c.mobile) ? (
                          <div className="flex items-center gap-1.5 group">
                            <span className="text-sm truncate max-w-[140px]">{c.phone || c.mobile}</span>
                            <button
                              onClick={(e) => { e.stopPropagation(); copyToClipboard((c.phone || c.mobile)!, `phone-${c.id}`) }}
                              className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                              title="Copy phone"
                            >
                              {copiedId === `phone-${c.id}` ? (
                                <Check className="h-3.5 w-3.5 text-green-600" />
                              ) : (
                                <Copy className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>

                      {/* Status Badge */}
                      <TableCell>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${csBadge.className}`}>
                          {csBadge.label}
                        </span>
                      </TableCell>

                      {/* Last Activity */}
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {timeAgo(c.updatedAt)}
                        </span>
                      </TableCell>

                      {/* Actions */}
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="View" onClick={() => setViewContact(c)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="Edit" onClick={() => openEditContact(c)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" title="Delete" onClick={() => setDeleteContact(c)}>
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

      {/* View Contact Dialog */}
      <Dialog open={!!viewContact} onOpenChange={(open) => !open && setViewContact(null)}>
        <DialogContent className="sm:max-w-2xl">
          {viewContact && (() => {
            const vCtBadge = viewContact.contactType ? contactTypeBadge[viewContact.contactType] || contactTypeBadge.other : null
            const vCsBadge = contactStatusBadge[viewContact.contactStatus || 'active'] || contactStatusBadge.active
            return (
              <>
                <DialogHeader className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      {viewContact.profilePhotoUrl && <AvatarImage src={viewContact.profilePhotoUrl} alt={`${viewContact.firstName} ${viewContact.lastName}`} />}
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {viewContact.firstName[0]}{viewContact.lastName[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <DialogTitle className="text-xl flex items-center gap-2">
                        {viewContact.firstName} {viewContact.lastName}
                        {viewContact.isPrimaryContact && (
                          <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                        )}
                      </DialogTitle>
                      <DialogDescription className="flex items-center gap-2">
                        {viewContact.jobTitle || viewContact.department || 'No role'}
                        <span className="text-muted-foreground">·</span>
                        {viewContact.client.name}
                      </DialogDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${vCsBadge.className}`}>
                      {vCsBadge.label}
                    </span>
                    {vCtBadge && (
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${vCtBadge.className}`}>
                        {vCtBadge.label}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      Last updated {formatDate(viewContact.updatedAt)}
                    </span>
                  </div>
                </DialogHeader>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">Contact Info</div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Email</span>
                        <span>{viewContact.email || '—'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Phone</span>
                        <span>{viewContact.phone || '—'}</span>
                      </div>
                      {viewContact.linkedinUrl && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">LinkedIn</span>
                          <a href={viewContact.linkedinUrl} target="_blank" rel="noopener noreferrer" className="hover:underline text-blue-600 truncate max-w-[180px]">
                            Profile
                          </a>
                        </div>
                      )}
                      {viewContact.preferredChannel && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Preferred</span>
                          <span className="capitalize">{viewContact.preferredChannel}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">Details</div>
                    <div className="space-y-2 text-sm">
                      {viewContact.department && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Department</span>
                          <span>{viewContact.department}</span>
                        </div>
                      )}
                      {viewContact.notificationPreference && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Notifications</span>
                          <span className="capitalize">{viewContact.notificationPreference.replace('_', ' ')}</span>
                        </div>
                      )}
                      {viewContact.birthday && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Birthday</span>
                          <span>{formatDate(viewContact.birthday)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {viewContact.notes && (
                    <div className="rounded-lg border bg-muted/20 p-4 space-y-3 sm:col-span-2">
                      <div className="text-xs uppercase tracking-wide text-muted-foreground">Notes</div>
                      <div className="text-sm whitespace-pre-wrap text-muted-foreground">{viewContact.notes}</div>
                    </div>
                  )}
                </div>
              </>
            )
          })()}
        </DialogContent>
      </Dialog>

      {/* Edit Contact Dialog */}
      <ContactFormDialog
        open={!!editingContact}
        onOpenChange={(open) => !open && setEditingContact(null)}
        mode="edit"
        form={editForm}
        onFormChange={(f) => setEditForm(f)}
        onSubmit={handleSaveContact}
        saving={saving}
      />

      {/* Create Contact Dialog */}
      <ContactFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        mode="create"
        form={createForm}
        onFormChange={(f) => setCreateForm(f)}
        onSubmit={handleCreateContact}
        saving={saving}
        clients={clients}
        showClientSelector
      />

      {/* Delete Confirmation */}
      <Dialog open={!!deleteContact} onOpenChange={(open) => !open && setDeleteContact(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="space-y-2">
            <DialogTitle>Delete contact?</DialogTitle>
            <DialogDescription>
              This will permanently remove {deleteContact?.firstName} {deleteContact?.lastName} from your contacts.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-muted-foreground">
            This action cannot be undone.
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteContact(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteContact} loading={deleting}>Delete contact</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

"use client"

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Users, Search, Building2, CheckCircle, Circle, Eye, Pencil, Trash2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Header } from '@/components/layout/header'
import { useAuth } from '@/contexts/auth-context'
import { graphqlRequest, mutations, queries } from '@/lib/graphql/client'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { PhoneInput } from '@/components/ui/phone-input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'

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
  client: { id: string; name: string }
  createdAt: string
  updatedAt: string
}

interface Client {
  id: string
  name: string
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
  const [filterDepartment, setFilterDepartment] = useState('')
  const [filterApprover, setFilterApprover] = useState<boolean | null>(null)
  const [viewContact, setViewContact] = useState<ContactRow | null>(null)
  const [editingContact, setEditingContact] = useState<ContactRow | null>(null)
  const [deleteContact, setDeleteContact] = useState<ContactRow | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    mobile: '',
    officePhone: '',
    homePhone: '',
    address: '',
    department: '',
    notes: '',
    isClientApprover: false,
  })
  const [createForm, setCreateForm] = useState({
    clientId: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    mobile: '',
    officePhone: '',
    homePhone: '',
    address: '',
    department: '',
    notes: '',
    isClientApprover: false,
  })
  const filterFields = [
    'name',
    'email',
    'mobile',
    'department',
    'client',
  ] as const
  type FilterField = (typeof filterFields)[number]
  const [activeFilterFields, setActiveFilterFields] = useState<FilterField[]>([
    'name',
    'email',
    'mobile',
    'department',
    'client',
  ])

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
          department: filterDepartment || undefined,
          isClientApprover: filterApprover ?? undefined,
        }
      )
      setContacts(data.contactsList)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load contacts')
    } finally {
      setLoading(false)
    }
  }, [currentAgency?.id, filterClientId, filterDepartment, filterApprover])

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
    const effectiveFields = activeFilterFields.length
      ? activeFilterFields
      : filterFields
    const values: Record<FilterField, string> = {
      name: normalize(`${c.firstName ?? ''} ${c.lastName ?? ''} ${c.lastName ?? ''} ${c.firstName ?? ''}`),
      email: normalize(c.email ?? ''),
      mobile: normalize(
        `${c.phone ?? ''} ${c.mobile ?? ''} ${c.officePhone ?? ''} ${c.homePhone ?? ''}`
      ),
      department: normalize(c.department ?? ''),
      client: normalize(c.client?.name ?? ''),
    }
    return effectiveFields.some((field) => values[field].includes(q))
  })

  const openEditContact = (c: ContactRow) => {
    setEditingContact(c)
    setEditForm({
      firstName: c.firstName,
      lastName: c.lastName,
      email: c.email ?? '',
      phone: c.phone ?? '',
      mobile: c.mobile ?? '',
      officePhone: c.officePhone ?? '',
      homePhone: c.homePhone ?? '',
      address: c.address ?? '',
      department: c.department ?? '',
      notes: c.notes ?? '',
      isClientApprover: c.isClientApprover,
    })
  }

  const openCreateContact = () => {
    setCreateForm({
      clientId: filterClientId || clients[0]?.id || '',
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      mobile: '',
      officePhone: '',
      homePhone: '',
      address: '',
      department: '',
      notes: '',
      isClientApprover: false,
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
        mobile: createForm.mobile.trim() || null,
        officePhone: createForm.officePhone.trim() || null,
        homePhone: createForm.homePhone.trim() || null,
        address: createForm.address.trim() || null,
        department: createForm.department.trim() || null,
        notes: createForm.notes.trim() || null,
        isClientApprover: createForm.isClientApprover,
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
        mobile: editForm.mobile.trim() || null,
        officePhone: editForm.officePhone.trim() || null,
        homePhone: editForm.homePhone.trim() || null,
        address: editForm.address.trim() || null,
        department: editForm.department.trim() || null,
        notes: editForm.notes.trim() || null,
        isClientApprover: editForm.isClientApprover,
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
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[240px] max-w-xl">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Global search across selected fields..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">Search in:</span>
              {filterFields.map((field) => {
                const label =
                  field === 'name'
                    ? 'Name'
                    : field === 'email'
                      ? 'Email'
                      : field === 'mobile'
                        ? 'Phone'
                        : field === 'department'
                          ? 'Department'
                          : 'Client'
                const active = activeFilterFields.includes(field)
                return (
                  <Button
                    key={field}
                    variant={active ? 'secondary' : 'outline'}
                    size="sm"
                    onClick={() =>
                      setActiveFilterFields((prev) =>
                        prev.includes(field)
                          ? prev.filter((f) => f !== field)
                          : [...prev, field]
                      )
                    }
                  >
                    {label}
                  </Button>
                )
              })}
            </div>
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={filterClientId}
              onChange={(e) => setFilterClientId(e.target.value)}
            >
              <option value="">All clients</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <Input
              placeholder="Department"
              className="w-40"
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
            />
            <div className="flex gap-2">
              <Button
                variant={filterApprover === true ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => setFilterApprover(filterApprover === true ? null : true)}
              >
                <CheckCircle className="mr-1 h-4 w-4" />
                Approvers
              </Button>
              <Button
                variant={filterApprover === false ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => setFilterApprover(filterApprover === false ? null : false)}
              >
                <Circle className="mr-1 h-4 w-4" />
                Not approvers
              </Button>
            </div>
            <div className="ml-auto">
              <Button onClick={openCreateContact} disabled={clients.length === 0}>
                <Plus className="mr-2 h-4 w-4" />
                Add Contact
              </Button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="animate-pulse space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 bg-muted rounded-lg" />
            ))}
          </div>
        ) : error ? (
          <Card className="border-destructive/50">
            <CardContent className="p-6 text-center text-destructive">
              {error}
            </CardContent>
          </Card>
        ) : filteredContacts.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold">No contacts found</h3>
              <p className="text-muted-foreground text-center mt-2 max-w-sm">
                {contacts.length === 0
                  ? 'Add contacts from a client page (Contacts tab).'
                  : 'Try changing filters or search.'}
              </p>
              <Button className="mt-4" asChild>
                <Link href="/dashboard/clients">
                  <Building2 className="mr-2 h-4 w-4" />
                  Go to Clients
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="min-w-[900px] w-full text-sm">
                  <thead className="bg-muted/40 text-muted-foreground">
                    <tr className="text-left">
                      <th className="px-4 py-3 font-medium">Contact</th>
                      <th className="px-4 py-3 font-medium">Email</th>
                      <th className="px-4 py-3 font-medium">Phone</th>
                      <th className="px-4 py-3 font-medium">Department</th>
                      <th className="px-4 py-3 font-medium">Client</th>
                      <th className="px-4 py-3 font-medium">Approver</th>
                      <th className="px-4 py-3 font-medium">Added</th>
                      <th className="px-4 py-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredContacts.map((c) => (
                      <tr key={c.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <Link
                            href={`/dashboard/clients/${c.client.id}#contacts`}
                            className="flex items-center gap-3"
                          >
                            <Avatar className="h-9 w-9 shrink-0">
                              <AvatarFallback>
                                {c.firstName[0]}
                                {c.lastName[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <div className="font-medium truncate">
                                {c.firstName} {c.lastName}
                              </div>
                              <div className="text-xs text-muted-foreground truncate">
                                {c.email || c.phone || c.mobile || '—'}
                              </div>
                            </div>
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          {c.email ? (
                            <a
                              className="text-foreground/80 hover:text-foreground"
                              href={`mailto:${c.email}`}
                            >
                              {c.email}
                            </a>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {c.phone ||
                            c.mobile ||
                            c.officePhone ||
                            c.homePhone || (
                              <span className="text-muted-foreground">—</span>
                            )}
                        </td>
                        <td className="px-4 py-3">
                          {c.department ?? <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/dashboard/clients/${c.client.id}`}
                            className="inline-flex items-center gap-1 text-foreground/80 hover:text-foreground"
                          >
                            <Building2 className="h-4 w-4" />
                            {c.client.name}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          {c.isClientApprover ? (
                            <Badge variant="hashtag">Approver</Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {formatDate(c.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              title="View contact"
                              onClick={() => setViewContact(c)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Edit contact"
                              onClick={() => openEditContact(c)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Delete contact"
                              className="text-destructive"
                              onClick={() => setDeleteContact(c)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={!!viewContact} onOpenChange={(open) => !open && setViewContact(null)}>
        <DialogContent className="sm:max-w-2xl">
          {viewContact && (
            <>
              <DialogHeader className="space-y-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback>
                      {viewContact.firstName[0]}
                      {viewContact.lastName[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <DialogTitle className="text-xl">
                      {viewContact.firstName} {viewContact.lastName}
                    </DialogTitle>
                    <DialogDescription className="flex items-center gap-2">
                      {viewContact.department || 'No department'}
                      <span className="text-muted-foreground">·</span>
                      {viewContact.client.name}
                    </DialogDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {viewContact.isClientApprover ? (
                    <Badge variant="hashtag">Approver</Badge>
                  ) : (
                    <Badge variant="secondary">Standard contact</Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    Last updated {formatDate(viewContact.updatedAt)}
                  </span>
                </div>
              </DialogHeader>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">
                    Contact Info
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Email</span>
                      <span>{viewContact.email || '—'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Primary</span>
                      <span>{viewContact.phone || '—'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Mobile</span>
                      <span>{viewContact.mobile || '—'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Office</span>
                      <span>{viewContact.officePhone || '—'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Home</span>
                      <span>{viewContact.homePhone || '—'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Department</span>
                      <span>{viewContact.department || '—'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Client</span>
                      <span>{viewContact.client.name}</span>
                    </div>
                  </div>
                </div>
                <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">
                    Address
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {viewContact.address || '—'}
                  </div>
                </div>
                <div className="rounded-lg border bg-muted/20 p-4 space-y-3 sm:col-span-2">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">
                    Notes
                  </div>
                  <div className="text-sm whitespace-pre-wrap text-muted-foreground">
                    {viewContact.notes || '—'}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingContact} onOpenChange={(open) => !open && setEditingContact(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-xl">Edit Contact</DialogTitle>
            <DialogDescription>Update contact details and notes.</DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border bg-muted/10 p-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground mb-3">
              Profile
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-first-name">First name</Label>
                <Input
                  id="edit-first-name"
                  value={editForm.firstName}
                  onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-last-name">Last name</Label>
                <Input
                  id="edit-last-name"
                  value={editForm.lastName}
                  onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                />
              </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Primary phone</Label>
              <PhoneInput
                id="edit-phone"
                value={editForm.phone}
                onChange={(value) => setEditForm({ ...editForm, phone: value })}
                placeholder="Primary number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-mobile">Mobile</Label>
              <PhoneInput
                id="edit-mobile"
                value={editForm.mobile}
                onChange={(value) => setEditForm({ ...editForm, mobile: value })}
                placeholder="Mobile number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-office">Office</Label>
              <PhoneInput
                id="edit-office"
                value={editForm.officePhone}
                onChange={(value) => setEditForm({ ...editForm, officePhone: value })}
                placeholder="Office number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-home">Home</Label>
              <PhoneInput
                id="edit-home"
                value={editForm.homePhone}
                onChange={(value) => setEditForm({ ...editForm, homePhone: value })}
                placeholder="Home number"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="edit-address">Address</Label>
                <Input
                  id="edit-address"
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-department">Department</Label>
                <Input
                  id="edit-department"
                  value={editForm.department}
                  onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-approver">Client approver</Label>
                <div className="flex items-center gap-2">
                  <input
                    id="edit-approver"
                    type="checkbox"
                    className="h-4 w-4 rounded border-input"
                    checked={editForm.isClientApprover}
                    onChange={(e) =>
                      setEditForm({ ...editForm, isClientApprover: e.target.checked })
                    }
                  />
                  <span className="text-sm text-muted-foreground">Can approve deliverables</span>
                </div>
              </div>
            </div>
          </div>
          <div className="rounded-lg border bg-muted/10 p-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground mb-3">
              Notes
            </div>
            <textarea
              id="edit-notes"
              className="min-h-[140px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={editForm.notes}
              onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingContact(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveContact} loading={saving}>
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-xl">Add Contact</DialogTitle>
            <DialogDescription>Create a new client contact.</DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border bg-muted/10 p-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground mb-3">
              Profile
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="create-client">Client</Label>
                <select
                  id="create-client"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={createForm.clientId}
                  onChange={(e) => setCreateForm({ ...createForm, clientId: e.target.value })}
                >
                  <option value="">Select a client</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-first-name">First name</Label>
                <Input
                  id="create-first-name"
                  value={createForm.firstName}
                  onChange={(e) => setCreateForm({ ...createForm, firstName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-last-name">Last name</Label>
                <Input
                  id="create-last-name"
                  value={createForm.lastName}
                  onChange={(e) => setCreateForm({ ...createForm, lastName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-email">Email</Label>
                <Input
                  id="create-email"
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-phone">Primary phone</Label>
                <PhoneInput
                  id="create-phone"
                  value={createForm.phone}
                  onChange={(value) => setCreateForm({ ...createForm, phone: value })}
                  placeholder="Primary number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-mobile">Mobile</Label>
                <PhoneInput
                  id="create-mobile"
                  value={createForm.mobile}
                  onChange={(value) => setCreateForm({ ...createForm, mobile: value })}
                  placeholder="Mobile number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-office">Office</Label>
                <PhoneInput
                  id="create-office"
                  value={createForm.officePhone}
                  onChange={(value) => setCreateForm({ ...createForm, officePhone: value })}
                  placeholder="Office number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-home">Home</Label>
                <PhoneInput
                  id="create-home"
                  value={createForm.homePhone}
                  onChange={(value) => setCreateForm({ ...createForm, homePhone: value })}
                  placeholder="Home number"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="create-address">Address</Label>
                <Input
                  id="create-address"
                  value={createForm.address}
                  onChange={(e) => setCreateForm({ ...createForm, address: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-department">Department</Label>
                <Input
                  id="create-department"
                  value={createForm.department}
                  onChange={(e) => setCreateForm({ ...createForm, department: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-approver">Client approver</Label>
                <div className="flex items-center gap-2">
                  <input
                    id="create-approver"
                    type="checkbox"
                    className="h-4 w-4 rounded border-input"
                    checked={createForm.isClientApprover}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, isClientApprover: e.target.checked })
                    }
                  />
                  <span className="text-sm text-muted-foreground">Can approve deliverables</span>
                </div>
              </div>
            </div>
          </div>
          <div className="rounded-lg border bg-muted/10 p-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground mb-3">
              Notes
            </div>
            <textarea
              id="create-notes"
              className="min-h-[140px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={createForm.notes}
              onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateContact} loading={saving}>
              Create contact
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
            <Button variant="outline" onClick={() => setDeleteContact(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteContact} loading={deleting}>
              Delete contact
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

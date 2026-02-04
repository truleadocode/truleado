"use client"

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Building2,
  FolderKanban,
  Megaphone,
  Plus,
  MoreHorizontal,
  AlertCircle,
  Users,
  Pencil,
  Trash2,
  CheckCircle,
  Circle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { PhoneInput } from '@/components/ui/phone-input'
import { Header } from '@/components/layout/header'
import { getCampaignStatusLabel } from '@/lib/campaign-status'
import { graphqlRequest, queries, mutations } from '@/lib/graphql/client'
import { useToast } from '@/hooks/use-toast'

interface Project {
  id: string
  name: string
  isArchived: boolean
  campaigns: {
    id: string
    name: string
    status: string
  }[]
}

interface Contact {
  id: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  mobile: string | null
  officePhone: string | null
  homePhone: string | null
  department: string | null
  address?: string | null
  notes?: string | null
  isClientApprover: boolean
  createdAt: string
}

interface Client {
  id: string
  name: string
  isActive: boolean
  createdAt: string
  accountManager: {
    id: string
    name: string | null
    email: string
  } | null
  projects: Project[]
  contacts: Contact[]
}

type Tab = 'overview' | 'contacts'

export default function ClientDetailPage() {
  const params = useParams()
  const router = useRouter()
  const clientId = params.id as string
  const { toast } = useToast()
  
  const [client, setClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('overview')
  const [contactDialogOpen, setContactDialogOpen] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [contactForm, setContactForm] = useState({
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
  const [submitting, setSubmitting] = useState(false)

  const fetchClient = async () => {
    try {
      const data = await graphqlRequest<{ client: Client }>(
        queries.client,
        { id: clientId }
      )
      setClient(data.client)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load client')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchClient()
  }, [clientId])

  const openAddContact = () => {
    setEditingContact(null)
    setContactForm({
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
    setContactDialogOpen(true)
  }

  const openEditContact = (c: Contact) => {
    setEditingContact(c)
    setContactForm({
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
    setContactDialogOpen(true)
  }

  const handleSaveContact = async () => {
    if (!contactForm.firstName.trim() || !contactForm.lastName.trim()) {
      toast({ title: 'First and last name are required', variant: 'destructive' })
      return
    }
    setSubmitting(true)
    try {
      if (editingContact) {
        await graphqlRequest(mutations.updateContact, {
          id: editingContact.id,
          firstName: contactForm.firstName.trim(),
          lastName: contactForm.lastName.trim(),
          email: contactForm.email.trim() || null,
          phone: contactForm.phone.trim() || null,
          mobile: contactForm.mobile.trim() || null,
          officePhone: contactForm.officePhone.trim() || null,
          homePhone: contactForm.homePhone.trim() || null,
          address: contactForm.address.trim() || null,
          department: contactForm.department.trim() || null,
          notes: contactForm.notes.trim() || null,
          isClientApprover: contactForm.isClientApprover,
        })
        toast({ title: 'Contact updated' })
      } else {
        await graphqlRequest(mutations.createContact, {
          clientId,
          firstName: contactForm.firstName.trim(),
          lastName: contactForm.lastName.trim(),
          email: contactForm.email.trim() || null,
          phone: contactForm.phone.trim() || null,
          mobile: contactForm.mobile.trim() || null,
          officePhone: contactForm.officePhone.trim() || null,
          homePhone: contactForm.homePhone.trim() || null,
          address: contactForm.address.trim() || null,
          department: contactForm.department.trim() || null,
          notes: contactForm.notes.trim() || null,
          isClientApprover: contactForm.isClientApprover,
        })
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

  const handleToggleApprover = async (c: Contact) => {
    try {
      await graphqlRequest(mutations.updateContact, {
        id: c.id,
        isClientApprover: !c.isClientApprover,
      })
      toast({ title: c.isClientApprover ? 'Removed as client approver' : 'Set as client approver' })
      await fetchClient()
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : 'Failed to update', variant: 'destructive' })
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const getInitials = (name: string | null | undefined) => {
    if (!name) return '?'
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      DRAFT: 'bg-gray-100 text-gray-700',
      ACTIVE: 'bg-green-100 text-green-700',
      IN_REVIEW: 'bg-yellow-100 text-yellow-700',
      APPROVED: 'bg-blue-100 text-blue-700',
      COMPLETED: 'bg-purple-100 text-purple-700',
      ARCHIVED: 'bg-gray-100 text-gray-500',
    }
    return colors[status] || 'bg-gray-100 text-gray-700'
  }

  if (loading) {
    return (
      <>
        <Header title="Loading..." />
        <div className="p-6">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-48 bg-muted rounded" />
            <div className="h-32 bg-muted rounded-lg" />
            <div className="h-64 bg-muted rounded-lg" />
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

  const totalCampaigns = client.projects.reduce(
    (sum, project) => sum + project.campaigns.length,
    0
  )

  return (
    <>
      <Header 
        title={client.name} 
        subtitle={`Client since ${formatDate(client.createdAt)}`} 
      />
      
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard/clients"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Clients
          </Link>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <MoreHorizontal className="mr-2 h-4 w-4" />
                Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Edit Client</DropdownMenuItem>
              <DropdownMenuItem>Change Account Manager</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">
                Archive Client
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b">
          <Button
            variant={tab === 'overview' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setTab('overview')}
          >
            Overview
          </Button>
          <Button
            variant={tab === 'contacts' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setTab('contacts')}
          >
            <Users className="mr-2 h-4 w-4" />
            Contacts ({client.contacts?.length ?? 0})
          </Button>
        </div>

        {tab === 'overview' && (
        <>
        {/* Client Info Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-6">
              <div className="h-20 w-20 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Building2 className="h-10 w-10 text-primary" />
              </div>
              <div className="flex-1 grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-sm text-muted-foreground">Account Manager</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs">
                        {getInitials(client.accountManager?.name || client.accountManager?.email)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">
                      {client.accountManager?.name || client.accountManager?.email || 'Unassigned'}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Projects</p>
                  <p className="font-medium mt-1">{client.projects.length}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Campaigns</p>
                  <p className="font-medium mt-1">{totalCampaigns}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Projects Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Projects</h2>
            <Button asChild>
              <Link href={`/dashboard/projects/new?clientId=${client.id}`}>
                <Plus className="mr-2 h-4 w-4" />
                New Project
              </Link>
            </Button>
          </div>

          {client.projects.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FolderKanban className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-semibold">No projects yet</h3>
                <p className="text-muted-foreground text-center mt-2 max-w-sm">
                  Create your first project for {client.name} to start organizing campaigns.
                </p>
                <Button className="mt-4" asChild>
                  <Link href={`/dashboard/projects/new?clientId=${client.id}`}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Project
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {client.projects.map((project) => (
                <Card key={project.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                          <FolderKanban className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                          <CardTitle className="text-base">
                            <Link 
                              href={`/dashboard/projects/${project.id}`}
                              className="hover:underline"
                            >
                              {project.name}
                            </Link>
                          </CardTitle>
                          <CardDescription>
                            {project.campaigns.length} campaign{project.campaigns.length !== 1 ? 's' : ''}
                          </CardDescription>
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${project.isArchived ? 'bg-gray-100 text-gray-500' : 'bg-green-100 text-green-700'}`}>
                        {project.isArchived ? 'Archived' : 'Active'}
                      </span>
                    </div>
                  </CardHeader>
                  {project.campaigns.length > 0 && (
                    <CardContent className="pt-0">
                      <div className="border-t pt-3 space-y-2">
                        {project.campaigns.slice(0, 3).map((campaign) => (
                          <Link
                            key={campaign.id}
                            href={`/dashboard/campaigns/${campaign.id}`}
                            className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <Megaphone className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">{campaign.name}</span>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(campaign.status)}`}>
                              {getCampaignStatusLabel(campaign.status)}
                            </span>
                          </Link>
                        ))}
                        {project.campaigns.length > 3 && (
                          <p className="text-xs text-muted-foreground pl-2">
                            +{project.campaigns.length - 3} more campaigns
                          </p>
                        )}
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
        </>
        )}

        {tab === 'contacts' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Contacts</h2>
              <Button onClick={openAddContact}>
                <Plus className="mr-2 h-4 w-4" />
                Add Contact
              </Button>
            </div>
            {(!client.contacts || client.contacts.length === 0) ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Users className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="font-semibold">No contacts yet</h3>
                  <p className="text-muted-foreground text-center mt-2 max-w-sm">
                    Add contacts at {client.name} for approvals and CRM.
                  </p>
                  <Button className="mt-4" onClick={openAddContact}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Contact
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {(client.contacts ?? []).map((c) => (
                  <Card key={c.id}>
                    <CardContent className="p-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="h-10 w-10 shrink-0">
                          <AvatarFallback>
                            {c.firstName[0]}{c.lastName[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-medium truncate">
                            {c.firstName} {c.lastName}
                          </p>
                          <p className="text-sm text-muted-foreground truncate">
                            {c.email || c.phone || c.mobile || '—'}
                            {c.department && ` · ${c.department}`}
                          </p>
                        </div>
                        {c.isClientApprover && (
                          <span className="shrink-0 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                            Client approver
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          title={c.isClientApprover ? 'Remove as approver' : 'Set as client approver'}
                          onClick={() => handleToggleApprover(c)}
                        >
                          {c.isClientApprover ? (
                            <CheckCircle className="h-4 w-4 text-primary" />
                          ) : (
                            <Circle className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openEditContact(c)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => handleDeleteContact(c.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Add/Edit Contact Dialog */}
        <Dialog open={contactDialogOpen} onOpenChange={setContactDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingContact ? 'Edit Contact' : 'Add Contact'}</DialogTitle>
              <DialogDescription>
                {editingContact ? 'Update contact details.' : 'Add a new contact for this client.'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First name *</Label>
                  <Input
                    id="firstName"
                    value={contactForm.firstName}
                    onChange={(e) => setContactForm((f) => ({ ...f, firstName: e.target.value }))}
                    placeholder="Jane"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last name *</Label>
                  <Input
                    id="lastName"
                    value={contactForm.lastName}
                    onChange={(e) => setContactForm((f) => ({ ...f, lastName: e.target.value }))}
                    placeholder="Doe"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={contactForm.email}
                  onChange={(e) => setContactForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="jane@client.com"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Primary phone</Label>
                  <PhoneInput
                    id="phone"
                    value={contactForm.phone}
                    onChange={(value) => setContactForm((f) => ({ ...f, phone: value }))}
                    placeholder="Primary number"
                  />
                </div>
                <div>
                  <Label htmlFor="mobile">Mobile</Label>
                  <PhoneInput
                    id="mobile"
                    value={contactForm.mobile}
                    onChange={(value) => setContactForm((f) => ({ ...f, mobile: value }))}
                    placeholder="Mobile number"
                  />
                </div>
                <div>
                  <Label htmlFor="officePhone">Office</Label>
                  <PhoneInput
                    id="officePhone"
                    value={contactForm.officePhone}
                    onChange={(value) => setContactForm((f) => ({ ...f, officePhone: value }))}
                    placeholder="Office number"
                  />
                </div>
                <div>
                  <Label htmlFor="homePhone">Home</Label>
                  <PhoneInput
                    id="homePhone"
                    value={contactForm.homePhone}
                    onChange={(value) => setContactForm((f) => ({ ...f, homePhone: value }))}
                    placeholder="Home number"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  value={contactForm.department}
                  onChange={(e) => setContactForm((f) => ({ ...f, department: e.target.value }))}
                  placeholder="Marketing"
                />
              </div>
              <div>
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={contactForm.address}
                  onChange={(e) => setContactForm((f) => ({ ...f, address: e.target.value }))}
                  placeholder="Optional"
                />
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <textarea
                  id="notes"
                  className="min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={contactForm.notes}
                  onChange={(e) => setContactForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Optional"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isClientApprover"
                  checked={contactForm.isClientApprover}
                  onChange={(e) => setContactForm((f) => ({ ...f, isClientApprover: e.target.checked }))}
                  className="rounded border-input"
                />
                <Label htmlFor="isClientApprover">Client approver (can approve deliverables)</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setContactDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveContact} disabled={submitting}>
                {editingContact ? 'Update' : 'Add'} Contact
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  )
}

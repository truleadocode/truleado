"use client"

import { useState, useEffect, useMemo } from 'react'
import {
  UserPlus,
  UserCog,
  User,
  Mail,
  Building2,
  Phone,
  Briefcase,
  Link2,
  Heart,
  StickyNote,
  Search,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { PhoneInput } from '@/components/ui/phone-input'
import { DatePicker } from '@/components/ui/date-picker'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export interface ContactFormData {
  firstName: string
  lastName: string
  profilePhotoUrl: string
  jobTitle: string
  department: string
  clientId: string
  isPrimaryContact: boolean
  email: string
  phone: string
  linkedinUrl: string
  preferredChannel: string
  contactType: string
  contactStatus: string
  notificationPreference: string
  birthday: string
  notes: string
}

export const emptyContactForm: ContactFormData = {
  firstName: '',
  lastName: '',
  profilePhotoUrl: '',
  jobTitle: '',
  department: '',
  clientId: '',
  isPrimaryContact: false,
  email: '',
  phone: '',
  linkedinUrl: '',
  preferredChannel: '',
  contactType: '',
  contactStatus: 'active',
  notificationPreference: '',
  birthday: '',
  notes: '',
}

interface ClientOption {
  id: string
  name: string
  logoUrl?: string | null
  industry?: string | null
  clientStatus?: string | null
}

interface ContactFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'create' | 'edit'
  form: ContactFormData
  onFormChange: (form: ContactFormData) => void
  onSubmit: () => void
  saving: boolean
  clients?: ClientOption[]
  showClientSelector?: boolean
}

const departments = [
  'Marketing',
  'Sales',
  'Finance',
  'Operations',
  'HR',
  'IT',
  'Legal',
  'Executive',
  'Creative',
  'PR',
  'Other',
]

const preferredChannels = [
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'linkedin', label: 'LinkedIn' },
]

const contactTypes = [
  { value: 'decision_maker', label: 'Decision Maker' },
  { value: 'influencer', label: 'Influencer' },
  { value: 'champion', label: 'Champion' },
  { value: 'end_user', label: 'End User' },
  { value: 'technical', label: 'Technical' },
  { value: 'other', label: 'Other' },
]

const contactStatuses = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'left_company', label: 'Left Company' },
]

const notificationPreferences = [
  { value: 'all', label: 'All Notifications' },
  { value: 'important', label: 'Important Only' },
  { value: 'none', label: 'None' },
]

function SectionHeader({ icon: Icon, label }: { icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
      <Icon className="h-3.5 w-3.5" />
      {label}
    </div>
  )
}

export function ContactFormDialog({
  open,
  onOpenChange,
  mode,
  form,
  onFormChange,
  onSubmit,
  saving,
  clients,
  showClientSelector,
}: ContactFormDialogProps) {
  const [clientSearch, setClientSearch] = useState('')

  useEffect(() => {
    if (open) setClientSearch('')
  }, [open])

  const isCreate = mode === 'create'
  const Icon = isCreate ? UserPlus : UserCog
  const title = isCreate ? 'Add Contact' : 'Edit Contact'
  const description = isCreate
    ? 'Create a new client contact.'
    : 'Update contact details.'
  const submitLabel = isCreate ? 'Create contact' : 'Save changes'

  const filteredClients = useMemo(() => {
    if (!clients) return []
    if (!clientSearch.trim()) return clients
    const q = clientSearch.toLowerCase()
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.industry && c.industry.toLowerCase().includes(q))
    )
  }, [clients, clientSearch])

  const selectedClient = clients?.find((c) => c.id === form.clientId)

  const birthdayDate = form.birthday ? new Date(form.birthday) : undefined

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Icon className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>{description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-2">
          {/* ── Section 1: Identity ── */}
          <div className="space-y-4">
            <SectionHeader icon={User} label="Identity" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cf-first-name">First name *</Label>
                <Input
                  id="cf-first-name"
                  placeholder="Jane"
                  value={form.firstName}
                  onChange={(e) => onFormChange({ ...form, firstName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cf-last-name">Last name *</Label>
                <Input
                  id="cf-last-name"
                  placeholder="Doe"
                  value={form.lastName}
                  onChange={(e) => onFormChange({ ...form, lastName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cf-photo-url">Profile Photo URL</Label>
                <Input
                  id="cf-photo-url"
                  type="url"
                  placeholder="https://..."
                  value={form.profilePhotoUrl}
                  onChange={(e) => onFormChange({ ...form, profilePhotoUrl: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cf-job-title">Job Title / Role</Label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="cf-job-title"
                    className="pl-9"
                    placeholder="Marketing Manager"
                    value={form.jobTitle}
                    onChange={(e) => onFormChange({ ...form, jobTitle: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Department</Label>
                <Select
                  value={form.department || '_none'}
                  onValueChange={(v) => onFormChange({ ...form, department: v === '_none' ? '' : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">None</SelectItem>
                    {departments.map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <hr />

          {/* ── Section 2: Linked Client ── */}
          {showClientSelector && clients && (
            <>
              <div className="space-y-4">
                <SectionHeader icon={Building2} label="Linked Client" />

                {/* Searchable client selector */}
                <div className="space-y-2">
                  <Label>Client *</Label>
                  <Select
                    value={form.clientId || ''}
                    onValueChange={(value) => onFormChange({ ...form, clientId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a client" />
                    </SelectTrigger>
                    <SelectContent>
                      <div className="px-2 pb-2">
                        <div className="relative">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                          <input
                            className="w-full rounded-md border border-input bg-background px-8 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none"
                            placeholder="Search clients..."
                            value={clientSearch}
                            onChange={(e) => setClientSearch(e.target.value)}
                            onKeyDown={(e) => e.stopPropagation()}
                          />
                        </div>
                      </div>
                      {filteredClients.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-5 w-5 rounded shrink-0">
                              {c.logoUrl && <AvatarImage src={c.logoUrl} alt={c.name} />}
                              <AvatarFallback className="rounded text-[9px]">
                                {c.name.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span>{c.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                      {filteredClients.length === 0 && (
                        <div className="py-4 text-center text-xs text-muted-foreground">
                          No clients found
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Client preview card */}
                {selectedClient && (
                  <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-4 py-3">
                    <Avatar className="h-9 w-9 rounded-lg shrink-0">
                      {selectedClient.logoUrl && <AvatarImage src={selectedClient.logoUrl} alt={selectedClient.name} />}
                      <AvatarFallback className="rounded-lg text-xs bg-primary/10 text-primary">
                        {selectedClient.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{selectedClient.name}</span>
                        {selectedClient.industry && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-600 shrink-0">
                            {selectedClient.industry}
                          </span>
                        )}
                      </div>
                      {selectedClient.clientStatus && (
                        <p className="text-xs text-muted-foreground capitalize">{selectedClient.clientStatus}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Is Primary Contact toggle */}
                <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-4 py-3">
                  <input
                    id="cf-primary"
                    type="checkbox"
                    className="h-4 w-4 rounded border-input accent-primary"
                    checked={form.isPrimaryContact}
                    onChange={(e) => onFormChange({ ...form, isPrimaryContact: e.target.checked })}
                  />
                  <div>
                    <Label htmlFor="cf-primary" className="font-medium cursor-pointer">
                      Primary Contact
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Main point of contact for this client
                    </p>
                  </div>
                </div>
              </div>

              <hr />
            </>
          )}

          {/* If no client selector, still show the primary contact toggle */}
          {!showClientSelector && (
            <>
              <div className="space-y-4">
                <SectionHeader icon={Building2} label="Client Role" />
                <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-4 py-3">
                  <input
                    id="cf-primary"
                    type="checkbox"
                    className="h-4 w-4 rounded border-input accent-primary"
                    checked={form.isPrimaryContact}
                    onChange={(e) => onFormChange({ ...form, isPrimaryContact: e.target.checked })}
                  />
                  <div>
                    <Label htmlFor="cf-primary" className="font-medium cursor-pointer">
                      Primary Contact
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Main point of contact for this client
                    </p>
                  </div>
                </div>
              </div>

              <hr />
            </>
          )}

          {/* ── Section 3: Contact Details ── */}
          <div className="space-y-4">
            <SectionHeader icon={Mail} label="Contact Details" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cf-email">Email *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="cf-email"
                    type="email"
                    className="pl-9"
                    placeholder="jane@client.com"
                    value={form.email}
                    onChange={(e) => onFormChange({ ...form, email: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cf-phone">Phone / WhatsApp</Label>
                <PhoneInput
                  id="cf-phone"
                  value={form.phone}
                  onChange={(value) => onFormChange({ ...form, phone: value })}
                  placeholder="Phone number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cf-linkedin">LinkedIn URL</Label>
                <div className="relative">
                  <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="cf-linkedin"
                    type="url"
                    className="pl-9"
                    placeholder="https://linkedin.com/in/..."
                    value={form.linkedinUrl}
                    onChange={(e) => onFormChange({ ...form, linkedinUrl: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Preferred Channel</Label>
                <Select
                  value={form.preferredChannel || '_none'}
                  onValueChange={(v) => onFormChange({ ...form, preferredChannel: v === '_none' ? '' : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select channel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Not specified</SelectItem>
                    {preferredChannels.map((ch) => (
                      <SelectItem key={ch.value} value={ch.value}>{ch.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <hr />

          {/* ── Section 4: Role in Relationship ── */}
          <div className="space-y-4">
            <SectionHeader icon={Briefcase} label="Role in Relationship" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Contact Type</Label>
                <Select
                  value={form.contactType || '_none'}
                  onValueChange={(v) => onFormChange({ ...form, contactType: v === '_none' ? '' : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Not specified</SelectItem>
                    {contactTypes.map((ct) => (
                      <SelectItem key={ct.value} value={ct.value}>{ct.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Contact Status</Label>
                <Select
                  value={form.contactStatus || 'active'}
                  onValueChange={(v) => onFormChange({ ...form, contactStatus: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {contactStatuses.map((cs) => (
                      <SelectItem key={cs.value} value={cs.value}>{cs.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Notification Pref.</Label>
                <Select
                  value={form.notificationPreference || '_none'}
                  onValueChange={(v) => onFormChange({ ...form, notificationPreference: v === '_none' ? '' : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select preference" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Not specified</SelectItem>
                    {notificationPreferences.map((np) => (
                      <SelectItem key={np.value} value={np.value}>{np.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <hr />

          {/* ── Section 5: Optional / Personal ── */}
          <div className="space-y-4">
            <SectionHeader icon={Heart} label="Optional / Personal" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Birthday</Label>
                <DatePicker
                  date={birthdayDate}
                  onDateChange={(d) =>
                    onFormChange({
                      ...form,
                      birthday: d ? d.toISOString().split('T')[0] : '',
                    })
                  }
                  placeholder="Select date"
                />
              </div>
              <div />
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="cf-notes">Internal Notes</Label>
                <Textarea
                  id="cf-notes"
                  placeholder="Optional notes about this contact..."
                  value={form.notes}
                  onChange={(e) => onFormChange({ ...form, notes: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={saving}>
            {saving ? 'Saving...' : submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

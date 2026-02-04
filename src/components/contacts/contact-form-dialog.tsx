"use client"

import { useState, useEffect } from 'react'
import {
  UserPlus,
  UserCog,
  User,
  Mail,
  Building2,
  Phone,
  Smartphone,
  PhoneCall,
  Home,
  MapPin,
  StickyNote,
  ShieldCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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

export interface ContactFormData {
  firstName: string
  lastName: string
  email: string
  phone: string
  mobile: string
  officePhone: string
  homePhone: string
  address: string
  department: string
  notes: string
  isClientApprover: boolean
  clientId: string
}

interface ContactFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'create' | 'edit'
  form: ContactFormData
  onFormChange: (form: ContactFormData) => void
  onSubmit: () => void
  saving: boolean
  clients?: { id: string; name: string }[]
  showClientSelector?: boolean
}

type Tab = 'details' | 'phones'

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
  const [tab, setTab] = useState<Tab>('details')

  // Reset to details tab when dialog opens
  useEffect(() => {
    if (open) setTab('details')
  }, [open])

  const isCreate = mode === 'create'
  const Icon = isCreate ? UserPlus : UserCog
  const title = isCreate ? 'Add Contact' : 'Edit Contact'
  const description = isCreate
    ? 'Create a new client contact.'
    : 'Update contact details and notes.'
  const submitLabel = isCreate ? 'Create contact' : 'Save changes'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden">
        <DialogHeader>
          <div className="px-6 pt-6 pb-5 bg-gradient-to-br from-blue-600/10 via-cyan-600/10 to-transparent border-b">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center shadow-sm">
                <Icon className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <DialogTitle className="text-xl tracking-tight">{title}</DialogTitle>
                <DialogDescription className="mt-1">{description}</DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 py-6 space-y-6">
          {/* Tabs */}
          <div className="flex items-center gap-2 border-b pb-3">
            <Button
              type="button"
              variant={tab === 'details' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setTab('details')}
            >
              Details
            </Button>
            <Button
              type="button"
              variant={tab === 'phones' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setTab('phones')}
            >
              Phone &amp; Address
            </Button>
          </div>

          {/* Details Tab */}
          {tab === 'details' && (
            <>
              <div className="rounded-xl border bg-card p-4">
                <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase mb-4">
                  <User className="h-4 w-4" />
                  Identity
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cf-first-name">First name *</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="cf-first-name"
                        className="pl-9"
                        placeholder="Jane"
                        value={form.firstName}
                        onChange={(e) => onFormChange({ ...form, firstName: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cf-last-name">Last name *</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="cf-last-name"
                        className="pl-9"
                        placeholder="Doe"
                        value={form.lastName}
                        onChange={(e) => onFormChange({ ...form, lastName: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cf-email">Email</Label>
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
                    <Label htmlFor="cf-department">Department</Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="cf-department"
                        className="pl-9"
                        placeholder="Marketing"
                        value={form.department}
                        onChange={(e) => onFormChange({ ...form, department: e.target.value })}
                      />
                    </div>
                  </div>
                  {showClientSelector && clients && (
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="cf-client">Client *</Label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <select
                          id="cf-client"
                          className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm"
                          value={form.clientId || ''}
                          onChange={(e) => onFormChange({ ...form, clientId: e.target.value })}
                        >
                          <option value="">Select a client</option>
                          {clients.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-xl border bg-card p-4">
                <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase mb-4">
                  <ShieldCheck className="h-4 w-4" />
                  Role &amp; Notes
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-4 py-3">
                    <input
                      id="cf-approver"
                      type="checkbox"
                      className="h-4 w-4 rounded border-input"
                      checked={form.isClientApprover}
                      onChange={(e) => onFormChange({ ...form, isClientApprover: e.target.checked })}
                    />
                    <div>
                      <Label htmlFor="cf-approver" className="font-medium cursor-pointer">
                        Client approver
                      </Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Can approve deliverables on behalf of the client
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cf-notes">Notes</Label>
                    <div className="relative">
                      <StickyNote className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <textarea
                        id="cf-notes"
                        className="flex min-h-[100px] w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="Optional notes about this contact..."
                        value={form.notes}
                        onChange={(e) => onFormChange({ ...form, notes: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Phone & Address Tab */}
          {tab === 'phones' && (
            <>
              <div className="rounded-xl border bg-card p-4">
                <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase mb-4">
                  <Phone className="h-4 w-4" />
                  Phone Numbers
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cf-phone">Primary phone</Label>
                    <PhoneInput
                      id="cf-phone"
                      value={form.phone}
                      onChange={(value) => onFormChange({ ...form, phone: value })}
                      placeholder="Primary number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cf-mobile">Mobile</Label>
                    <PhoneInput
                      id="cf-mobile"
                      value={form.mobile}
                      onChange={(value) => onFormChange({ ...form, mobile: value })}
                      placeholder="Mobile number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cf-office">Office</Label>
                    <PhoneInput
                      id="cf-office"
                      value={form.officePhone}
                      onChange={(value) => onFormChange({ ...form, officePhone: value })}
                      placeholder="Office number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cf-home">Home</Label>
                    <PhoneInput
                      id="cf-home"
                      value={form.homePhone}
                      onChange={(value) => onFormChange({ ...form, homePhone: value })}
                      placeholder="Home number"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border bg-card p-4">
                <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase mb-4">
                  <MapPin className="h-4 w-4" />
                  Address
                </div>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="cf-address"
                    className="pl-9"
                    placeholder="Street address, city, state..."
                    value={form.address}
                    onChange={(e) => onFormChange({ ...form, address: e.target.value })}
                  />
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <div className="w-full px-6 pb-6 flex items-center justify-between">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={onSubmit} disabled={saving} className="shadow-sm">
              {saving ? 'Saving...' : submitLabel}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

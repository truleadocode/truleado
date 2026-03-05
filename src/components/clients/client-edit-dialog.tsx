"use client"

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  AlertCircle,
  Building2,
  Banknote,
  Share2,
  Settings2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DatePicker } from '@/components/ui/date-picker'
import { useAuth } from '@/contexts/auth-context'
import { graphqlRequest, queries, mutations } from '@/lib/graphql/client'

// ---------- Options (same as create dialog) ----------

const industryOptions = [
  'Beauty', 'Fashion', 'Food & Beverage', 'Tech', 'Lifestyle',
  'Travel', 'Health & Fitness', 'Finance', 'Other',
]

const countryOptions = [
  'United States', 'United Kingdom', 'Canada', 'Australia', 'India',
  'Germany', 'France', 'United Arab Emirates', 'Singapore', 'Japan',
  'Brazil', 'Netherlands', 'Spain', 'Italy', 'South Korea',
  'Mexico', 'Indonesia', 'Saudi Arabia', 'South Africa', 'Other',
]

const clientStatusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'prospect', label: 'Prospect' },
  { value: 'paused', label: 'Paused' },
  { value: 'on-hold', label: 'On-hold' },
  { value: 'churned', label: 'Churned' },
  { value: 'inactive', label: 'Inactive' },
]

const currencyOptions = [
  { value: 'USD', label: 'USD — US Dollar' },
  { value: 'AED', label: 'AED — UAE Dirham' },
  { value: 'INR', label: 'INR — Indian Rupee' },
  { value: 'GBP', label: 'GBP — British Pound' },
  { value: 'EUR', label: 'EUR — Euro' },
]

const paymentTermsOptions = [
  { value: 'net_15', label: 'Net 15' },
  { value: 'net_30', label: 'Net 30' },
  { value: 'net_45', label: 'Net 45' },
  { value: 'advance', label: 'Advance' },
]

const sourceOptions = ['Referral', 'Inbound', 'Outreach', 'Event', 'Other']

// ---------- Schema ----------

const editClientSchema = z.object({
  name: z.string().min(2, 'Company name must be at least 2 characters'),
  industry: z.string().optional(),
  websiteUrl: z.string().url('Enter a valid URL').or(z.literal('')).optional(),
  country: z.string().optional(),
  logoUrl: z.string().optional(),
  description: z.string().max(300, 'Maximum 300 characters').optional(),
  clientStatus: z.string().optional(),
  clientSince: z.string().optional(),
  currency: z.string().optional(),
  paymentTerms: z.string().optional(),
  billingEmail: z.string().email('Enter a valid email').or(z.literal('')).optional(),
  taxNumber: z.string().optional(),
  instagramHandle: z.string().optional(),
  youtubeUrl: z.string().optional(),
  tiktokHandle: z.string().optional(),
  linkedinUrl: z.string().optional(),
  accountManagerId: z.string().optional(),
  source: z.string().optional(),
  internalNotes: z.string().optional(),
})

type EditClientFormData = z.infer<typeof editClientSchema>

// ---------- Types ----------

interface AgencyUser {
  id: string
  role: string
  isActive: boolean
  user: { id: string; name: string | null; email: string }
}

interface ClientData {
  id: string
  name: string
  industry: string | null
  websiteUrl: string | null
  country: string | null
  logoUrl: string | null
  description: string | null
  clientStatus: string | null
  clientSince: string | null
  currency: string | null
  paymentTerms: string | null
  billingEmail: string | null
  taxNumber: string | null
  instagramHandle: string | null
  youtubeUrl: string | null
  tiktokHandle: string | null
  linkedinUrl: string | null
  source: string | null
  internalNotes: string | null
  accountManager: { id: string; name: string | null; email: string } | null
}

interface ClientEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  client: ClientData
  onUpdated: () => void
}

// ---------- Component ----------

export function ClientEditDialog({ open, onOpenChange, client, onUpdated }: ClientEditDialogProps) {
  const { currentAgency } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [agencyUsers, setAgencyUsers] = useState<AgencyUser[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [clientSinceDate, setClientSinceDate] = useState<Date | undefined>()
  const [descriptionLength, setDescriptionLength] = useState(0)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<EditClientFormData>({
    resolver: zodResolver(editClientSchema),
  })

  const descriptionValue = watch('description')

  useEffect(() => {
    setDescriptionLength(descriptionValue?.length || 0)
  }, [descriptionValue])

  // Pre-populate form when dialog opens
  useEffect(() => {
    if (open && client) {
      reset({
        name: client.name,
        industry: client.industry || '',
        websiteUrl: client.websiteUrl || '',
        country: client.country || '',
        logoUrl: client.logoUrl || '',
        description: client.description || '',
        clientStatus: client.clientStatus || 'active',
        clientSince: client.clientSince || '',
        currency: client.currency || 'USD',
        paymentTerms: client.paymentTerms || '',
        billingEmail: client.billingEmail || '',
        taxNumber: client.taxNumber || '',
        instagramHandle: client.instagramHandle || '',
        youtubeUrl: client.youtubeUrl || '',
        tiktokHandle: client.tiktokHandle || '',
        linkedinUrl: client.linkedinUrl || '',
        accountManagerId: client.accountManager?.id || '',
        source: client.source || '',
        internalNotes: client.internalNotes || '',
      })
      setClientSinceDate(client.clientSince ? new Date(client.clientSince) : undefined)
      setError(null)
      setDescriptionLength(client.description?.length || 0)
    }
  }, [open, client, reset])

  // Fetch agency users
  useEffect(() => {
    async function fetchAgencyUsers() {
      if (!currentAgency?.id) return
      try {
        const data = await graphqlRequest<{ agency: { users: AgencyUser[] } }>(
          queries.agencyUsers,
          { agencyId: currentAgency.id }
        )
        const eligible = data.agency.users.filter(
          (u) => u.isActive && ['AGENCY_ADMIN', 'ACCOUNT_MANAGER'].includes(u.role.toUpperCase())
        )
        setAgencyUsers(eligible)
      } catch (err) {
        console.error('Failed to fetch agency users:', err)
      } finally {
        setLoadingUsers(false)
      }
    }
    fetchAgencyUsers()
  }, [currentAgency?.id])

  const onSubmit = async (data: EditClientFormData) => {
    setError(null)
    setIsSubmitting(true)
    try {
      await graphqlRequest(mutations.updateClient, {
        id: client.id,
        name: data.name,
        industry: data.industry || null,
        websiteUrl: data.websiteUrl || null,
        country: data.country || null,
        logoUrl: data.logoUrl || null,
        description: data.description || null,
        clientStatus: data.clientStatus || null,
        clientSince: data.clientSince || null,
        currency: data.currency || null,
        paymentTerms: data.paymentTerms || null,
        billingEmail: data.billingEmail || null,
        taxNumber: data.taxNumber || null,
        instagramHandle: data.instagramHandle || null,
        youtubeUrl: data.youtubeUrl || null,
        tiktokHandle: data.tiktokHandle || null,
        linkedinUrl: data.linkedinUrl || null,
        accountManagerId: data.accountManagerId || null,
        source: data.source || null,
        internalNotes: data.internalNotes || null,
      })
      onOpenChange(false)
      onUpdated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update client')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>Edit Client</DialogTitle>
              <DialogDescription>Update {client.name}&apos;s details</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
            {error && (
              <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-lg">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Section 1: Basic Identity */}
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">Basic Identity</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Company Name *</Label>
                  <Input id="edit-name" error={!!errors.name} {...register('name')} />
                  {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Industry / Niche</Label>
                  <Select
                    value={watch('industry') || ''}
                    onValueChange={(value) => setValue('industry', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select industry" />
                    </SelectTrigger>
                    <SelectContent>
                      {industryOptions.map((opt) => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-websiteUrl">Website URL</Label>
                  <Input id="edit-websiteUrl" type="url" {...register('websiteUrl')} />
                  {errors.websiteUrl && <p className="text-sm text-destructive">{errors.websiteUrl.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Country / Region</Label>
                  <Select
                    value={watch('country') || ''}
                    onValueChange={(value) => setValue('country', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      {countryOptions.map((opt) => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-logoUrl">Brand Logo URL</Label>
                <Input id="edit-logoUrl" {...register('logoUrl')} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-description">Brand Description</Label>
                <Textarea id="edit-description" rows={2} maxLength={300} {...register('description')} />
                <div className="flex justify-end">
                  <p className="text-xs text-muted-foreground">{descriptionLength}/300</p>
                </div>
              </div>
            </section>

            <hr />

            {/* Section 2: Commercial */}
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Banknote className="h-4 w-4 text-green-600" />
                <h3 className="text-sm font-semibold">Commercial</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Client Status</Label>
                  <Select
                    value={watch('clientStatus') || ''}
                    onValueChange={(value) => setValue('clientStatus', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {clientStatusOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Client Since</Label>
                  <DatePicker
                    date={clientSinceDate}
                    onDateChange={(date) => {
                      setClientSinceDate(date)
                      setValue('clientSince', date ? date.toISOString().split('T')[0] : '')
                    }}
                    placeholder="Select date"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select
                    value={watch('currency') || ''}
                    onValueChange={(value) => setValue('currency', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {currencyOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Payment Terms</Label>
                  <Select
                    value={watch('paymentTerms') || ''}
                    onValueChange={(value) => setValue('paymentTerms', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select terms" />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentTermsOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-billingEmail">Billing Email</Label>
                  <Input id="edit-billingEmail" type="email" {...register('billingEmail')} />
                  {errors.billingEmail && <p className="text-sm text-destructive">{errors.billingEmail.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-taxNumber">Tax / GST Number</Label>
                  <Input id="edit-taxNumber" {...register('taxNumber')} />
                </div>
              </div>
            </section>

            <hr />

            {/* Section 3: Social Presence */}
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Share2 className="h-4 w-4 text-purple-600" />
                <h3 className="text-sm font-semibold">Social Presence</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-instagramHandle">Instagram Handle</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">@</span>
                    <Input id="edit-instagramHandle" className="pl-8" {...register('instagramHandle')} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-youtubeUrl">YouTube Channel URL</Label>
                  <Input id="edit-youtubeUrl" {...register('youtubeUrl')} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-tiktokHandle">TikTok Handle</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">@</span>
                    <Input id="edit-tiktokHandle" className="pl-8" {...register('tiktokHandle')} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-linkedinUrl">LinkedIn Page URL</Label>
                  <Input id="edit-linkedinUrl" {...register('linkedinUrl')} />
                </div>
              </div>
            </section>

            <hr />

            {/* Section 4: Internal */}
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-orange-600" />
                <h3 className="text-sm font-semibold">Internal</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Account Manager</Label>
                  <Select
                    value={watch('accountManagerId') || ''}
                    onValueChange={(value) => setValue('accountManagerId', value)}
                    disabled={loadingUsers}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={loadingUsers ? 'Loading...' : 'Select an account manager'} />
                    </SelectTrigger>
                    <SelectContent>
                      {agencyUsers.map((au) => (
                        <SelectItem key={au.user.id} value={au.user.id}>
                          {au.user.name || au.user.email} ({au.role.replace('_', ' ')})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Source</Label>
                  <Select
                    value={watch('source') || ''}
                    onValueChange={(value) => setValue('source', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="How did they find you?" />
                    </SelectTrigger>
                    <SelectContent>
                      {sourceOptions.map((opt) => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-internalNotes">Internal Notes</Label>
                <Textarea id="edit-internalNotes" rows={3} {...register('internalNotes')} />
              </div>
            </section>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 px-6 py-4 border-t shrink-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

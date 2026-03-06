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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
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

// ---------- Options ----------

const industryOptions = [
  'Beauty',
  'Fashion',
  'Food & Beverage',
  'Tech',
  'Lifestyle',
  'Travel',
  'Health & Fitness',
  'Finance',
  'Other',
]

const countryOptions = [
  'United States',
  'United Kingdom',
  'Canada',
  'Australia',
  'India',
  'Germany',
  'France',
  'United Arab Emirates',
  'Singapore',
  'Japan',
  'Brazil',
  'Netherlands',
  'Spain',
  'Italy',
  'South Korea',
  'Mexico',
  'Indonesia',
  'Saudi Arabia',
  'South Africa',
  'Other',
]

const clientStatusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'prospect', label: 'Prospect' },
  { value: 'on-hold', label: 'On-hold' },
  { value: 'churned', label: 'Churned' },
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

const sourceOptions = [
  'Referral',
  'Inbound',
  'Outreach',
  'Event',
  'Other',
]

// ---------- Schema ----------

const createClientSchema = z.object({
  name: z.string().min(2, 'Company name must be at least 2 characters'),
  industry: z.string().min(1, 'Please select an industry'),
  websiteUrl: z.string().url('Enter a valid URL').or(z.literal('')).optional(),
  country: z.string().min(1, 'Please select a country'),
  logoUrl: z.string().optional(),
  description: z.string().max(300, 'Maximum 300 characters').optional(),
  clientStatus: z.string().min(1, 'Please select a status'),
  clientSince: z.string().min(1, 'Please select a date'),
  currency: z.string().min(1, 'Please select a currency'),
  paymentTerms: z.string().optional(),
  billingEmail: z.string().email('Enter a valid email').or(z.literal('')).optional(),
  taxNumber: z.string().optional(),
  instagramHandle: z.string().optional(),
  youtubeUrl: z.string().optional(),
  tiktokHandle: z.string().optional(),
  linkedinUrl: z.string().optional(),
  accountManagerId: z.string().min(1, 'Please select an account manager'),
  source: z.string().optional(),
  internalNotes: z.string().optional(),
})

type CreateClientFormData = z.infer<typeof createClientSchema>

// ---------- Types ----------

interface AgencyUser {
  id: string
  role: string
  isActive: boolean
  user: {
    id: string
    name: string | null
    email: string
  }
}

interface ClientFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (clientId: string) => void
}

// ---------- Component ----------

export function ClientFormDialog({ open, onOpenChange, onCreated }: ClientFormDialogProps) {
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
  } = useForm<CreateClientFormData>({
    resolver: zodResolver(createClientSchema),
    defaultValues: {
      clientStatus: 'active',
      currency: 'USD',
    },
  })

  const descriptionValue = watch('description')

  useEffect(() => {
    setDescriptionLength(descriptionValue?.length || 0)
  }, [descriptionValue])

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      reset({ clientStatus: 'active', currency: 'USD' })
      setClientSinceDate(undefined)
      setError(null)
      setDescriptionLength(0)
    }
  }, [open, reset])

  // Fetch agency users for account manager selection
  useEffect(() => {
    async function fetchAgencyUsers() {
      if (!currentAgency?.id) return

      try {
        const data = await graphqlRequest<{ agency: { users: AgencyUser[] } }>(
          queries.agencyUsers,
          { agencyId: currentAgency.id }
        )

        const eligibleUsers = data.agency.users.filter(
          (u) => u.isActive && ['AGENCY_ADMIN', 'ACCOUNT_MANAGER'].includes(u.role.toUpperCase())
        )
        setAgencyUsers(eligibleUsers)
      } catch (err) {
        console.error('Failed to fetch agency users:', err)
      } finally {
        setLoadingUsers(false)
      }
    }

    fetchAgencyUsers()
  }, [currentAgency?.id])

  const onSubmit = async (data: CreateClientFormData) => {
    if (!currentAgency?.id) return

    setError(null)
    setIsSubmitting(true)

    try {
      const result = await graphqlRequest<{ createClient: { id: string } }>(
        mutations.createClient,
        {
          agencyId: currentAgency.id,
          name: data.name,
          accountManagerId: data.accountManagerId,
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
          source: data.source || null,
          internalNotes: data.internalNotes || null,
        }
      )

      onCreated(result.createClient.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create client')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-2xl w-full flex flex-col p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <SheetTitle>Add Client</SheetTitle>
              <SheetDescription>Add a new client to your agency</SheetDescription>
            </div>
          </div>
        </SheetHeader>

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
                  <Label htmlFor="dlg-name">Company Name *</Label>
                  <Input
                    id="dlg-name"
                    placeholder="e.g., Acme Corporation"
                    error={!!errors.name}
                    {...register('name')}
                  />
                  {errors.name && (
                    <p className="text-sm text-destructive">{errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Industry / Niche *</Label>
                  <Select
                    onValueChange={(value) => setValue('industry', value, { shouldValidate: true })}
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
                  {errors.industry && (
                    <p className="text-sm text-destructive">{errors.industry.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dlg-websiteUrl">Website URL</Label>
                  <Input
                    id="dlg-websiteUrl"
                    type="url"
                    placeholder="https://example.com"
                    {...register('websiteUrl')}
                  />
                  {errors.websiteUrl && (
                    <p className="text-sm text-destructive">{errors.websiteUrl.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Country / Region *</Label>
                  <Select
                    onValueChange={(value) => setValue('country', value, { shouldValidate: true })}
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
                  {errors.country && (
                    <p className="text-sm text-destructive">{errors.country.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dlg-logoUrl">Brand Logo URL</Label>
                <Input
                  id="dlg-logoUrl"
                  placeholder="https://example.com/logo.png"
                  {...register('logoUrl')}
                />
                <p className="text-xs text-muted-foreground">
                  Paste a link to the brand logo image
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dlg-description">Brand Description</Label>
                <Textarea
                  id="dlg-description"
                  rows={2}
                  maxLength={300}
                  placeholder="Brief description of the brand..."
                  {...register('description')}
                />
                <div className="flex justify-between">
                  {errors.description && (
                    <p className="text-sm text-destructive">{errors.description.message}</p>
                  )}
                  <p className="text-xs text-muted-foreground ml-auto">
                    {descriptionLength}/300
                  </p>
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
                  <Label>Client Status *</Label>
                  <Select
                    defaultValue="active"
                    onValueChange={(value) => setValue('clientStatus', value, { shouldValidate: true })}
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
                  {errors.clientStatus && (
                    <p className="text-sm text-destructive">{errors.clientStatus.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Client Since *</Label>
                  <DatePicker
                    date={clientSinceDate}
                    onDateChange={(date) => {
                      setClientSinceDate(date)
                      setValue(
                        'clientSince',
                        date ? date.toISOString().split('T')[0] : '',
                        { shouldValidate: true }
                      )
                    }}
                    placeholder="Select date"
                  />
                  {errors.clientSince && (
                    <p className="text-sm text-destructive">{errors.clientSince.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Currency *</Label>
                  <Select
                    defaultValue="USD"
                    onValueChange={(value) => setValue('currency', value, { shouldValidate: true })}
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
                  {errors.currency && (
                    <p className="text-sm text-destructive">{errors.currency.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Payment Terms</Label>
                  <Select
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
                  <Label htmlFor="dlg-billingEmail">Billing Email</Label>
                  <Input
                    id="dlg-billingEmail"
                    type="email"
                    placeholder="billing@company.com"
                    {...register('billingEmail')}
                  />
                  {errors.billingEmail && (
                    <p className="text-sm text-destructive">{errors.billingEmail.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dlg-taxNumber">Tax / GST Number</Label>
                  <Input
                    id="dlg-taxNumber"
                    placeholder="e.g., 22AAAAA0000A1Z5"
                    {...register('taxNumber')}
                  />
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
                  <Label htmlFor="dlg-instagramHandle">Instagram Handle</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">@</span>
                    <Input
                      id="dlg-instagramHandle"
                      className="pl-8"
                      placeholder="username"
                      {...register('instagramHandle')}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dlg-youtubeUrl">YouTube Channel URL</Label>
                  <Input
                    id="dlg-youtubeUrl"
                    placeholder="https://youtube.com/@channel"
                    {...register('youtubeUrl')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dlg-tiktokHandle">TikTok Handle</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">@</span>
                    <Input
                      id="dlg-tiktokHandle"
                      className="pl-8"
                      placeholder="username"
                      {...register('tiktokHandle')}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dlg-linkedinUrl">LinkedIn Page URL</Label>
                  <Input
                    id="dlg-linkedinUrl"
                    placeholder="https://linkedin.com/company/name"
                    {...register('linkedinUrl')}
                  />
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
                  <Label>Account Manager *</Label>
                  <Select
                    onValueChange={(value) => setValue('accountManagerId', value, { shouldValidate: true })}
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
                  {errors.accountManagerId && (
                    <p className="text-sm text-destructive">{errors.accountManagerId.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Source</Label>
                  <Select
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
                <Label htmlFor="dlg-internalNotes">Internal Notes</Label>
                <Textarea
                  id="dlg-internalNotes"
                  rows={3}
                  placeholder="Private notes about this client..."
                  {...register('internalNotes')}
                />
              </div>
            </section>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 px-6 py-4 border-t shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              Create Client
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}

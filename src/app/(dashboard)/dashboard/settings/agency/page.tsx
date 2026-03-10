"use client"

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowLeft,
  Building2,
  Camera,
  Loader2,
  MapPin,
  Mail,
  Phone,
  Globe,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Header } from '@/components/layout/header'
import { useAuth } from '@/contexts/auth-context'
import { graphqlRequest, queries, mutations } from '@/lib/graphql/client'
import { uploadFile } from '@/lib/supabase/storage'
import { useToast } from '@/hooks/use-toast'

interface AgencyProfile {
  name: string
  logoUrl: string
  description: string
  addressLine1: string
  addressLine2: string
  city: string
  state: string
  postalCode: string
  country: string
  primaryEmail: string
  phone: string
  website: string
}

const emptyProfile: AgencyProfile = {
  name: '',
  logoUrl: '',
  description: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  postalCode: '',
  country: '',
  primaryEmail: '',
  phone: '',
  website: '',
}

export default function AgencySettingsPage() {
  const { currentAgency } = useAuth()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<AgencyProfile>(emptyProfile)

  const isAgencyAdmin = currentAgency?.role?.toLowerCase() === 'agency_admin'
  const agencyName = currentAgency?.name || 'Agency'

  useEffect(() => {
    async function fetchProfile() {
      if (!currentAgency?.id) return
      setLoading(true)
      setError(null)
      try {
        const data = await graphqlRequest<{ agency: Partial<AgencyProfile> }>(
          queries.agencyProfile,
          { agencyId: currentAgency.id }
        )
        if (data.agency) {
          setForm({
            name: data.agency.name || '',
            logoUrl: data.agency.logoUrl || '',
            description: data.agency.description || '',
            addressLine1: data.agency.addressLine1 || '',
            addressLine2: data.agency.addressLine2 || '',
            city: data.agency.city || '',
            state: data.agency.state || '',
            postalCode: data.agency.postalCode || '',
            country: data.agency.country || '',
            primaryEmail: data.agency.primaryEmail || '',
            phone: data.agency.phone || '',
            website: data.agency.website || '',
          })
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load agency profile')
      } finally {
        setLoading(false)
      }
    }
    fetchProfile()
  }, [currentAgency?.id])

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !currentAgency?.id) return

    if (!file.type.startsWith('image/')) {
      toast({ title: 'Please select an image file', variant: 'destructive' })
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Image must be under 5MB', variant: 'destructive' })
      return
    }

    setUploading(true)
    try {
      const result = await uploadFile('agency-assets', currentAgency.id, file)
      // Build public URL from Supabase storage
      const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/agency-assets/${result.path}`
      setForm((prev) => ({ ...prev, logoUrl: publicUrl }))
      toast({ title: 'Logo uploaded' })
    } catch (err) {
      toast({
        title: 'Upload failed',
        description: err instanceof Error ? err.message : 'An error occurred',
        variant: 'destructive',
      })
    } finally {
      setUploading(false)
      // Reset file input so the same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleSave = async () => {
    if (!currentAgency?.id) return
    setSaving(true)
    setError(null)
    try {
      const input: Record<string, string> = {}
      for (const [key, value] of Object.entries(form)) {
        if (value !== undefined) {
          input[key] = value
        }
      }
      await graphqlRequest(mutations.updateAgencyProfile, {
        agencyId: currentAgency.id,
        input,
      })
      toast({ title: 'Agency profile updated' })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update profile'
      setError(message)
      toast({ title: 'Error', description: message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const updateField = (field: keyof AgencyProfile, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <>
      <Header title="Agency Profile" subtitle={`Manage profile for ${agencyName}`} />

      <div className="p-6 space-y-6 max-w-3xl">
        <Link
          href="/dashboard/settings"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Settings
        </Link>

        {!isAgencyAdmin && (
          <Card>
            <CardHeader>
              <CardTitle>Agency Profile</CardTitle>
              <CardDescription>
                Only Agency Admins can update the agency profile.
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {error && (
          <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
            {error}
          </div>
        )}

        {/* Logo & Name */}
        <Card>
          <CardHeader>
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Agency Details</CardTitle>
                <CardDescription>Your agency name, logo, and description.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Logo */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Logo</label>
              <div className="flex items-center gap-4">
                <div className="relative h-20 w-20 rounded-lg border bg-muted flex items-center justify-center overflow-hidden">
                  {form.logoUrl ? (
                    <>
                      <Image
                        src={form.logoUrl}
                        alt="Agency logo"
                        fill
                        className="object-cover"
                      />
                      {isAgencyAdmin && (
                        <button
                          onClick={() => setForm((prev) => ({ ...prev, logoUrl: '' }))}
                          className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </>
                  ) : (
                    <Building2 className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                {isAgencyAdmin && (
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleLogoUpload}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading || loading}
                    >
                      {uploading ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Camera className="h-4 w-4 mr-2" />
                      )}
                      {uploading ? 'Uploading...' : 'Upload Logo'}
                    </Button>
                    <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 5MB</p>
                  </div>
                )}
              </div>
            </div>

            {/* Name */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Agency Name</label>
              <Input
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                disabled={!isAgencyAdmin || loading}
                placeholder="Your agency name"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={form.description}
                onChange={(e) => updateField('description', e.target.value)}
                disabled={!isAgencyAdmin || loading}
                placeholder="A brief description of your agency"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Contact Info */}
        <Card>
          <CardHeader>
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Contact Information</CardTitle>
                <CardDescription>Primary email, phone, and website.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  Primary Email
                </label>
                <Input
                  type="email"
                  value={form.primaryEmail}
                  onChange={(e) => updateField('primaryEmail', e.target.value)}
                  disabled={!isAgencyAdmin || loading}
                  placeholder="contact@agency.com"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  Phone
                </label>
                <Input
                  value={form.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                  disabled={!isAgencyAdmin || loading}
                  placeholder="+91 98765 43210"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                Website
              </label>
              <Input
                value={form.website}
                onChange={(e) => updateField('website', e.target.value)}
                disabled={!isAgencyAdmin || loading}
                placeholder="https://agency.com"
              />
            </div>
          </CardContent>
        </Card>

        {/* Address */}
        <Card>
          <CardHeader>
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Address</CardTitle>
                <CardDescription>Your agency&apos;s business address.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Address Line 1</label>
              <Input
                value={form.addressLine1}
                onChange={(e) => updateField('addressLine1', e.target.value)}
                disabled={!isAgencyAdmin || loading}
                placeholder="123 Main Street"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Address Line 2</label>
              <Input
                value={form.addressLine2}
                onChange={(e) => updateField('addressLine2', e.target.value)}
                disabled={!isAgencyAdmin || loading}
                placeholder="Suite 100"
              />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">City</label>
                <Input
                  value={form.city}
                  onChange={(e) => updateField('city', e.target.value)}
                  disabled={!isAgencyAdmin || loading}
                  placeholder="Mumbai"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">State</label>
                <Input
                  value={form.state}
                  onChange={(e) => updateField('state', e.target.value)}
                  disabled={!isAgencyAdmin || loading}
                  placeholder="Maharashtra"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Postal Code</label>
                <Input
                  value={form.postalCode}
                  onChange={(e) => updateField('postalCode', e.target.value)}
                  disabled={!isAgencyAdmin || loading}
                  placeholder="400001"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Country</label>
                <Input
                  value={form.country}
                  onChange={(e) => updateField('country', e.target.value)}
                  disabled={!isAgencyAdmin || loading}
                  placeholder="India"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save */}
        {isAgencyAdmin && (
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={loading || saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        )}
      </div>
    </>
  )
}

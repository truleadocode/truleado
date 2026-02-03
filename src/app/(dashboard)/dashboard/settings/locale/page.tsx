"use client"

import { useEffect, useMemo, useState } from 'react'
import { Globe, Languages, Coins } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Header } from '@/components/layout/header'
import { useAuth } from '@/contexts/auth-context'
import { graphqlRequest, queries, mutations } from '@/lib/graphql/client'
import { useToast } from '@/hooks/use-toast'

const currencyOptions = [
  { code: 'USD', label: 'USD — US Dollar' },
  { code: 'EUR', label: 'EUR — Euro' },
  { code: 'GBP', label: 'GBP — British Pound' },
  { code: 'CAD', label: 'CAD — Canadian Dollar' },
  { code: 'AUD', label: 'AUD — Australian Dollar' },
  { code: 'INR', label: 'INR — Indian Rupee' },
  { code: 'SGD', label: 'SGD — Singapore Dollar' },
  { code: 'JPY', label: 'JPY — Japanese Yen' },
  { code: 'AED', label: 'AED — UAE Dirham' },
]

const timezoneOptions = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'America/New_York' },
  { value: 'America/Chicago', label: 'America/Chicago' },
  { value: 'America/Denver', label: 'America/Denver' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles' },
  { value: 'Europe/London', label: 'Europe/London' },
  { value: 'Europe/Berlin', label: 'Europe/Berlin' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai' },
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata' },
  { value: 'Asia/Singapore', label: 'Asia/Singapore' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo' },
  { value: 'Australia/Sydney', label: 'Australia/Sydney' },
]

const languageOptions = [
  { value: 'en', label: 'English (Global)' },
  { value: 'en-US', label: 'English (US)' },
  { value: 'en-GB', label: 'English (UK)' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'pt-BR', label: 'Portuguese (Brazil)' },
]

export default function LocaleSettingsPage() {
  const { currentAgency } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    currencyCode: 'USD',
    timezone: 'UTC',
    languageCode: 'en',
  })

  const isAgencyAdmin = currentAgency?.role?.toLowerCase() === 'agency_admin'
  const agencyName = currentAgency?.name || 'Agency'

  useEffect(() => {
    async function fetchAgencyLocale() {
      if (!currentAgency?.id) return
      setLoading(true)
      setError(null)
      try {
        const data = await graphqlRequest<{ agency: { currencyCode: string; timezone: string; languageCode: string } }>(
          queries.agencyLocale,
          { agencyId: currentAgency.id }
        )
        if (data.agency) {
          setForm({
            currencyCode: data.agency.currencyCode || 'USD',
            timezone: data.agency.timezone || 'UTC',
            languageCode: data.agency.languageCode || 'en',
          })
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load agency settings')
      } finally {
        setLoading(false)
      }
    }

    fetchAgencyLocale()
  }, [currentAgency?.id])

  const currencyLabel = useMemo(() => {
    return currencyOptions.find((opt) => opt.code === form.currencyCode)?.label || form.currencyCode
  }, [form.currencyCode])

  const handleSave = async () => {
    if (!currentAgency?.id) return
    setSaving(true)
    setError(null)
    try {
      await graphqlRequest(mutations.updateAgencyLocale, {
        agencyId: currentAgency.id,
        input: {
          currencyCode: form.currencyCode,
          timezone: form.timezone,
          languageCode: form.languageCode,
        },
      })
      toast({ title: 'Agency locale updated' })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update locale'
      setError(message)
      toast({ title: 'Error', description: message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Header title="Locale Settings" subtitle={`Locale preferences for ${agencyName}`} />
      <div className="p-6 space-y-6 max-w-3xl">
        {!isAgencyAdmin && (
          <Card>
            <CardHeader>
              <CardTitle>Agency locale</CardTitle>
              <CardDescription>
                Only Agency Admins can update locale settings.
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Globe className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Locale & Region</CardTitle>
                <CardDescription>
                  Set your agency currency, timezone, and language defaults.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Coins className="h-4 w-4 text-muted-foreground" />
                  Currency
                </label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.currencyCode}
                  onChange={(e) => setForm((prev) => ({ ...prev, currencyCode: e.target.value }))}
                  disabled={!isAgencyAdmin || loading}
                >
                  {currencyOptions.map((option) => (
                    <option key={option.code} value={option.code}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">Current: {currencyLabel}</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  Timezone
                </label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.timezone}
                  onChange={(e) => setForm((prev) => ({ ...prev, timezone: e.target.value }))}
                  disabled={!isAgencyAdmin || loading}
                >
                  {timezoneOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Languages className="h-4 w-4 text-muted-foreground" />
                  Language
                </label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.languageCode}
                  onChange={(e) => setForm((prev) => ({ ...prev, languageCode: e.target.value }))}
                  disabled={!isAgencyAdmin || loading}
                >
                  {languageOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                These defaults are used for currency formatting and scheduling.
              </div>
              <Button onClick={handleSave} disabled={!isAgencyAdmin || loading || saving}>
                {saving ? 'Saving...' : 'Save changes'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}

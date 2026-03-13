"use client"

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Building2, Users, Calendar, Save, Crown, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface AgencyDetail {
  id: string
  name: string
  status: string
  billing_email: string | null
  currency_code: string | null
  credit_balance: number
  trial_start_date: string | null
  trial_end_date: string | null
  trial_days: number | null
  subscription_status: string | null
  subscription_tier: string | null
  billing_interval: string | null
  subscription_start_date: string | null
  subscription_end_date: string | null
  enterprise_price_monthly: number | null
  enterprise_price_yearly: number | null
  enterprise_currency: string | null
  created_at: string
  users: Array<{
    id: string
    role: string
    isActive: boolean
    createdAt: string
    user: { id: string; name: string | null; email: string | null }
  }>
}

const ROLE_LABELS: Record<string, string> = {
  agency_admin: 'Agency Admin',
  account_manager: 'Account Manager',
  operator: 'Operator',
  internal_approver: 'Internal Approver',
}

function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function AdminAgencyDetail() {
  const params = useParams()
  const agencyId = params.id as string

  const [agency, setAgency] = useState<AgencyDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  // Trial edit form
  const [trialDays, setTrialDays] = useState('')
  const [subscriptionStatus, setSubscriptionStatus] = useState('')

  // Subscription edit form
  const [subscriptionTier, setSubscriptionTier] = useState('')
  const [billingInterval, setBillingInterval] = useState('')

  // Enterprise pricing
  const [entMonthly, setEntMonthly] = useState('')
  const [entYearly, setEntYearly] = useState('')
  const [entCurrency, setEntCurrency] = useState('USD')

  // Subscription save state
  const [savingSub, setSavingSub] = useState(false)
  const [subMessage, setSubMessage] = useState('')

  useEffect(() => {
    if (!agencyId) return
    fetch(`/api/admin/agencies/${agencyId}`)
      .then((r) => r.json())
      .then((data) => {
        setAgency(data)
        setTrialDays(String(data.trial_days || 30))
        setSubscriptionStatus(data.subscription_status || 'trial')
        setSubscriptionTier(data.subscription_tier || '')
        setBillingInterval(data.billing_interval || '')
        setEntMonthly(data.enterprise_price_monthly ? String(data.enterprise_price_monthly / 100) : '')
        setEntYearly(data.enterprise_price_yearly ? String(data.enterprise_price_yearly / 100) : '')
        setEntCurrency(data.enterprise_currency || data.currency_code || 'USD')
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [agencyId])

  const handleSaveTrial = async () => {
    setSaving(true)
    setMessage('')
    try {
      // Recalculate trial_end_date from trial_start_date + new days
      const startDate = agency?.trial_start_date
        ? new Date(agency.trial_start_date)
        : new Date(agency?.created_at || Date.now())
      const newEnd = new Date(startDate)
      newEnd.setDate(newEnd.getDate() + parseInt(trialDays))

      const res = await fetch(`/api/admin/agencies/${agencyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trialDays: parseInt(trialDays),
          trialEndDate: newEnd.toISOString(),
          subscriptionStatus,
        }),
      })

      if (res.ok) {
        const updated = await res.json()
        setAgency((prev) => (prev ? { ...prev, ...updated } : prev))
        setMessage('Trial settings updated')
      } else {
        const err = await res.json()
        setMessage(`Error: ${err.error}`)
      }
    } catch {
      setMessage('Failed to update')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveSubscription = async () => {
    setSavingSub(true)
    setSubMessage('')
    try {
      const payload: Record<string, unknown> = {
        subscriptionTier: subscriptionTier || null,
        billingInterval: billingInterval || null,
      }

      // Enterprise pricing
      if (subscriptionTier === 'enterprise') {
        payload.enterprisePriceMonthly = entMonthly ? Math.round(parseFloat(entMonthly) * 100) : null
        payload.enterprisePriceYearly = entYearly ? Math.round(parseFloat(entYearly) * 100) : null
        payload.enterpriseCurrency = entCurrency || null
      }

      // If setting to active with a tier, auto-set subscription dates
      if (subscriptionTier && subscriptionStatus === 'active' && !agency?.subscription_start_date) {
        const now = new Date()
        payload.subscriptionStartDate = now.toISOString()
        const end = new Date(now)
        if (billingInterval === 'yearly') {
          end.setFullYear(end.getFullYear() + 1)
        } else {
          end.setMonth(end.getMonth() + 1)
        }
        payload.subscriptionEndDate = end.toISOString()
      }

      const res = await fetch(`/api/admin/agencies/${agencyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        const updated = await res.json()
        setAgency((prev) => (prev ? { ...prev, ...updated } : prev))
        setSubMessage('Subscription updated')
      } else {
        const err = await res.json()
        setSubMessage(`Error: ${err.error}`)
      }
    } catch {
      setSubMessage('Failed to update')
    } finally {
      setSavingSub(false)
    }
  }

  if (loading) {
    return (
      <div className="container px-6 py-6">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-muted rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (!agency) {
    return (
      <div className="container px-6 py-6">
        <p className="text-muted-foreground">Agency not found.</p>
      </div>
    )
  }

  return (
    <div className="container px-6 py-6 space-y-6 max-w-4xl">
      <Link
        href="/admin-e53ea1"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Agencies
      </Link>

      {/* Agency Header */}
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
          <Building2 className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">{agency.name}</h1>
          <p className="text-sm text-muted-foreground">
            {agency.billing_email || 'No billing email'} &middot; {agency.currency_code || 'USD'}
          </p>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Plan</p>
            <p className="font-semibold capitalize">
              {agency.subscription_tier
                ? `${agency.subscription_tier} · ${agency.subscription_status || '—'}`
                : agency.subscription_status || '—'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Credits</p>
            <p className="font-semibold">{agency.credit_balance}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Created</p>
            <p className="font-semibold text-xs">{formatDate(agency.created_at)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Trial Management */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <CardTitle>Trial Management</CardTitle>
              <CardDescription>
                Trial started {formatDate(agency.trial_start_date)} &middot;
                Ends {formatDate(agency.trial_end_date)}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Trial Duration (days)</label>
              <Input
                type="number"
                min={1}
                max={365}
                value={trialDays}
                onChange={(e) => setTrialDays(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Changing this recalculates the end date from the original start date.
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Subscription Status</label>
              <Select value={subscriptionStatus} onValueChange={setSubscriptionStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="trial">Trial</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {message && (
            <p className={`text-sm ${message.startsWith('Error') ? 'text-destructive' : 'text-green-600'}`}>
              {message}
            </p>
          )}
          <Button onClick={handleSaveTrial} disabled={saving} size="sm">
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Update Trial'}
          </Button>
        </CardContent>
      </Card>

      {/* Subscription Tier */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-3">
            <Crown className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <CardTitle>Subscription Plan</CardTitle>
              <CardDescription>
                Current: {agency.subscription_tier ? agency.subscription_tier.charAt(0).toUpperCase() + agency.subscription_tier.slice(1) : 'None'}{agency.billing_interval ? ` (${agency.billing_interval})` : ''}
                {agency.subscription_end_date ? ` · Ends ${formatDate(agency.subscription_end_date)}` : ''}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Subscription Tier</label>
              <Select value={subscriptionTier} onValueChange={setSubscriptionTier}>
                <SelectTrigger>
                  <SelectValue placeholder="No tier set" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">Basic</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Billing Interval</label>
              <Select value={billingInterval} onValueChange={setBillingInterval}>
                <SelectTrigger>
                  <SelectValue placeholder="Not set" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Enterprise Pricing — only when tier is enterprise */}
          {subscriptionTier === 'enterprise' && (
            <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium">Custom Enterprise Pricing</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium">Monthly Price</label>
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    placeholder="e.g., 5000.00"
                    value={entMonthly}
                    onChange={(e) => setEntMonthly(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium">Yearly Price</label>
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    placeholder="e.g., 50000.00"
                    value={entYearly}
                    onChange={(e) => setEntYearly(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium">Currency</label>
                  <Select value={entCurrency} onValueChange={setEntCurrency}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INR">INR</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Enter prices in standard units (e.g., 5000 for ₹5,000 or $5,000). Stored in smallest unit internally.
              </p>
            </div>
          )}

          {subMessage && (
            <p className={`text-sm ${subMessage.startsWith('Error') ? 'text-destructive' : 'text-green-600'}`}>
              {subMessage}
            </p>
          )}
          <Button onClick={handleSaveSubscription} disabled={savingSub} size="sm">
            <Save className="h-4 w-4 mr-2" />
            {savingSub ? 'Saving...' : 'Update Subscription'}
          </Button>
        </CardContent>
      </Card>

      {/* Users */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <CardTitle>Users ({agency.users.length})</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left font-medium p-3">Name</th>
                  <th className="text-left font-medium p-3">Email</th>
                  <th className="text-left font-medium p-3">Role</th>
                  <th className="text-left font-medium p-3">Joined</th>
                </tr>
              </thead>
              <tbody>
                {agency.users.map((au) => (
                  <tr key={au.id} className="border-b last:border-0">
                    <td className="p-3 font-medium">{au.user.name || '—'}</td>
                    <td className="p-3 text-muted-foreground">{au.user.email || '—'}</td>
                    <td className="p-3">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted">
                        {ROLE_LABELS[au.role] || au.role}
                      </span>
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">
                      {formatDate(au.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

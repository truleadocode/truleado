"use client"

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Building2, Users, Calendar, Save } from 'lucide-react'
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
  token_balance: number
  premium_token_balance: number
  trial_start_date: string | null
  trial_end_date: string | null
  trial_days: number | null
  subscription_status: string | null
  created_at: string
  users: Array<{
    id: string
    role: string
    isActive: boolean
    createdAt: string
    user: { id: string; name: string | null; email: string | null }
  }>
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

  useEffect(() => {
    if (!agencyId) return
    fetch(`/api/admin/agencies/${agencyId}`)
      .then((r) => r.json())
      .then((data) => {
        setAgency(data)
        setTrialDays(String(data.trial_days || 30))
        setSubscriptionStatus(data.subscription_status || 'trial')
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
            <p className="text-xs text-muted-foreground">Status</p>
            <p className="font-semibold capitalize">{agency.subscription_status || '—'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Basic Tokens</p>
            <p className="font-semibold">{agency.token_balance}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Premium Tokens</p>
            <p className="font-semibold">{agency.premium_token_balance}</p>
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
                        {au.role}
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

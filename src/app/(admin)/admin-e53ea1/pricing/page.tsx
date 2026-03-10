"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, DollarSign, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'

interface PlanRow {
  id: string
  tier: string
  billingInterval: string
  currency: string
  priceAmount: number
  isActive: boolean
}

const TIER_LABELS: Record<string, string> = {
  basic: 'Basic',
  pro: 'Pro',
}

const INTERVAL_LABELS: Record<string, string> = {
  monthly: 'Monthly',
  yearly: 'Yearly',
}

function formatPrice(amount: number, currency: string): string {
  const value = amount / 100
  return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value)
}

export default function AdminPricingPage() {
  const [plans, setPlans] = useState<PlanRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  // Track edits as { [planId]: { priceAmount?, isActive? } }
  const [edits, setEdits] = useState<Record<string, { priceAmount?: number; isActive?: boolean }>>({})

  useEffect(() => {
    fetch('/api/admin/subscription-plans')
      .then((r) => r.json())
      .then((data) => setPlans(data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const handlePriceChange = (planId: string, displayValue: string) => {
    // Convert display value (e.g. "999.00") to smallest unit (99900)
    const numericValue = parseFloat(displayValue)
    if (isNaN(numericValue)) return
    const smallestUnit = Math.round(numericValue * 100)

    setEdits((prev) => ({
      ...prev,
      [planId]: { ...prev[planId], priceAmount: smallestUnit },
    }))
  }

  const handleActiveToggle = (planId: string, isActive: boolean) => {
    setEdits((prev) => ({
      ...prev,
      [planId]: { ...prev[planId], isActive },
    }))
  }

  const getEffectiveValue = (plan: PlanRow) => {
    const edit = edits[plan.id]
    return {
      priceAmount: edit?.priceAmount ?? plan.priceAmount,
      isActive: edit?.isActive ?? plan.isActive,
    }
  }

  const handleSave = async () => {
    const changedPlans = Object.entries(edits).map(([id, changes]) => ({
      id,
      ...changes,
    }))

    if (changedPlans.length === 0) {
      setMessage('No changes to save')
      return
    }

    setSaving(true)
    setMessage('')

    try {
      const res = await fetch('/api/admin/subscription-plans', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plans: changedPlans }),
      })

      if (res.ok) {
        // Refresh data
        const refreshRes = await fetch('/api/admin/subscription-plans')
        const freshData = await refreshRes.json()
        setPlans(freshData)
        setEdits({})
        setMessage(`${changedPlans.length} plan(s) updated`)
      } else {
        const err = await res.json()
        setMessage(`Error: ${err.error}`)
      }
    } catch {
      setMessage('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const hasChanges = Object.keys(edits).length > 0

  // Group plans by tier
  const basicPlans = plans.filter((p) => p.tier === 'basic')
  const proPlans = plans.filter((p) => p.tier === 'pro')

  const renderPlanTable = (tierPlans: PlanRow[], tierLabel: string) => (
    <Card>
      <CardHeader>
        <CardTitle>{tierLabel} Plans</CardTitle>
        <CardDescription>
          Set prices in smallest currency unit display (e.g., 999.00 for ₹999 or $9.99)
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left font-medium p-3">Interval</th>
                <th className="text-left font-medium p-3">Currency</th>
                <th className="text-left font-medium p-3">Price</th>
                <th className="text-left font-medium p-3">Display</th>
                <th className="text-center font-medium p-3">Active</th>
              </tr>
            </thead>
            <tbody>
              {tierPlans.map((plan) => {
                const effective = getEffectiveValue(plan)
                return (
                  <tr key={plan.id} className="border-b last:border-0">
                    <td className="p-3 font-medium">
                      {INTERVAL_LABELS[plan.billingInterval] || plan.billingInterval}
                    </td>
                    <td className="p-3">{plan.currency}</td>
                    <td className="p-3">
                      <Input
                        type="number"
                        step="0.01"
                        min={0}
                        className="w-32"
                        value={(effective.priceAmount / 100).toFixed(2)}
                        onChange={(e) => handlePriceChange(plan.id, e.target.value)}
                      />
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {formatPrice(effective.priceAmount, plan.currency)}
                      {plan.billingInterval === 'monthly' ? '/mo' : '/yr'}
                    </td>
                    <td className="p-3 text-center">
                      <Switch
                        checked={effective.isActive}
                        onCheckedChange={(checked) => handleActiveToggle(plan.id, checked)}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )

  if (loading) {
    return (
      <div className="container px-6 py-6">
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-48 bg-muted rounded animate-pulse" />
          ))}
        </div>
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
        Back to Dashboard
      </Link>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <DollarSign className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Subscription Pricing</h1>
            <p className="text-sm text-muted-foreground">
              Manage plan prices for Basic and Pro tiers. Enterprise pricing is set per-agency.
            </p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving || !hasChanges} size="sm">
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      {message && (
        <p className={`text-sm ${message.startsWith('Error') ? 'text-destructive' : 'text-green-600'}`}>
          {message}
        </p>
      )}

      {renderPlanTable(basicPlans, 'Basic')}
      {renderPlanTable(proPlans, 'Pro')}
    </div>
  )
}

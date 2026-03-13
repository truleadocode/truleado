"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, DollarSign, Save, Zap } from 'lucide-react'
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

interface CreditConfig {
  id: string
  creditPriceUsd: number
  updatedAt: string
}

interface ActionPricingRow {
  id: string
  provider: string
  action: string
  tokenType: string
  providerCostUsd: number
  creditsCharged: number
  isActive: boolean
  updatedAt: string
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

function calcMargin(providerCostUsd: number, creditsCharged: number, creditPriceUsd: number): string {
  if (providerCostUsd === 0) return '—'
  const revenue = creditsCharged * creditPriceUsd
  const margin = ((revenue - providerCostUsd) / providerCostUsd) * 100
  return `${margin.toFixed(0)}%`
}

function formatAction(action: string): string {
  return action.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export default function AdminPricingPage() {
  const [plans, setPlans] = useState<PlanRow[]>([])
  const [creditConfig, setCreditConfig] = useState<CreditConfig | null>(null)
  const [actionPricing, setActionPricing] = useState<ActionPricingRow[]>([])
  const [inrUnitPrice, setInrUnitPrice] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  // Plan edit state
  const [planEdits, setPlanEdits] = useState<Record<string, { priceAmount?: number; isActive?: boolean }>>({})
  const [savingPlans, setSavingPlans] = useState(false)
  const [planMessage, setPlanMessage] = useState('')

  // Credit config edit state
  const [creditPriceInput, setCreditPriceInput] = useState('')
  const [savingCredit, setSavingCredit] = useState(false)
  const [creditMessage, setCreditMessage] = useState('')

  // Action pricing edit state
  const [actionEdits, setActionEdits] = useState<
    Record<string, { providerCostUsd?: number; creditsCharged?: number; isActive?: boolean }>
  >({})
  const [savingAction, setSavingAction] = useState(false)
  const [actionMessage, setActionMessage] = useState('')

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/subscription-plans').then((r) => r.json()),
      fetch('/api/admin/credit-config').then((r) => r.json()),
      fetch('/api/admin/action-pricing').then((r) => r.json()),
      fetch('/api/billing/credit-config?currency=INR').then((r) => r.json()),
    ])
      .then(([plansData, creditData, actionData, inrData]) => {
        setPlans(plansData)
        setCreditConfig(creditData)
        setCreditPriceInput(String(creditData.creditPriceUsd))
        setActionPricing(actionData)
        setInrUnitPrice(inrData.unitPriceSmallest ?? null)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  // --- Plan handlers ---
  const handlePlanPriceChange = (planId: string, displayValue: string) => {
    const numericValue = parseFloat(displayValue)
    if (isNaN(numericValue)) return
    const smallestUnit = Math.round(numericValue * 100)
    setPlanEdits((prev) => ({ ...prev, [planId]: { ...prev[planId], priceAmount: smallestUnit } }))
  }

  const handlePlanActiveToggle = (planId: string, isActive: boolean) => {
    setPlanEdits((prev) => ({ ...prev, [planId]: { ...prev[planId], isActive } }))
  }

  const getEffectivePlan = (plan: PlanRow) => {
    const edit = planEdits[plan.id]
    return { priceAmount: edit?.priceAmount ?? plan.priceAmount, isActive: edit?.isActive ?? plan.isActive }
  }

  const handleSavePlans = async () => {
    const changedPlans = Object.entries(planEdits).map(([id, changes]) => ({ id, ...changes }))
    if (changedPlans.length === 0) { setPlanMessage('No changes to save'); return }
    setSavingPlans(true)
    setPlanMessage('')
    try {
      const res = await fetch('/api/admin/subscription-plans', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plans: changedPlans }),
      })
      if (res.ok) {
        const refreshed = await fetch('/api/admin/subscription-plans').then((r) => r.json())
        setPlans(refreshed)
        setPlanEdits({})
        setPlanMessage(`${changedPlans.length} plan(s) updated`)
      } else {
        const err = await res.json()
        setPlanMessage(`Error: ${err.error}`)
      }
    } catch { setPlanMessage('Failed to save') }
    finally { setSavingPlans(false) }
  }

  // --- Credit config handlers ---
  const handleSaveCredit = async () => {
    if (!creditConfig) return
    const value = parseFloat(creditPriceInput)
    if (isNaN(value) || value <= 0) { setCreditMessage('Enter a valid positive price'); return }
    setSavingCredit(true)
    setCreditMessage('')
    try {
      const res = await fetch('/api/admin/credit-config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: creditConfig.id, creditPriceUsd: value }),
      })
      if (res.ok) {
        setCreditConfig((prev) => prev ? { ...prev, creditPriceUsd: value } : prev)
        setCreditMessage('Credit price updated')
      } else {
        const err = await res.json()
        setCreditMessage(`Error: ${err.error}`)
      }
    } catch { setCreditMessage('Failed to save') }
    finally { setSavingCredit(false) }
  }

  // --- Action pricing handlers ---
  const handleActionCostChange = (rowId: string, field: 'providerCostUsd' | 'creditsCharged', value: string) => {
    const num = parseFloat(value)
    if (isNaN(num)) return
    setActionEdits((prev) => ({ ...prev, [rowId]: { ...prev[rowId], [field]: num } }))
  }

  const handleActionActiveToggle = (rowId: string, isActive: boolean) => {
    setActionEdits((prev) => ({ ...prev, [rowId]: { ...prev[rowId], isActive } }))
  }

  const getEffectiveAction = (row: ActionPricingRow) => {
    const edit = actionEdits[row.id]
    return {
      providerCostUsd: edit?.providerCostUsd ?? row.providerCostUsd,
      creditsCharged: edit?.creditsCharged ?? row.creditsCharged,
      isActive: edit?.isActive ?? row.isActive,
    }
  }

  const handleSaveActions = async () => {
    const changedRows = Object.entries(actionEdits).map(([id, changes]) => ({ id, ...changes }))
    if (changedRows.length === 0) { setActionMessage('No changes to save'); return }
    setSavingAction(true)
    setActionMessage('')
    try {
      const res = await fetch('/api/admin/action-pricing', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: changedRows }),
      })
      if (res.ok) {
        const refreshed = await fetch('/api/admin/action-pricing').then((r) => r.json())
        setActionPricing(refreshed)
        setActionEdits({})
        setActionMessage(`${changedRows.length} action(s) updated`)
      } else {
        const err = await res.json()
        setActionMessage(`Error: ${err.error}`)
      }
    } catch { setActionMessage('Failed to save') }
    finally { setSavingAction(false) }
  }

  const hasPlanChanges = Object.keys(planEdits).length > 0
  const hasActionChanges = Object.keys(actionEdits).length > 0

  const basicPlans = plans.filter((p) => p.tier === 'basic')
  const proPlans = plans.filter((p) => p.tier === 'pro')

  const renderPlanTable = (tierPlans: PlanRow[], tierLabel: string) => (
    <Card>
      <CardHeader>
        <CardTitle>{tierLabel} Plans</CardTitle>
        <CardDescription>
          Set prices in standard units (e.g., 999.00 for ₹999 or $9.99)
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
                const effective = getEffectivePlan(plan)
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
                        onChange={(e) => handlePlanPriceChange(plan.id, e.target.value)}
                      />
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {formatPrice(effective.priceAmount, plan.currency)}
                      {plan.billingInterval === 'monthly' ? '/mo' : '/yr'}
                    </td>
                    <td className="p-3 text-center">
                      <Switch
                        checked={effective.isActive}
                        onCheckedChange={(checked) => handlePlanActiveToggle(plan.id, checked)}
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
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-48 bg-muted rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="container px-6 py-6 space-y-8 max-w-5xl">
      <Link
        href="/admin-e53ea1"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Link>

      {/* ── Credit Purchase Price ─────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Credit Purchase Price</h2>
              <p className="text-sm text-muted-foreground">
                USD price per credit. INR price shown to agencies = credit_price_usd × live fx rate.
              </p>
            </div>
          </div>
          <Button onClick={handleSaveCredit} disabled={savingCredit} size="sm">
            <Save className="h-4 w-4 mr-2" />
            {savingCredit ? 'Saving...' : 'Save'}
          </Button>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-end gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Price per Credit (USD)</label>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">$</span>
                  <Input
                    type="number"
                    step="0.001"
                    min={0.001}
                    className="w-36"
                    value={creditPriceInput}
                    onChange={(e) => setCreditPriceInput(e.target.value)}
                  />
                </div>
              </div>
              {inrUnitPrice !== null && (
                <div className="pb-1 text-sm text-muted-foreground space-y-0.5">
                  <p>Live INR equivalent:</p>
                  <p className="font-medium">1 credit ≈ ₹{(inrUnitPrice / 100).toFixed(2)}</p>
                </div>
              )}
            </div>
            {creditMessage && (
              <p className={`mt-3 text-sm ${creditMessage.startsWith('Error') ? 'text-destructive' : 'text-green-600'}`}>
                {creditMessage}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Action Pricing ────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Action Pricing</h2>
              <p className="text-sm text-muted-foreground">
                Per-action vendor cost and credits charged. Margin = (credits × credit_price − vendor_cost) / vendor_cost.
              </p>
            </div>
          </div>
          <Button onClick={handleSaveActions} disabled={savingAction || !hasActionChanges} size="sm">
            <Save className="h-4 w-4 mr-2" />
            {savingAction ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left font-medium p-3">Provider</th>
                    <th className="text-left font-medium p-3">Action</th>
                    <th className="text-left font-medium p-3">Vendor Cost (USD)</th>
                    <th className="text-left font-medium p-3">Credits Charged</th>
                    <th className="text-left font-medium p-3">Revenue / Margin</th>
                    <th className="text-center font-medium p-3">Active</th>
                  </tr>
                </thead>
                <tbody>
                  {actionPricing.map((row) => {
                    const effective = getEffectiveAction(row)
                    const creditPrice = parseFloat(creditPriceInput || '0') || creditConfig?.creditPriceUsd || 0.012
                    const revenue = effective.creditsCharged * creditPrice
                    return (
                      <tr key={row.id} className="border-b last:border-0">
                        <td className="p-3 font-medium capitalize">{row.provider}</td>
                        <td className="p-3 text-muted-foreground">{formatAction(row.action)}</td>
                        <td className="p-3">
                          <Input
                            type="number"
                            step="0.0001"
                            min={0}
                            className="w-28"
                            value={effective.providerCostUsd}
                            onChange={(e) => handleActionCostChange(row.id, 'providerCostUsd', e.target.value)}
                          />
                        </td>
                        <td className="p-3">
                          <Input
                            type="number"
                            step="1"
                            min={0}
                            className="w-24"
                            value={effective.creditsCharged}
                            onChange={(e) => handleActionCostChange(row.id, 'creditsCharged', e.target.value)}
                          />
                        </td>
                        <td className="p-3 text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">${revenue.toFixed(4)}</span>
                          {' / '}
                          <span className={revenue > effective.providerCostUsd ? 'text-green-600' : 'text-red-600'}>
                            {calcMargin(effective.providerCostUsd, effective.creditsCharged, creditPrice)}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <Switch
                            checked={effective.isActive}
                            onCheckedChange={(checked) => handleActionActiveToggle(row.id, checked)}
                          />
                        </td>
                      </tr>
                    )
                  })}
                  {actionPricing.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-muted-foreground">
                        No action pricing rows found. Run migration 00052 to seed them.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {actionMessage && (
          <p className={`mt-2 text-sm ${actionMessage.startsWith('Error') ? 'text-destructive' : 'text-green-600'}`}>
            {actionMessage}
          </p>
        )}
      </div>

      {/* ── Subscription Plans ────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Subscription Pricing</h2>
              <p className="text-sm text-muted-foreground">
                Manage plan prices for Basic and Pro tiers. Enterprise pricing is set per-agency.
              </p>
            </div>
          </div>
          <Button onClick={handleSavePlans} disabled={savingPlans || !hasPlanChanges} size="sm">
            <Save className="h-4 w-4 mr-2" />
            {savingPlans ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>

        {planMessage && (
          <p className={`mb-3 text-sm ${planMessage.startsWith('Error') ? 'text-destructive' : 'text-green-600'}`}>
            {planMessage}
          </p>
        )}

        <div className="space-y-4">
          {renderPlanTable(basicPlans, 'Basic')}
          {renderPlanTable(proPlans, 'Pro')}
        </div>
      </div>
    </div>
  )
}

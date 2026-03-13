"use client"

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Script from 'next/script'
import {
  ArrowLeft,
  CreditCard,
  Coins,
  CheckCircle2,
  XCircle,
  Clock,
  Minus,
  Plus,
  Crown,
  Check,
  Mail,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Header } from '@/components/layout/header'
import { useAuth } from '@/contexts/auth-context'
import { useCurrency } from '@/hooks/use-currency'
import { useToast } from '@/hooks/use-toast'
import { formatSmallestUnit } from '@/lib/currency'
import { graphqlRequest, queries } from '@/lib/graphql/client'

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance
  }
}

interface RazorpayOptions {
  key: string
  amount: number
  currency: string
  name: string
  description: string
  order_id: string
  handler: (response: RazorpayResponse) => void
  prefill?: { email?: string; name?: string }
  theme?: { color?: string }
  modal?: { ondismiss?: () => void }
}

interface RazorpayInstance {
  open: () => void
}

interface RazorpayResponse {
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
}

interface TokenPurchase {
  id: string
  creditQuantity: number
  amountPaise: number
  currency: string
  razorpayOrderId: string | null
  status: string
  createdAt: string
  completedAt: string | null
}

interface AgencyBillingData {
  creditBalance: number
  subscriptionStatus: string | null
  subscriptionTier: string | null
  billingInterval: string | null
  trialEndDate: string | null
  subscriptionEndDate: string | null
}

interface SubscriptionPlan {
  id: string
  tier: string
  billingInterval: string
  currency: string
  priceAmount: number
  isActive: boolean
}

interface SubscriptionPayment {
  id: string
  planTier: string
  billingInterval: string
  amount: number
  currency: string
  status: string
  periodStart: string | null
  periodEnd: string | null
  createdAt: string
  completedAt: string | null
}

const TIER_LABELS: Record<string, string> = {
  basic: 'Basic',
  pro: 'Pro',
  enterprise: 'Enterprise',
}

const BASIC_FEATURES = [
  'Creator discovery & management',
  'Campaign tracking',
  'Basic analytics & reporting',
  'Up to 5 team members',
]

const PRO_FEATURES = [
  'Everything in Basic',
  'Advanced analytics & insights',
  'Client portal access',
  'Unlimited team members',
  'Priority support',
]

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function daysUntil(dateString: string | null): number {
  if (!dateString) return 0
  return Math.max(0, Math.ceil((new Date(dateString).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
}

export default function BillingSettingsPage() {
  const { user, currentAgency, getToken } = useAuth()
  const { currencyCode } = useCurrency()
  const { toast } = useToast()
  const billingCurrency = currencyCode === 'INR' ? 'INR' : 'USD'

  const [agencyData, setAgencyData] = useState<AgencyBillingData | null>(null)
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [purchases, setPurchases] = useState<TokenPurchase[]>([])
  const [subPayments, setSubPayments] = useState<SubscriptionPayment[]>([])
  const [loading, setLoading] = useState(true)

  // Subscription UI state
  const [showPlans, setShowPlans] = useState(false)
  const [selectedInterval, setSelectedInterval] = useState<'monthly' | 'yearly'>('monthly')
  const [subscribing, setSubscribing] = useState<string | null>(null)

  // Credit purchase state
  const [creditQty, setCreditQty] = useState(100)
  const [creditPriceUsd, setCreditPriceUsd] = useState(0.012)
  const [unitPriceSmallest, setUnitPriceSmallest] = useState(1)
  const [purchasing, setPurchasing] = useState(false)

  const isAgencyAdmin = currentAgency?.role?.toLowerCase() === 'agency_admin'

  const subStatus = agencyData?.subscriptionStatus
  const subTier = agencyData?.subscriptionTier
  const isTrial = subStatus === 'trial'
  const isExpired = subStatus === 'expired'
  const isActive = subStatus === 'active'

  const fetchData = useCallback(async () => {
    if (!currentAgency?.id) return
    setLoading(true)
    try {
      const [balanceData, purchaseData, plansData, subPayData, creditConfigData] = await Promise.all([
        graphqlRequest<{ agency: AgencyBillingData }>(queries.agencyTokenBalance, {
          id: currentAgency.id,
        }),
        graphqlRequest<{ tokenPurchases: TokenPurchase[] }>(queries.tokenPurchases, {
          agencyId: currentAgency.id,
        }),
        graphqlRequest<{ subscriptionPlans: SubscriptionPlan[] }>(queries.subscriptionPlans, {
          currency: billingCurrency,
        }),
        graphqlRequest<{ subscriptionPayments: SubscriptionPayment[] }>(queries.subscriptionPayments, {
          agencyId: currentAgency.id,
        }),
        fetch(`/api/billing/credit-config?currency=${billingCurrency}`).then((r) => r.json()),
      ])
      setAgencyData(balanceData.agency)
      setPurchases(purchaseData.tokenPurchases)
      setPlans(plansData.subscriptionPlans)
      setSubPayments(subPayData.subscriptionPayments)
      setCreditPriceUsd(creditConfigData.creditPriceUsd ?? 0.012)
      setUnitPriceSmallest(creditConfigData.unitPriceSmallest ?? 1)
    } catch (err) {
      console.error('Failed to fetch billing data:', err)
      toast({ title: 'Failed to load billing data', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [currentAgency?.id, billingCurrency, toast])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Auto-show plans on trial or expired
  useEffect(() => {
    if (isTrial || isExpired) setShowPlans(true)
  }, [isTrial, isExpired])

  // --- Subscription purchase handler ---
  const handleSubscribe = async (tier: 'basic' | 'pro') => {
    if (!currentAgency?.id || subscribing) return
    setSubscribing(tier)

    try {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')

      const orderRes = await fetch('/api/razorpay/create-subscription-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          agencyId: currentAgency.id,
          tier,
          billingInterval: selectedInterval,
        }),
      })

      if (!orderRes.ok) {
        const errData = await orderRes.json()
        throw new Error(errData.error || 'Failed to create order')
      }

      const { orderId, amount, currency, paymentId, keyId } = await orderRes.json()

      if (!window.Razorpay) {
        throw new Error('Razorpay SDK not loaded. Please refresh the page and try again.')
      }

      const rzp = new window.Razorpay({
        key: keyId,
        amount,
        currency,
        name: 'Truleado',
        description: `${TIER_LABELS[tier]} Plan (${selectedInterval === 'yearly' ? 'Annual' : 'Monthly'})`,
        order_id: orderId,
        handler: async (response: RazorpayResponse) => {
          try {
            const authToken = await getToken()
            const verifyRes = await fetch('/api/razorpay/verify-subscription-payment', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${authToken}`,
              },
              body: JSON.stringify({
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
                paymentId,
              }),
            })

            if (!verifyRes.ok) {
              const errData = await verifyRes.json()
              throw new Error(errData.error || 'Payment verification failed')
            }

            toast({
              title: 'Subscription activated!',
              description: `You are now on the ${TIER_LABELS[tier]} plan.`,
            })
            setShowPlans(false)
            fetchData()
          } catch (err) {
            toast({
              title: 'Payment verification failed',
              description: err instanceof Error ? err.message : 'Please contact support',
              variant: 'destructive',
            })
          } finally {
            setSubscribing(null)
          }
        },
        prefill: {
          email: user?.email || undefined,
          name: user?.name || undefined,
        },
        theme: { color: '#7c3aed' },
        modal: {
          ondismiss: () => setSubscribing(null),
        },
      })

      rzp.open()
    } catch (err) {
      toast({
        title: 'Subscription failed',
        description: err instanceof Error ? err.message : 'An error occurred',
        variant: 'destructive',
      })
      setSubscribing(null)
    }
  }

  // --- Credit purchase handler ---
  const handleCreditPurchase = async () => {
    if (!currentAgency?.id || purchasing) return

    if (creditQty < 1) {
      toast({ title: 'Enter a valid quantity', variant: 'destructive' })
      return
    }

    setPurchasing(true)

    try {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')

      const orderRes = await fetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          quantity: creditQty,
          agencyId: currentAgency.id,
        }),
      })

      if (!orderRes.ok) {
        const errData = await orderRes.json()
        throw new Error(errData.error || 'Failed to create order')
      }

      const { orderId, amount, currency, purchaseId, keyId } = await orderRes.json()

      if (!window.Razorpay) {
        throw new Error('Razorpay SDK not loaded. Please refresh the page and try again.')
      }

      const rzp = new window.Razorpay({
        key: keyId,
        amount,
        currency,
        name: 'Truleado',
        description: `${creditQty} Credit${creditQty > 1 ? 's' : ''}`,
        order_id: orderId,
        handler: async (response: RazorpayResponse) => {
          try {
            const authToken = await getToken()
            const verifyRes = await fetch('/api/razorpay/verify-payment', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${authToken}`,
              },
              body: JSON.stringify({
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
                purchaseId,
              }),
            })

            if (!verifyRes.ok) {
              const errData = await verifyRes.json()
              throw new Error(errData.error || 'Payment verification failed')
            }

            const result = await verifyRes.json()
            toast({
              title: 'Payment successful',
              description: `${result.creditsAdded} credit${result.creditsAdded > 1 ? 's' : ''} added to your balance`,
            })
            fetchData()
          } catch (err) {
            toast({
              title: 'Payment verification failed',
              description: err instanceof Error ? err.message : 'Please contact support',
              variant: 'destructive',
            })
          } finally {
            setPurchasing(false)
          }
        },
        prefill: {
          email: user?.email || undefined,
          name: user?.name || undefined,
        },
        theme: { color: '#7c3aed' },
        modal: {
          ondismiss: () => setPurchasing(false),
        },
      })

      rzp.open()
    } catch (err) {
      toast({
        title: 'Purchase failed',
        description: err instanceof Error ? err.message : 'An error occurred',
        variant: 'destructive',
      })
      setPurchasing(false)
    }
  }

  // --- Helpers ---
  const getPrice = (tier: string, interval: string) => {
    const plan = plans.find((p) => p.tier === tier && p.billingInterval === interval)
    return plan?.priceAmount ?? 0
  }

  const statusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-800">
            <CheckCircle2 className="h-3 w-3" /> Completed
          </span>
        )
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-800">
            <XCircle className="h-3 w-3" /> Failed
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800">
            <Clock className="h-3 w-3" /> Pending
          </span>
        )
    }
  }

  // Can upgrade? basic → pro, pro → enterprise (contact), trial/expired → any
  const canSelectTier = (tier: string) => {
    if (!subTier || isTrial || isExpired) return true
    if (subTier === 'basic' && tier === 'pro') return true
    return false
  }

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <Header title="Billing" subtitle="Manage your subscription and credits" />

      <div className="p-6 space-y-6">
        <Link
          href="/dashboard/settings"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Settings
        </Link>

        {/* Section 1: Subscription Status Banner */}
        {!loading && agencyData && (
          <div
            className={`rounded-lg p-4 flex items-center justify-between ${
              isExpired
                ? 'bg-red-50 border border-red-200'
                : isTrial
                  ? 'bg-blue-50 border border-blue-200'
                  : subTier === 'enterprise'
                    ? 'bg-purple-50 border border-purple-200'
                    : isActive
                      ? 'bg-green-50 border border-green-200'
                      : 'bg-muted border'
            }`}
          >
            <div className="flex items-center gap-3">
              <Crown className={`h-5 w-5 ${
                isExpired ? 'text-red-600' : isTrial ? 'text-blue-600' : subTier === 'enterprise' ? 'text-purple-600' : 'text-green-600'
              }`} />
              <div>
                <p className="font-medium">
                  {isExpired
                    ? 'Your subscription has expired'
                    : isTrial
                      ? `Free trial — ${daysUntil(agencyData.trialEndDate)} day${daysUntil(agencyData.trialEndDate) !== 1 ? 's' : ''} remaining`
                      : isActive && subTier
                        ? `${TIER_LABELS[subTier]} Plan`
                        : 'No active subscription'}
                </p>
                {isActive && agencyData.subscriptionEndDate && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Renews {formatDate(agencyData.subscriptionEndDate)}
                    {agencyData.billingInterval ? ` (${agencyData.billingInterval})` : ''}
                  </p>
                )}
              </div>
            </div>
            {isAgencyAdmin && (
              <div>
                {(isTrial || isExpired) && (
                  <Button size="sm" onClick={() => setShowPlans(true)}>
                    Upgrade Now
                  </Button>
                )}
                {isActive && subTier !== 'enterprise' && !showPlans && (
                  <Button variant="outline" size="sm" onClick={() => setShowPlans(true)}>
                    Change Plan
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Section 2: Plan Selection */}
        {showPlans && isAgencyAdmin && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Choose a Plan</h2>
              {/* Monthly / Yearly Toggle */}
              <div className="flex items-center gap-1 rounded-lg border p-1 bg-muted/50">
                <button
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                    selectedInterval === 'monthly' ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground'
                  }`}
                  onClick={() => setSelectedInterval('monthly')}
                >
                  Monthly
                </button>
                <button
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                    selectedInterval === 'yearly' ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground'
                  }`}
                  onClick={() => setSelectedInterval('yearly')}
                >
                  Yearly
                  {getPrice('basic', 'yearly') > 0 && (
                    <span className="ml-1 text-xs text-green-600 font-medium">Save ~17%</span>
                  )}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Basic Plan */}
              <Card className={`relative ${subTier === 'basic' && isActive ? 'ring-2 ring-primary' : ''}`}>
                {subTier === 'basic' && isActive && (
                  <div className="absolute -top-3 left-4">
                    <span className="bg-primary text-primary-foreground text-xs font-medium px-2 py-0.5 rounded-full">
                      Current Plan
                    </span>
                  </div>
                )}
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Basic</CardTitle>
                  <div className="mt-2">
                    <span className="text-3xl font-bold">
                      {formatSmallestUnit(getPrice('basic', selectedInterval), billingCurrency)}
                    </span>
                    <span className="text-muted-foreground text-sm">
                      /{selectedInterval === 'yearly' ? 'yr' : 'mo'}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {BASIC_FEATURES.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  {canSelectTier('basic') ? (
                    <Button
                      className="w-full"
                      variant={subTier === 'basic' ? 'outline' : 'default'}
                      disabled={subscribing !== null || (subTier === 'basic' && isActive)}
                      onClick={() => handleSubscribe('basic')}
                    >
                      {subscribing === 'basic' ? 'Processing...' : subTier === 'basic' && isActive ? 'Current Plan' : 'Select Basic'}
                    </Button>
                  ) : (
                    <Button className="w-full" variant="outline" disabled>
                      {subTier === 'basic' && isActive ? 'Current Plan' : 'N/A'}
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Pro Plan */}
              <Card className={`relative ${subTier === 'pro' && isActive ? 'ring-2 ring-primary' : ''}`}>
                {subTier === 'pro' && isActive && (
                  <div className="absolute -top-3 left-4">
                    <span className="bg-primary text-primary-foreground text-xs font-medium px-2 py-0.5 rounded-full">
                      Current Plan
                    </span>
                  </div>
                )}
                {!subTier && (
                  <div className="absolute -top-3 right-4">
                    <span className="bg-blue-600 text-white text-xs font-medium px-2 py-0.5 rounded-full">
                      Recommended
                    </span>
                  </div>
                )}
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Pro</CardTitle>
                  <div className="mt-2">
                    <span className="text-3xl font-bold">
                      {formatSmallestUnit(getPrice('pro', selectedInterval), billingCurrency)}
                    </span>
                    <span className="text-muted-foreground text-sm">
                      /{selectedInterval === 'yearly' ? 'yr' : 'mo'}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {PRO_FEATURES.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  {canSelectTier('pro') ? (
                    <Button
                      className="w-full"
                      variant={subTier === 'pro' ? 'outline' : 'default'}
                      disabled={subscribing !== null || (subTier === 'pro' && isActive)}
                      onClick={() => handleSubscribe('pro')}
                    >
                      {subscribing === 'pro'
                        ? 'Processing...'
                        : subTier === 'pro' && isActive
                          ? 'Current Plan'
                          : subTier === 'basic'
                            ? 'Upgrade to Pro'
                            : 'Select Pro'}
                    </Button>
                  ) : (
                    <Button className="w-full" variant="outline" disabled>
                      {subTier === 'pro' && isActive ? 'Current Plan' : 'N/A'}
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Enterprise */}
              <Card className={`relative ${subTier === 'enterprise' ? 'ring-2 ring-purple-500' : ''}`}>
                {subTier === 'enterprise' && (
                  <div className="absolute -top-3 left-4">
                    <span className="bg-purple-600 text-white text-xs font-medium px-2 py-0.5 rounded-full">
                      Current Plan
                    </span>
                  </div>
                )}
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Enterprise</CardTitle>
                  <div className="mt-2">
                    <span className="text-3xl font-bold">Custom</span>
                  </div>
                  <CardDescription>Tailored pricing for your needs</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                      <span>Everything in Pro</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                      <span>Custom integrations</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                      <span>Dedicated account manager</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                      <span>SLA & priority support</span>
                    </li>
                  </ul>
                  <Button className="w-full" variant="outline" asChild>
                    <a href="mailto:hello@truleado.com">
                      <Mail className="h-4 w-4 mr-2" />
                      Contact Us
                    </a>
                  </Button>
                </CardContent>
              </Card>
            </div>

            {isActive && (
              <div className="text-center">
                <button
                  className="text-sm text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPlans(false)}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}

        {/* Section 3: Credit Balance */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              <CardTitle>Credit Balance</CardTitle>
            </div>
            <CardDescription>
              Credits are consumed when fetching analytics, discovering and unlocking influencer profiles.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-12 w-32 bg-muted rounded animate-pulse" />
            ) : (
              <div>
                <p className="text-3xl font-bold">{agencyData?.creditBalance ?? 0}</p>
                <p className="text-sm text-muted-foreground mt-1">Credits</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section 4: Purchase Credits */}
        {isAgencyAdmin && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Purchase Credits</h2>
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Coins className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Credits</CardTitle>
                    <CardDescription>
                      {formatSmallestUnit(unitPriceSmallest, billingCurrency)} per credit
                      {billingCurrency !== 'USD' && (
                        <span className="text-xs text-muted-foreground ml-1">
                          (${creditPriceUsd.toFixed(4)} USD)
                        </span>
                      )}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Used for fetching Instagram and YouTube analytics, and discovering, unlocking, or exporting influencer profiles.
                </p>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">Qty:</span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setCreditQty(Math.max(1, creditQty - 50))}
                      disabled={creditQty <= 1}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <input
                      type="number"
                      min={1}
                      max={100000}
                      value={creditQty}
                      onChange={(e) => setCreditQty(Math.max(1, Math.min(100000, parseInt(e.target.value) || 1)))}
                      className="w-20 text-center rounded-md border border-input bg-background px-2 py-1 text-sm"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setCreditQty(Math.min(100000, creditQty + 50))}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-sm font-medium">
                    Total: {formatSmallestUnit(creditQty * unitPriceSmallest, billingCurrency)}
                  </span>
                  <Button onClick={handleCreditPurchase} disabled={purchasing} size="sm">
                    {purchasing ? 'Processing...' : 'Buy Credits'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Section 5: Payment History */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Payment History</h2>
          {loading ? (
            <Card className="animate-pulse">
              <CardContent className="p-6">
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-10 bg-muted rounded" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : purchases.length === 0 && subPayments.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-8">
                <CreditCard className="h-10 w-10 text-muted-foreground mb-3" />
                <h3 className="font-medium">No payments yet</h3>
                <p className="text-sm text-muted-foreground text-center mt-1">
                  {isAgencyAdmin
                    ? 'Subscribe to a plan or purchase credits to get started.'
                    : 'Ask your agency admin to manage billing.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left font-medium p-3">Date</th>
                        <th className="text-left font-medium p-3">Type</th>
                        <th className="text-left font-medium p-3">Details</th>
                        <th className="text-right font-medium p-3">Amount</th>
                        <th className="text-center font-medium p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Merge and sort by date */}
                      {[
                        ...subPayments.map((s) => ({
                          id: s.id,
                          date: s.createdAt,
                          type: 'subscription' as const,
                          details: `${TIER_LABELS[s.planTier] || s.planTier} (${s.billingInterval})`,
                          amount: s.amount,
                          currency: s.currency,
                          status: s.status,
                        })),
                        ...purchases.map((p) => ({
                          id: p.id,
                          date: p.createdAt,
                          type: 'credit' as const,
                          details: `${p.creditQuantity.toLocaleString()} Credits`,
                          amount: p.amountPaise,
                          currency: p.currency || 'INR',
                          status: p.status,
                        })),
                      ]
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .map((row) => (
                          <tr key={row.id} className="border-b last:border-0">
                            <td className="p-3 text-muted-foreground">{formatDate(row.date)}</td>
                            <td className="p-3">
                              <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${
                                row.type === 'subscription'
                                  ? 'bg-violet-100 text-violet-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}>
                                {row.type === 'subscription' ? (
                                  <Crown className="h-3 w-3" />
                                ) : (
                                  <Coins className="h-3 w-3" />
                                )}
                                {row.type === 'subscription' ? 'Subscription' : 'Credits'}
                              </span>
                            </td>
                            <td className="p-3 text-sm">{row.details}</td>
                            <td className="p-3 text-right">
                              {formatSmallestUnit(row.amount, row.currency)}
                            </td>
                            <td className="p-3 text-center">{statusBadge(row.status)}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  )
}

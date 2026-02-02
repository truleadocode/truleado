"use client"

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Script from 'next/script'
import {
  ArrowLeft,
  CreditCard,
  Coins,
  Sparkles,
  CheckCircle2,
  XCircle,
  Clock,
  Minus,
  Plus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Header } from '@/components/layout/header'
import { useAuth } from '@/contexts/auth-context'
import { useToast } from '@/hooks/use-toast'
import { graphqlRequest, queries } from '@/lib/graphql/client'
import { getIdToken } from '@/lib/firebase/client'

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
  purchaseType: string
  tokenQuantity: number
  amountPaise: number
  currency: string
  razorpayOrderId: string | null
  status: string
  createdAt: string
  completedAt: string | null
}

interface AgencyBalance {
  tokenBalance: number
  premiumTokenBalance: number
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatAmountINR(paise: number) {
  return `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
}

export default function BillingSettingsPage() {
  const { user, currentAgency, getToken } = useAuth()
  const { toast } = useToast()

  const [balance, setBalance] = useState<AgencyBalance | null>(null)
  const [purchases, setPurchases] = useState<TokenPurchase[]>([])
  const [loading, setLoading] = useState(true)

  // Purchase form state
  const [basicQty, setBasicQty] = useState(100)
  const [premiumQty, setPremiumQty] = useState(10)
  const [purchasing, setPurchasing] = useState<string | null>(null) // 'basic' | 'premium' | null

  const isAgencyAdmin = currentAgency?.role?.toLowerCase() === 'agency_admin'

  const fetchData = useCallback(async () => {
    if (!currentAgency?.id) return
    setLoading(true)
    try {
      const [balanceData, purchaseData] = await Promise.all([
        graphqlRequest<{ agency: AgencyBalance }>(queries.agencyTokenBalance, {
          id: currentAgency.id,
        }),
        graphqlRequest<{ tokenPurchases: TokenPurchase[] }>(queries.tokenPurchases, {
          agencyId: currentAgency.id,
        }),
      ])
      setBalance(balanceData.agency)
      setPurchases(purchaseData.tokenPurchases)
    } catch (err) {
      console.error('Failed to fetch billing data:', err)
      toast({ title: 'Failed to load billing data', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [currentAgency?.id, toast])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handlePurchase = async (purchaseType: 'basic' | 'premium') => {
    if (!currentAgency?.id || purchasing) return

    const quantity = purchaseType === 'basic' ? basicQty : premiumQty
    if (quantity < 1) {
      toast({ title: 'Enter a valid quantity', variant: 'destructive' })
      return
    }

    setPurchasing(purchaseType)

    try {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')

      // 1. Create Razorpay order on the server
      const orderRes = await fetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          purchaseType,
          quantity,
          agencyId: currentAgency.id,
        }),
      })

      if (!orderRes.ok) {
        const errData = await orderRes.json()
        throw new Error(errData.error || 'Failed to create order')
      }

      const { orderId, amount, currency, purchaseId, keyId } = await orderRes.json()

      // 2. Open Razorpay checkout
      if (!window.Razorpay) {
        throw new Error('Razorpay SDK not loaded. Please refresh the page and try again.')
      }

      const rzp = new window.Razorpay({
        key: keyId,
        amount,
        currency,
        name: 'Truleado',
        description: `${quantity} ${purchaseType === 'basic' ? 'Basic Scraping' : 'Premium'} Token${quantity > 1 ? 's' : ''}`,
        order_id: orderId,
        handler: async (response: RazorpayResponse) => {
          // 3. Verify payment on the server
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
              description: `${result.tokensAdded} ${purchaseType} token${result.tokensAdded > 1 ? 's' : ''} added to your account`,
            })
            fetchData()
          } catch (err) {
            toast({
              title: 'Payment verification failed',
              description: err instanceof Error ? err.message : 'Please contact support',
              variant: 'destructive',
            })
          } finally {
            setPurchasing(null)
          }
        },
        prefill: {
          email: user?.email || undefined,
          name: user?.name || undefined,
        },
        theme: { color: '#7c3aed' },
        modal: {
          ondismiss: () => {
            setPurchasing(null)
          },
        },
      })

      rzp.open()
    } catch (err) {
      toast({
        title: 'Purchase failed',
        description: err instanceof Error ? err.message : 'An error occurred',
        variant: 'destructive',
      })
      setPurchasing(null)
    }
  }

  const statusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-800">
            <CheckCircle2 className="h-3 w-3" />
            Completed
          </span>
        )
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-800">
            <XCircle className="h-3 w-3" />
            Failed
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800">
            <Clock className="h-3 w-3" />
            Pending
          </span>
        )
    }
  }

  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="lazyOnload"
      />
      <Header title="Billing" subtitle="Manage tokens and purchase history" />

      <div className="p-6 space-y-6">
        <Link
          href="/dashboard/settings"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Settings
        </Link>

        {/* Current Balance */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              <CardTitle>Token Balance</CardTitle>
            </div>
            <CardDescription>
              Tokens are consumed when fetching social media analytics for creators.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex gap-8">
                <div className="h-12 w-32 bg-muted rounded animate-pulse" />
                <div className="h-12 w-32 bg-muted rounded animate-pulse" />
              </div>
            ) : (
              <div className="flex gap-8">
                <div>
                  <p className="text-3xl font-bold">{balance?.tokenBalance ?? 0}</p>
                  <p className="text-sm text-muted-foreground mt-1">Basic Scraping Tokens</p>
                </div>
                <div className="border-l pl-8">
                  <p className="text-3xl font-bold">{balance?.premiumTokenBalance ?? 0}</p>
                  <p className="text-sm text-muted-foreground mt-1">Premium Tokens</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Purchase Tokens */}
        {isAgencyAdmin && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Purchase Tokens</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Basic Scraping Tokens */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <Coins className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Basic Scraping Tokens</CardTitle>
                      <CardDescription>₹0.50 per token</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Used for fetching Instagram and YouTube profile data, posts, and engagement metrics.
                  </p>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">Qty:</span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setBasicQty(Math.max(1, basicQty - 50))}
                        disabled={basicQty <= 1}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <input
                        type="number"
                        min={1}
                        max={100000}
                        value={basicQty}
                        onChange={(e) => setBasicQty(Math.max(1, Math.min(100000, parseInt(e.target.value) || 1)))}
                        className="w-20 text-center rounded-md border border-input bg-background px-2 py-1 text-sm"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setBasicQty(Math.min(100000, basicQty + 50))}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-sm font-medium">
                      Total: {formatAmountINR(basicQty * 50)}
                    </span>
                    <Button
                      onClick={() => handlePurchase('basic')}
                      disabled={purchasing !== null}
                      size="sm"
                    >
                      {purchasing === 'basic' ? 'Processing...' : 'Buy Tokens'}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Premium Tokens */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                      <Sparkles className="h-5 w-5 text-purple-500" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Premium Tokens</CardTitle>
                      <CardDescription>₹75.00 per token</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Used for enriched influencer profiles with audience demographics and advanced analytics.
                  </p>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">Qty:</span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setPremiumQty(Math.max(1, premiumQty - 5))}
                        disabled={premiumQty <= 1}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <input
                        type="number"
                        min={1}
                        max={10000}
                        value={premiumQty}
                        onChange={(e) => setPremiumQty(Math.max(1, Math.min(10000, parseInt(e.target.value) || 1)))}
                        className="w-20 text-center rounded-md border border-input bg-background px-2 py-1 text-sm"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setPremiumQty(Math.min(10000, premiumQty + 5))}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-sm font-medium">
                      Total: {formatAmountINR(premiumQty * 7500)}
                    </span>
                    <Button
                      onClick={() => handlePurchase('premium')}
                      disabled={purchasing !== null}
                      size="sm"
                    >
                      {purchasing === 'premium' ? 'Processing...' : 'Buy Tokens'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Purchase History */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Purchase History</h2>
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
          ) : purchases.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-8">
                <CreditCard className="h-10 w-10 text-muted-foreground mb-3" />
                <h3 className="font-medium">No purchases yet</h3>
                <p className="text-sm text-muted-foreground text-center mt-1">
                  {isAgencyAdmin
                    ? 'Purchase tokens above to start fetching social analytics.'
                    : 'Ask your agency admin to purchase tokens.'}
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
                        <th className="text-right font-medium p-3">Quantity</th>
                        <th className="text-right font-medium p-3">Amount</th>
                        <th className="text-center font-medium p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {purchases.map((p) => (
                        <tr key={p.id} className="border-b last:border-0">
                          <td className="p-3 text-muted-foreground">
                            {formatDate(p.createdAt)}
                          </td>
                          <td className="p-3">
                            <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${
                              p.purchaseType === 'premium'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {p.purchaseType === 'premium' ? (
                                <Sparkles className="h-3 w-3" />
                              ) : (
                                <Coins className="h-3 w-3" />
                              )}
                              {p.purchaseType === 'premium' ? 'Premium' : 'Basic'}
                            </span>
                          </td>
                          <td className="p-3 text-right font-medium">
                            {p.tokenQuantity.toLocaleString()}
                          </td>
                          <td className="p-3 text-right">
                            {formatAmountINR(p.amountPaise)}
                          </td>
                          <td className="p-3 text-center">
                            {statusBadge(p.status)}
                          </td>
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

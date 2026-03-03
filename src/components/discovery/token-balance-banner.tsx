"use client"

import { useEffect, useState } from "react"
import { Coins } from "lucide-react"
import { graphqlRequest, queries } from "@/lib/graphql/client"
import { cn } from "@/lib/utils"

interface TokenBalanceData {
  agency: {
    id: string
    tokenBalance: number
    premiumTokenBalance: number
  }
}

interface TokenBalanceBannerProps {
  agencyId: string
}

export function TokenBalanceBanner({ agencyId }: TokenBalanceBannerProps) {
  const [balance, setBalance] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!agencyId) return

    let cancelled = false

    async function fetchBalance() {
      try {
        const data = await graphqlRequest<TokenBalanceData>(
          queries.agencyTokenBalance,
          { id: agencyId }
        )
        if (!cancelled) {
          setBalance(data.agency.premiumTokenBalance)
        }
      } catch (err) {
        console.error("Failed to fetch token balance:", err)
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    fetchBalance()

    return () => {
      cancelled = true
    }
  }, [agencyId])

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm animate-pulse">
        <Coins className="h-4 w-4 text-muted-foreground" />
        <span className="text-muted-foreground">Loading...</span>
      </div>
    )
  }

  if (balance === null) {
    return null
  }

  const isLow = balance < 10

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium",
        isLow
          ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-400"
          : "border-border bg-background text-foreground"
      )}
    >
      <Coins
        className={cn(
          "h-4 w-4",
          isLow ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
        )}
      />
      <span>
        Premium Tokens: {balance.toLocaleString()}
      </span>
      {isLow && (
        <span className="text-xs font-normal text-amber-600 dark:text-amber-400">
          (Low balance)
        </span>
      )}
    </div>
  )
}

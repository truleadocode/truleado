import { useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { formatCurrency } from '@/lib/currency'

/**
 * Hook that provides currency formatting using the current agency's default currency.
 *
 * Usage:
 *   const { currencyCode, format } = useCurrency()
 *   format(1500)               // Uses agency default, e.g. "₹1,500"
 *   format(1500, 'USD')        // Override: "$1,500"
 */
export function useCurrency() {
  const { currentAgency } = useAuth()
  const currencyCode = currentAgency?.currencyCode || 'USD'

  const format = useCallback(
    (amount: number | null | undefined, overrideCurrency?: string, options?: { maximumFractionDigits?: number }) =>
      formatCurrency(amount, overrideCurrency || currencyCode, options),
    [currencyCode]
  )

  return { currencyCode, format }
}

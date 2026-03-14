'use client'

import { useEffect, useState } from 'react'
import { ExchangeRates, fetchUSDExchangeRates, convertToUSD } from '@/lib/currency'

export function useExchangeRates() {
  const [rates, setRates] = useState<ExchangeRates | null>(null)

  useEffect(() => {
    fetchUSDExchangeRates().then(setRates).catch(console.error)
  }, [])

  return {
    rates,
    toUSD: (amount: number, currency: string | null): number => {
      if (!rates || !currency) return amount
      return convertToUSD(amount, currency, rates)
    },
  }
}

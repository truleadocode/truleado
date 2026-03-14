/**
 * Centralized currency formatting utilities.
 *
 * All currency display across the app should use these functions
 * instead of inline Intl.NumberFormat calls. The locale is auto-detected
 * from the ISO 4217 currency code.
 */

const CURRENCY_LOCALE_MAP: Record<string, string> = {
  INR: 'en-IN',
  USD: 'en-US',
  EUR: 'de-DE',
  GBP: 'en-GB',
  AED: 'ar-AE',
  SGD: 'en-SG',
  JPY: 'ja-JP',
  CAD: 'en-CA',
  AUD: 'en-AU',
}

/**
 * Format a monetary amount with the correct currency symbol and locale.
 *
 * @param amount - The amount to format (null/undefined returns '—')
 * @param currencyCode - ISO 4217 currency code (default: 'USD')
 * @param options - Override maximumFractionDigits (default: 0)
 */
export function formatCurrency(
  amount: number | null | undefined,
  currencyCode: string = 'USD',
  options?: { maximumFractionDigits?: number }
): string {
  if (amount == null) return '—'
  const code = currencyCode.toUpperCase()
  const locale = CURRENCY_LOCALE_MAP[code] || 'en-US'
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: code,
    maximumFractionDigits: options?.maximumFractionDigits ?? 0,
  }).format(amount)
}

/**
 * Format an amount stored in smallest currency unit (paise, cents, etc.).
 *
 * @param smallestUnit - Amount in paise/cents
 * @param currencyCode - ISO 4217 currency code
 */
export function formatSmallestUnit(
  smallestUnit: number,
  currencyCode: string = 'USD'
): string {
  const code = currencyCode.toUpperCase()
  // JPY has no subunit; all others divide by 100
  const divisor = code === 'JPY' ? 1 : 100
  return formatCurrency(smallestUnit / divisor, code, { maximumFractionDigits: 2 })
}

/**
 * Get the locale string for a given currency code.
 */
export function getLocaleForCurrency(currencyCode: string): string {
  return CURRENCY_LOCALE_MAP[currencyCode.toUpperCase()] || 'en-US'
}

// ---------------------------------------------------------------------------
// Exchange rate utilities — convert any currency to USD using live rates
// ---------------------------------------------------------------------------

export type ExchangeRates = Record<string, number> // 1 USD = N units of that currency

let _cachedRates: ExchangeRates | null = null
let _cacheTs = 0
const RATE_TTL = 60 * 60 * 1000 // 1 hour

/**
 * Fetch live USD exchange rates from Frankfurter (free, no API key required).
 * Results are cached in module scope for 1 hour to avoid redundant requests.
 */
export async function fetchUSDExchangeRates(): Promise<ExchangeRates> {
  if (_cachedRates && Date.now() - _cacheTs < RATE_TTL) return _cachedRates
  const res = await fetch('https://api.frankfurter.app/latest?from=USD')
  const data = await res.json()
  _cachedRates = { USD: 1, ...data.rates } as ExchangeRates
  _cacheTs = Date.now()
  return _cachedRates
}

/**
 * Convert an amount from any currency to USD.
 * Falls back to the original amount if the rate is unavailable.
 */
export function convertToUSD(amount: number, fromCurrency: string, rates: ExchangeRates): number {
  const code = fromCurrency.toUpperCase()
  if (code === 'USD') return amount
  const rate = rates[code]
  return rate ? amount / rate : amount
}

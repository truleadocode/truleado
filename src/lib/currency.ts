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

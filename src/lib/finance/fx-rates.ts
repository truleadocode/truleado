/**
 * FX Rate Service
 *
 * Fetches exchange rates from exchangerate-api.com.
 * Caches rates in memory for 24 hours to minimize API calls.
 * Falls back to 1:1 rate on failure.
 */

interface CachedRates {
  rates: Record<string, number>;
  fetchedAt: number;
}

// In-memory cache keyed by base currency
const rateCache = new Map<string, CachedRates>();

// Cache duration: 24 hours
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000;

/**
 * Get the FX rate between two currencies.
 * Returns the rate to multiply `fromCurrency` amount by to get `toCurrency` amount.
 *
 * If both currencies are the same, returns 1.
 * On failure, returns 1 and logs a warning.
 */
export async function getFxRate(
  fromCurrency: string,
  toCurrency: string
): Promise<number> {
  const from = fromCurrency.toUpperCase();
  const to = toCurrency.toUpperCase();

  if (from === to) return 1;

  try {
    const rates = await fetchRates(from);
    const rate = rates[to];

    if (rate == null) {
      console.warn(`[FX] No rate found for ${from} → ${to}, falling back to 1:1`);
      return 1;
    }

    return rate;
  } catch (err) {
    console.error(`[FX] Failed to fetch rate for ${from} → ${to}:`, err);
    return 1;
  }
}

/**
 * Fetch all rates for a base currency (with caching).
 */
async function fetchRates(baseCurrency: string): Promise<Record<string, number>> {
  const cached = rateCache.get(baseCurrency);
  if (cached && Date.now() - cached.fetchedAt < CACHE_DURATION_MS) {
    return cached.rates;
  }

  const apiKey = process.env.FX_RATE_API_KEY;
  if (!apiKey) {
    console.warn('[FX] FX_RATE_API_KEY not configured, using 1:1 rates');
    return {};
  }

  const url = `https://v6.exchangerate-api.com/v6/${apiKey}/latest/${baseCurrency}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(10000) });

  if (!response.ok) {
    throw new Error(`FX API returned ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();

  if (data.result !== 'success') {
    throw new Error(`FX API error: ${data['error-type'] || 'unknown'}`);
  }

  const rates = data.conversion_rates as Record<string, number>;

  // Cache the rates
  rateCache.set(baseCurrency, {
    rates,
    fetchedAt: Date.now(),
  });

  return rates;
}

/**
 * Clear the FX rate cache (useful for testing).
 */
export function clearFxCache(): void {
  rateCache.clear();
}

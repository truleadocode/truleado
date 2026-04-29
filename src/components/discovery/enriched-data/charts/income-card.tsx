'use client';

import { TrendingUp } from 'lucide-react';
import { formatCount } from '../../primitives/tokens';

interface IncomeCardProps {
  /**
   * The raw IC `income` block. Shape varies — typically has fields like
   * `lower`, `upper`, `currency` or similar. We render whatever numeric
   * fields exist, dollar-formatted when `currency` is unset.
   */
  income: Record<string, unknown> | null;
}

/**
 * YouTube-only block. Renders the IC `income` object as a stat row —
 * lower / upper estimate and a small caption. IC's own UI shows a
 * timeline; we don't have time-series income data without a separate
 * call, so this is the static point estimate.
 */
export function IncomeCard({ income }: IncomeCardProps) {
  if (!income) return null;
  const lower = numericField(income, ['lower', 'min', 'low']);
  const upper = numericField(income, ['upper', 'max', 'high']);
  const currency = stringField(income, ['currency']) ?? 'USD';
  if (lower === null && upper === null) return null;
  const symbol = currencySymbol(currency);

  return (
    <div className="rounded-lg border border-tru-border-soft bg-emerald-50/50 p-4">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-emerald-700" />
        <h3 className="text-sm font-semibold text-tru-slate-900">
          Estimated creator income
        </h3>
      </div>
      <p className="mt-1 text-xs text-tru-slate-500">
        Approximated by our enrichment provider from public engagement signals.
      </p>
      <div className="mt-3 flex items-baseline gap-3">
        {lower !== null ? (
          <Stat label="Lower" value={`${symbol}${formatCount(lower)}`} />
        ) : null}
        {upper !== null ? (
          <Stat label="Upper" value={`${symbol}${formatCount(upper)}`} />
        ) : null}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-tru-slate-500">
        {label}
      </div>
      <div className="mt-0.5 text-xl font-bold tabular-nums text-tru-slate-900">{value}</div>
    </div>
  );
}

function numericField(d: Record<string, unknown>, keys: string[]): number | null {
  for (const k of keys) {
    const v = d[k];
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string') {
      const n = Number(v);
      if (Number.isFinite(n)) return n;
    }
  }
  return null;
}

function stringField(d: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = d[k];
    if (typeof v === 'string' && v.length > 0) return v;
  }
  return null;
}

function currencySymbol(currency: string): string {
  switch (currency.toUpperCase()) {
    case 'USD':
      return '$';
    case 'EUR':
      return '€';
    case 'GBP':
      return '£';
    case 'INR':
      return '₹';
    default:
      return `${currency} `;
  }
}

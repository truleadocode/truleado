'use client';

import { AlertCircle, Zap } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { graphqlRequest, queries } from '@/lib/graphql/client';
import { formatCount } from '../primitives/tokens';

interface AgencyBalance {
  id: string;
  creditBalance: number | null;
  subscriptionStatus: string | null;
  subscriptionTier: string | null;
  trialEndDate: string | null;
  subscriptionEndDate: string | null;
}

const LOW_BALANCE_THRESHOLD = 20;

/**
 * Compact credit balance indicator that sits above the filter card.
 * Colours:
 *   - Comfortable: blue / default
 *   - Low (≤ 20): amber
 *   - Zero: red with a "Top up" hint
 */
export function TokenBalanceBanner({ agencyId }: { agencyId: string }) {
  const { data } = useQuery({
    queryKey: ['agencyTokenBalance', agencyId],
    staleTime: 30_000,
    queryFn: async () => {
      const result = await graphqlRequest<{ agency: AgencyBalance | null }>(
        queries.agencyTokenBalance,
        { id: agencyId }
      );
      return result.agency;
    },
  });

  const balance = data?.creditBalance ?? null;

  if (balance === null) {
    return null;
  }

  const low = balance <= LOW_BALANCE_THRESHOLD;
  const zero = balance <= 0;

  return (
    <div
      className={`mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[12px] ${
        zero
          ? 'bg-red-50 text-red-700'
          : low
            ? 'bg-amber-50 text-amber-700'
            : 'bg-tru-slate-100 text-tru-slate-700'
      }`}
    >
      {zero ? <AlertCircle className="h-3 w-3" /> : <Zap className="h-3 w-3" />}
      <span>
        <span className="font-bold tabular-nums">{formatCount(balance)}</span>{' '}
        credit{balance === 1 ? '' : 's'} available
      </span>
      {low && !zero ? <span className="text-[11px]">— consider topping up</span> : null}
      {zero ? <span className="text-[11px] font-semibold">— top up to enrich</span> : null}
    </div>
  );
}

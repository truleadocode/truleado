'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useSimilarCreators, type DiscoveryCreator } from '../../hooks';
import { avatarColorFor, formatCount, initialsFor } from '../../primitives/tokens';

interface SimilarAccordionProps {
  agencyId: string;
  creator: DiscoveryCreator;
}

/**
 * Lookalike creators. Free query, but lazy: only fires when the accordion
 * is opened by the user. Most users won't expand this on every open, so
 * we avoid the React Query mount cost.
 */
export function SimilarAccordion({ agencyId, creator }: SimilarAccordionProps) {
  const [open, setOpen] = useState(false);
  const query = useSimilarCreators({
    agencyId,
    platform: creator.platform,
    referenceKey: 'username',
    referenceValue: creator.username,
    enabled: open,
  });

  return (
    <details
      className="group border-b border-tru-slate-100 px-6 py-3 last:border-b-0"
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
    >
      <summary className="flex cursor-pointer items-baseline justify-between gap-2 list-none [&::-webkit-details-marker]:hidden">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.08em] text-tru-slate-500 group-hover:text-tru-blue-600">
          Similar creators
        </h3>
        <span className="text-[11px] text-tru-slate-500">Free lookup</span>
      </summary>
      <div className="pt-3">
        {!open ? null : query.isLoading ? (
          <div className="flex items-center gap-2 text-xs text-tru-slate-500">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Finding similar creators…
          </div>
        ) : query.isError ? (
          <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            Lookalike search failed: {String(query.error)}
          </div>
        ) : (
          <SimilarList accounts={query.data?.accounts ?? []} />
        )}
      </div>
    </details>
  );
}

function SimilarList({
  accounts,
}: {
  accounts: Array<{
    providerUserId: string;
    username: string;
    fullName: string | null;
    followers: number | null;
    pictureUrl: string | null;
  }>;
}) {
  if (accounts.length === 0) {
    return (
      <div className="rounded-md border border-tru-border-soft p-4 text-center text-xs text-tru-slate-500">
        No similar creators surfaced.
      </div>
    );
  }
  return (
    <ul className="divide-y divide-tru-border-soft">
      {accounts.map((a) => (
        <li key={a.providerUserId} className="flex items-center gap-3 py-3">
          {a.pictureUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={a.pictureUrl}
              alt=""
              className="h-10 w-10 shrink-0 rounded-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
              style={{ background: avatarColorFor(a.providerUserId) }}
            >
              {initialsFor(a.fullName ?? a.username)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-tru-slate-900">
              {a.fullName ?? a.username}
            </div>
            <div className="truncate text-xs text-tru-slate-500">@{a.username}</div>
          </div>
          <div className="text-right text-xs tabular-nums text-tru-slate-700">
            {formatCount(a.followers)}
          </div>
        </li>
      ))}
    </ul>
  );
}

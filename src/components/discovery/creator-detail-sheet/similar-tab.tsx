'use client';

import { Loader2 } from 'lucide-react';
import { useSimilarCreators, type DiscoveryCreator } from '../hooks';
import { avatarColorFor, formatCount, initialsFor } from '../primitives/tokens';

interface SimilarTabProps {
  agencyId: string;
  creator: DiscoveryCreator;
}

export function SimilarTab({ agencyId, creator }: SimilarTabProps) {
  const query = useSimilarCreators({
    agencyId,
    platform: creator.platform,
    referenceKey: 'username',
    referenceValue: creator.username,
    enabled: true,
  });

  if (query.isLoading) {
    return (
      <div className="flex items-center gap-2 text-xs text-tru-slate-500">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Finding similar creators…
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        Lookalike search failed: {String(query.error)}
      </div>
    );
  }

  const accounts = query.data?.accounts ?? [];
  if (accounts.length === 0) {
    return (
      <div className="rounded-md border border-tru-border-soft p-6 text-center text-sm text-tru-slate-500">
        No similar creators surfaced.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 text-[11px] text-tru-slate-500">
        {query.data?.cached ? 'Cached.' : `Returned ${accounts.length} similar creators.`}{' '}
        Based on {creator.username}.
      </div>
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
    </div>
  );
}

'use client';

/**
 * Placeholder Results Card for Phase F3.
 *
 * Renders the raw discoverySearch response payload (JSON) plus high-level
 * counters, loading, and error states. Full table + creator rows arrive
 * in Phase F4.
 */

import { Loader2 } from 'lucide-react';
import type { CreatorSearchResult } from '../hooks';

interface ResultsCardProps {
  data: CreatorSearchResult | undefined;
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
  onLoadMore: () => void;
  hasMore: boolean;
  page: number;
}

export function ResultsCard({ data, isLoading, isError, error, onLoadMore, hasMore, page }: ResultsCardProps) {
  return (
    <section
      aria-label="Creator discovery results"
      className="mt-5 rounded-[14px] border border-tru-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)]"
    >
      <header className="flex items-center gap-4 border-b border-tru-border-soft px-4.5 py-3.5">
        <div className="flex items-center gap-2 rounded-full bg-tru-slate-100 px-3.5 py-1.5 text-[13px] text-tru-slate-600">
          {isLoading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Searching…
            </>
          ) : (
            <>
              <span className="font-bold tabular-nums text-tru-slate-900">
                {data?.total !== undefined ? formatCount(data.total) : '—'}
              </span>
              <span>creators found</span>
              {data?.cached ? (
                <span className="ml-2 rounded-full bg-tru-blue-50 px-2 py-0.5 text-[11px] font-semibold text-tru-blue-700">
                  cached
                </span>
              ) : null}
            </>
          )}
        </div>
        <div className="text-[13px] text-tru-slate-500">Sorted by relevance</div>
      </header>

      <div className="px-4.5 py-4">
        {isError ? (
          <ErrorState error={error} />
        ) : isLoading && !data ? (
          <LoadingPlaceholder />
        ) : data && data.accounts.length > 0 ? (
          <DebugAccountList data={data} page={page} />
        ) : (
          <EmptyState />
        )}
      </div>

      {data && hasMore ? (
        <div className="border-t border-tru-border-soft px-4.5 py-4 text-center">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-full border border-tru-slate-200 bg-white px-4 py-2 text-[13px] font-semibold text-tru-blue-600 transition-colors hover:border-tru-blue-600 hover:bg-tru-blue-50 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
              </>
            ) : (
              <>Load next page</>
            )}
          </button>
        </div>
      ) : null}
    </section>
  );
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return `${n}`;
}

function LoadingPlaceholder() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-16 animate-pulse rounded-md bg-tru-slate-50" />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="py-16 text-center text-sm text-tru-slate-500">
      No creators matched your filters. Try relaxing a range or changing the search platform.
    </div>
  );
}

function ErrorState({ error }: { error?: unknown }) {
  const message =
    error instanceof Error ? error.message : typeof error === 'string' ? error : 'Unknown error';
  return (
    <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
      <div className="font-semibold">Discovery failed</div>
      <div className="mt-1">{message}</div>
    </div>
  );
}

function DebugAccountList({ data, page }: { data: CreatorSearchResult; page: number }) {
  return (
    <div>
      <div className="mb-3 text-xs text-tru-slate-500">
        Page {page} • Returned {data.accounts.length} / {data.total} • Credits spent: {data.creditsSpent}
        {data.creditsSavedOnHit ? ` (saved ${data.creditsSavedOnHit})` : ''}
      </div>
      <ul className="divide-y divide-tru-border-soft">
        {data.accounts.map((a) => (
          <li key={a.providerUserId} className="flex items-center gap-3 py-3">
            {a.pictureUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={a.pictureUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-tru-slate-100 text-xs text-tru-slate-500">
                {a.username.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="truncate text-sm font-semibold text-tru-slate-900">
                {a.fullName ?? a.username}
              </div>
              <div className="truncate text-xs text-tru-slate-500">
                @{a.username} • {a.platform.toLowerCase()}
                {a.creatorProfileId ? ' • cached profile' : ''}
              </div>
            </div>
            <div className="text-right text-xs tabular-nums">
              <div className="font-semibold text-tru-slate-900">
                {a.followers !== null && a.followers !== undefined ? formatCount(a.followers) : '—'}
              </div>
              {a.engagementPercent !== null && a.engagementPercent !== undefined ? (
                <div className="text-tru-slate-500">{a.engagementPercent.toFixed(2)}% ER</div>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

'use client';

import { Loader2 } from 'lucide-react';
import type { CreatorSearchResult, DiscoveryCreator } from '../hooks';
import { ResultsHeader } from './results-header';
import { ResultsTable } from './results-table';

interface ResultsCardProps {
  data: CreatorSearchResult | undefined;
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
  onLoadMore: () => void;
  hasMore: boolean;
  page: number;
  selectedIds: Set<string>;
  onToggleSelect: (creator: DiscoveryCreator) => void;
  onToggleSelectAll: (ids: string[], select: boolean) => void;
  onRowClick: (creator: DiscoveryCreator) => void;
  onAddToRoster: () => void;
  onSaveView: () => void;
  onCopyLink: () => void;
  onReset: () => void;
  onForceRefresh: () => void;
  onBatchEnrich: () => void;
  onOpenHistory: () => void;
}

export function ResultsCard({
  data,
  isLoading,
  isError,
  error,
  onLoadMore,
  hasMore,
  page,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onRowClick,
  onAddToRoster,
  onSaveView,
  onCopyLink,
  onReset,
  onForceRefresh,
  onBatchEnrich,
  onOpenHistory,
}: ResultsCardProps) {
  return (
    <section
      aria-label="Creator discovery results"
      className="mt-5 rounded-[14px] border border-tru-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)]"
    >
      <ResultsHeader
        total={data?.total}
        isLoading={isLoading}
        cached={!!data?.cached}
        onAddToRoster={onAddToRoster}
        onSaveView={onSaveView}
        onCopyLink={onCopyLink}
        onReset={onReset}
        onForceRefresh={onForceRefresh}
        onBatchEnrich={onBatchEnrich}
        onOpenHistory={onOpenHistory}
      />

      {isError ? (
        <ErrorState error={error} />
      ) : isLoading && !data ? (
        <LoadingPlaceholder />
      ) : data && data.accounts.length > 0 ? (
        <>
          <ResultsTable
            accounts={data.accounts}
            total={data.total}
            selectedIds={selectedIds}
            onToggleSelect={onToggleSelect}
            onToggleSelectAll={onToggleSelectAll}
            onRowClick={onRowClick}
          />
          {hasMore ? (
            <div className="border-t border-tru-border-soft px-[18px] py-4 text-center">
              <button
                type="button"
                onClick={onLoadMore}
                disabled={isLoading}
                className="inline-flex items-center gap-2 rounded-full border border-tru-slate-200 bg-white px-5 py-2 text-[13px] font-semibold text-tru-blue-600 transition-colors hover:border-tru-blue-600 hover:bg-tru-blue-50 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
                  </>
                ) : (
                  `Load next page${page > 1 ? ` (now page ${page})` : ''}`
                )}
              </button>
            </div>
          ) : null}
        </>
      ) : (
        <EmptyState />
      )}
    </section>
  );
}

function LoadingPlaceholder() {
  return (
    <div className="space-y-0 divide-y divide-tru-border-soft px-0 py-0">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-[18px] py-4">
          <div className="h-10 w-10 animate-pulse rounded-full bg-tru-slate-100" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-48 animate-pulse rounded bg-tru-slate-100" />
            <div className="h-3 w-28 animate-pulse rounded bg-tru-slate-100" />
          </div>
          <div className="h-3 w-12 animate-pulse rounded bg-tru-slate-100" />
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="px-6 py-20 text-center">
      <div className="text-sm font-semibold text-tru-slate-700">No creators matched your filters</div>
      <div className="mt-1 text-xs text-tru-slate-500">
        Try relaxing a range, broadening the platform, or clearing some filters.
      </div>
    </div>
  );
}

function ErrorState({ error }: { error?: unknown }) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : 'Something went wrong while searching.';
  return (
    <div className="m-4 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
      <div className="font-semibold">Discovery failed</div>
      <div className="mt-1">{message}</div>
    </div>
  );
}

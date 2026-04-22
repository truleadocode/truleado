'use client';

import { useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { FilterCard } from './filter-card';
import { ResultsCard } from './results-card';
import { useDiscoverySearch } from './hooks';
import { useFilterState } from './state/url-state';
import { toIcDiscoveryArgs } from './state/filter-mapper';

export function CreatorDiscoveryPage() {
  const { currentAgency, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const { state, patch, reset } = useFilterState();

  // Map canonical filter state -> discoverySearch args.
  const { searchOn, filters } = useMemo(() => toIcDiscoveryArgs(state), [state]);

  const agencyId = currentAgency?.id;
  const search = useDiscoverySearch({
    agencyId: agencyId ?? '',
    platform: searchOn,
    filters,
    page: state.page,
    limit: state.limit,
    enabled: !!agencyId,
  });

  const handleSubmit = useCallback(() => {
    // Explicit submit resets to page 1.
    patch('page', 1);
    search.refetch();
  }, [patch, search]);

  const handleLoadMore = useCallback(() => {
    patch('page', state.page + 1);
  }, [patch, state.page]);

  const handleSave = useCallback(() => {
    toast({
      title: 'Save filters',
      description: 'Coming in Phase F5.',
    });
  }, [toast]);

  const handleOpenPresets = useCallback(() => {
    toast({
      title: 'Filter presets',
      description: 'Coming in Phase F5.',
    });
  }, [toast]);

  const data = search.data;
  const returnedSoFar = state.page * state.limit;
  const hasMore = !!data && returnedSoFar < data.total;

  if (authLoading) {
    return <div className="mx-auto max-w-4xl px-6 py-16 text-center text-sm text-tru-slate-500">Loading…</div>;
  }

  if (!currentAgency) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-16 text-center text-sm text-tru-slate-500">
        Join or create an agency to access Creator Discovery.
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-[1400px] px-7 pb-10 pt-5">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-tru-slate-900">Creator Discovery</h1>
          <p className="mt-1 text-sm text-tru-slate-500">
            Search 300M+ creators across Instagram, YouTube, TikTok, Twitter, and Twitch.
          </p>
        </div>
        <button
          type="button"
          onClick={reset}
          className="text-xs font-semibold text-tru-blue-600 hover:underline"
        >
          Reset filters
        </button>
      </div>

      <FilterCard
        state={state}
        patch={patch}
        onSubmit={handleSubmit}
        onSave={handleSave}
        onOpenPresets={handleOpenPresets}
      />

      <ResultsCard
        data={data}
        isLoading={search.isLoading || search.isFetching}
        isError={search.isError}
        error={search.error}
        onLoadMore={handleLoadMore}
        hasMore={hasMore}
        page={state.page}
      />
    </main>
  );
}

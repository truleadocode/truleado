'use client';

import { useCallback, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { FilterCard } from './filter-card';
import { ResultsCard } from './results-card';
import { useDiscoverySearch, useRefreshDiscoverySearch, type DiscoveryCreator } from './hooks';
import { useFilterState } from './state/url-state';
import { toIcDiscoveryArgs } from './state/filter-mapper';

export function CreatorDiscoveryPage() {
  const { currentAgency, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const { state, patch, reset } = useFilterState();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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

  const refresh = useRefreshDiscoverySearch();

  const handleSubmit = useCallback(() => {
    patch('page', 1);
    setSelectedIds(new Set());
    search.refetch();
  }, [patch, search]);

  const handleLoadMore = useCallback(() => {
    patch('page', state.page + 1);
  }, [patch, state.page]);

  const handleSave = useCallback(() => {
    toast({ title: 'Save filters', description: 'Coming in Phase F5.' });
  }, [toast]);

  const handleOpenPresets = useCallback(() => {
    toast({ title: 'Filter presets', description: 'Coming in Phase F5.' });
  }, [toast]);

  const handleToggleSelect = useCallback((creator: DiscoveryCreator) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(creator.providerUserId)) next.delete(creator.providerUserId);
      else next.add(creator.providerUserId);
      return next;
    });
  }, []);

  const handleToggleSelectAll = useCallback((ids: string[], select: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (select) ids.forEach((id) => next.add(id));
      else ids.forEach((id) => next.delete(id));
      return next;
    });
  }, []);

  const handleRowClick = useCallback(
    (_creator: DiscoveryCreator) => {
      toast({ title: 'Creator detail', description: 'Coming in Phase F6.' });
    },
    [toast]
  );

  const handleAddToRoster = useCallback(() => {
    toast({ title: 'Add to roster', description: 'Bulk import UI ships in Phase F7.' });
  }, [toast]);

  const handleSaveView = useCallback(() => {
    toast({ title: 'Save view', description: 'Coming in Phase F5.' });
  }, [toast]);

  const handleCopyLink = useCallback(() => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href).then(
        () => toast({ title: 'Link copied', description: 'Discovery URL is in your clipboard.' }),
        () => toast({ title: 'Copy failed', variant: 'destructive' })
      );
    }
  }, [toast]);

  const handleReset = useCallback(() => {
    reset();
    setSelectedIds(new Set());
  }, [reset]);

  const handleForceRefresh = useCallback(() => {
    if (!agencyId) return;
    refresh.mutate(
      { agencyId, platform: searchOn, filters, page: state.page, limit: state.limit },
      {
        onSuccess: () =>
          toast({ title: 'Refreshed', description: 'Results pulled fresh from Influencers.club.' }),
        onError: (err) =>
          toast({
            title: 'Refresh failed',
            description: err instanceof Error ? err.message : 'Unknown error',
            variant: 'destructive',
          }),
      }
    );
  }, [agencyId, searchOn, filters, state.page, state.limit, refresh, toast]);

  const data = search.data;
  const returnedSoFar = state.page * state.limit;
  const hasMore = !!data && returnedSoFar < data.total;

  if (authLoading) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-16 text-center text-sm text-tru-slate-500">
        Loading…
      </div>
    );
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
      <div className="mb-4">
        <h1 className="text-2xl font-semibold text-tru-slate-900">Creator Discovery</h1>
        <p className="mt-1 text-sm text-tru-slate-500">
          Search 300M+ creators across Instagram, YouTube, TikTok, Twitter, and Twitch.
        </p>
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
        isLoading={search.isLoading || search.isFetching || refresh.isPending}
        isError={search.isError}
        error={search.error}
        onLoadMore={handleLoadMore}
        hasMore={hasMore}
        page={state.page}
        selectedIds={selectedIds}
        onToggleSelect={handleToggleSelect}
        onToggleSelectAll={handleToggleSelectAll}
        onRowClick={handleRowClick}
        onAddToRoster={handleAddToRoster}
        onSaveView={handleSaveView}
        onCopyLink={handleCopyLink}
        onReset={handleReset}
        onForceRefresh={handleForceRefresh}
      />
    </main>
  );
}

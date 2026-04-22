'use client';

import { useCallback, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { FilterCard } from './filter-card';
import { ResultsCard } from './results-card';
import { SaveFiltersDialog } from './dialogs/save-filters-dialog';
import { FilterPresetsPopover } from './dialogs/filter-presets-popover';
import { ManagePresetsDialog } from './dialogs/manage-presets-dialog';
import { CreatorDetailSheet } from './creator-detail-sheet';
import { useDiscoverySearch, useRefreshDiscoverySearch, type DiscoveryCreator, type SavedSearch } from './hooks';
import { useFilterState } from './state/url-state';
import { toIcDiscoveryArgs } from './state/filter-mapper';
import { filterSchema, type FilterState, type SearchPlatform, searchPlatforms } from './state/filter-schema';

function suggestPresetName(state: FilterState): string {
  const parts: string[] = [];
  if (state.content.hashtags.length > 0) parts.push(state.content.hashtags[0]);
  if (state.audience.interests.length > 0) parts.push(state.audience.interests[0]);
  if (state.locations.length > 0) parts.push(state.locations[0]);
  if (state.followers) {
    const [min, max] = state.followers;
    if (min != null || max != null) parts.push(`${min ?? '0'}–${max ?? '∞'}`);
  }
  parts.push(state.searchOn);
  return parts.slice(0, 4).join(', ');
}

export function CreatorDiscoveryPage() {
  const { currentAgency, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const { state, patch, reset, setState } = useFilterState();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [manageDialogOpen, setManageDialogOpen] = useState(false);
  const [detailCreator, setDetailCreator] = useState<DiscoveryCreator | null>(null);

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

  const handleSave = useCallback(() => setSaveDialogOpen(true), []);

  const handleApplyPreset = useCallback(
    (preset: SavedSearch) => {
      // Merge stored filters (Zod state sans pagination) with defaults.
      const rawPlatform = preset.platform.toLowerCase();
      const platform: SearchPlatform =
        searchPlatforms.includes(rawPlatform as SearchPlatform)
          ? (rawPlatform as SearchPlatform)
          : 'instagram';
      const candidate = {
        ...(preset.filters as object),
        searchOn: platform,
        page: 1,
        limit: state.limit,
      };
      const parsed = filterSchema.safeParse(candidate);
      if (!parsed.success) {
        toast({
          title: 'Preset is incompatible',
          description: 'The saved filters could not be re-applied to the current schema.',
          variant: 'destructive',
        });
        return;
      }
      setState(parsed.data);
      setSelectedIds(new Set());
      toast({ title: 'Preset applied', description: `Loaded "${preset.name}".` });
    },
    [setState, state.limit, toast]
  );

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

  const handleRowClick = useCallback((creator: DiscoveryCreator) => {
    setDetailCreator(creator);
  }, []);

  const handleAddToRoster = useCallback(() => {
    toast({ title: 'Add to roster', description: 'Bulk import UI ships in Phase F7.' });
  }, [toast]);

  const handleSaveView = useCallback(() => setSaveDialogOpen(true), []);

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

  if (!currentAgency || !agencyId) {
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
        presetsSlot={
          <FilterPresetsPopover
            agencyId={agencyId}
            onApply={handleApplyPreset}
            onManage={() => setManageDialogOpen(true)}
          />
        }
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

      <SaveFiltersDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        agencyId={agencyId}
        state={state}
        suggestedName={suggestPresetName(state)}
      />
      <ManagePresetsDialog
        open={manageDialogOpen}
        onOpenChange={setManageDialogOpen}
        agencyId={agencyId}
      />
      <CreatorDetailSheet
        agencyId={agencyId}
        creator={detailCreator}
        open={!!detailCreator}
        onOpenChange={(open) => {
          if (!open) setDetailCreator(null);
        }}
      />
    </main>
  );
}

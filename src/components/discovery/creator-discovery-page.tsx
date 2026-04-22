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
import { FloatingActionBar } from './results-card/floating-action-bar';
import { AddToRosterDialog } from './dialogs/add-to-roster-dialog';
import { CompareOverlapDialog } from './dialogs/compare-overlap-dialog';
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
  const [selectedMap, setSelectedMap] = useState<Map<string, DiscoveryCreator>>(new Map());
  const selectedIds = useMemo(() => new Set(selectedMap.keys()), [selectedMap]);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [manageDialogOpen, setManageDialogOpen] = useState(false);
  const [detailCreator, setDetailCreator] = useState<DiscoveryCreator | null>(null);
  const [rosterDialogOpen, setRosterDialogOpen] = useState(false);
  const [compareDialogOpen, setCompareDialogOpen] = useState(false);

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
    setSelectedMap(new Map());
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
      setSelectedMap(new Map());
      toast({ title: 'Preset applied', description: `Loaded "${preset.name}".` });
    },
    [setState, state.limit, toast]
  );

  const handleToggleSelect = useCallback((creator: DiscoveryCreator) => {
    setSelectedMap((prev) => {
      const next = new Map(prev);
      if (next.has(creator.providerUserId)) next.delete(creator.providerUserId);
      else next.set(creator.providerUserId, creator);
      return next;
    });
  }, []);

  const handleToggleSelectAll = useCallback(
    (ids: string[], select: boolean) => {
      const rows = search.data?.accounts ?? [];
      const byId = new Map(rows.map((r) => [r.providerUserId, r] as const));
      setSelectedMap((prev) => {
        const next = new Map(prev);
        if (select) {
          for (const id of ids) {
            const row = byId.get(id);
            if (row) next.set(id, row);
          }
        } else {
          for (const id of ids) next.delete(id);
        }
        return next;
      });
    },
    [search.data]
  );

  const handleRowClick = useCallback((creator: DiscoveryCreator) => {
    setDetailCreator(creator);
  }, []);

  const handleAddToRoster = useCallback(() => {
    if (selectedMap.size === 0) {
      toast({
        title: 'Select creators first',
        description: 'Pick one or more rows, then click "Add to Creator Roster".',
      });
      return;
    }
    setRosterDialogOpen(true);
  }, [selectedMap.size, toast]);

  const handleCompare = useCallback(() => {
    if (selectedMap.size < 2) return;
    setCompareDialogOpen(true);
  }, [selectedMap.size]);

  const clearSelection = useCallback(() => setSelectedMap(new Map()), []);

  const selectedArray = useMemo(() => Array.from(selectedMap.values()), [selectedMap]);
  const compareDisabled = selectedMap.size < 2 || selectedMap.size > 10;
  const compareHint = selectedMap.size < 2
    ? 'Select at least 2 creators.'
    : selectedMap.size > 10
      ? 'Select at most 10 creators.'
      : undefined;

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
    setSelectedMap(new Map());
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

      <AddToRosterDialog
        open={rosterDialogOpen}
        onOpenChange={setRosterDialogOpen}
        agencyId={agencyId}
        creators={selectedArray}
        onSuccess={clearSelection}
      />
      <CompareOverlapDialog
        open={compareDialogOpen}
        onOpenChange={setCompareDialogOpen}
        agencyId={agencyId}
        creators={selectedArray}
      />

      <FloatingActionBar
        count={selectedMap.size}
        onAddToRoster={handleAddToRoster}
        onCompare={handleCompare}
        onClear={clearSelection}
        compareDisabled={compareDisabled}
        compareHint={compareHint}
      />
    </main>
  );
}

'use client';

import { useCallback, useMemo } from 'react';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
} from '@tanstack/react-query';
import { graphqlRequest, queries, mutations } from '@/lib/graphql/client';
import type { SearchPlatform } from './state/filter-schema';
import type { MultiSelectOption } from './filter-controls/multi-select-popover';

// ---------------------------------------------------------------------------
// discoverySearch
// ---------------------------------------------------------------------------

export interface DiscoveryCreator {
  providerUserId: string;
  username: string;
  fullName: string | null;
  followers: number | null;
  engagementPercent: number | null;
  pictureUrl: string | null;
  platform: string;
  creatorProfileId: string | null;
}

export interface CreatorSearchResult {
  accounts: DiscoveryCreator[];
  total: number;
  cached: boolean;
  cachedAt: string | null;
  expiresAt: string | null;
  creditsSpent: number;
  creditsSavedOnHit: number | null;
}

export interface UseDiscoverySearchArgs {
  agencyId: string;
  platform: SearchPlatform;
  filters: Record<string, unknown>;
  page: number;
  limit: number;
  /** Enable the query (pause when false). */
  enabled?: boolean;
}

export function useDiscoverySearch(args: UseDiscoverySearchArgs) {
  const queryKey: QueryKey = [
    'discoverySearch',
    args.agencyId,
    args.platform,
    args.filters,
    args.page,
    args.limit,
  ];

  return useQuery<CreatorSearchResult>({
    queryKey,
    enabled: args.enabled !== false && Boolean(args.agencyId),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    queryFn: async () => {
      const data = await graphqlRequest<{ discoverySearch: CreatorSearchResult }>(
        queries.discoverySearch,
        {
          agencyId: args.agencyId,
          platform: args.platform.toUpperCase(),
          filters: args.filters,
          page: args.page,
          limit: args.limit,
        }
      );
      return data.discoverySearch;
    },
  });
}

/**
 * Mutation variant for forced refreshes. Calls the same resolver with
 * forceRefresh=true and updates the cache on success.
 */
export function useRefreshDiscoverySearch() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (args: UseDiscoverySearchArgs) => {
      const data = await graphqlRequest<{ discoverySearch: CreatorSearchResult }>(
        queries.discoverySearch,
        {
          agencyId: args.agencyId,
          platform: args.platform.toUpperCase(),
          filters: args.filters,
          page: args.page,
          limit: args.limit,
          forceRefresh: true,
        }
      );
      return { args, result: data.discoverySearch };
    },
    onSuccess: ({ args, result }) => {
      client.setQueryData(
        [
          'discoverySearch',
          args.agencyId,
          args.platform,
          args.filters,
          args.page,
          args.limit,
        ],
        result
      );
    },
  });
}

// ---------------------------------------------------------------------------
// discoveryDictionary (autocomplete for locations, languages, brands, ...)
// ---------------------------------------------------------------------------

export type DictionaryType =
  | 'languages'
  | 'locations'
  | 'brands'
  | 'yt-topics'
  | 'games'
  | 'audience-brand-categories'
  | 'audience-brand-names'
  | 'audience-interests'
  | 'audience-locations';

/**
 * Factory that returns a `fetchOptions` function for the given dictionary
 * type. Pass into <MultiSelectPopover fetchOptions={...}/>. React Query
 * caches the underlying call (the dictionary resolver itself also has a
 * 7-day DB cache on the backend).
 */
export function useDictionaryLookup(type: DictionaryType, platform?: string) {
  const client = useQueryClient();

  return useCallback(
    async (query: string): Promise<MultiSelectOption[]> => {
      const key = ['discoveryDictionary', type, platform ?? null, query];
      const cached = client.getQueryData<MultiSelectOption[]>(key);
      if (cached) return cached;

      const data = await client.fetchQuery<MultiSelectOption[]>({
        queryKey: key,
        staleTime: 24 * 60 * 60 * 1000, // 24h (backend cache is 7d)
        queryFn: async () => {
          const raw = await graphqlRequest<{ discoveryDictionary: unknown }>(
            queries.discoveryDictionary,
            { type, query: query || null, platform: platform?.toUpperCase() ?? null }
          );
          return normalizeDictionaryResponse(raw.discoveryDictionary, type);
        },
      });

      return data;
    },
    [client, type, platform]
  );
}

function normalizeDictionaryResponse(
  raw: unknown,
  type: DictionaryType
): MultiSelectOption[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => {
      if (typeof entry === 'string') return { value: entry, label: entry };
      if (entry && typeof entry === 'object') {
        const e = entry as Record<string, unknown>;
        if (type === 'languages') {
          const language = (e.language as string) ?? '';
          const abbr = (e.abbreviation as string) ?? '';
          return { value: abbr, label: language || abbr };
        }
        const label =
          (e.full_name as string) ??
          (e.topic_details as string) ??
          (e.name as string) ??
          (e.username as string) ??
          JSON.stringify(entry);
        const value =
          (e.cleaned as string) ??
          (e.username as string) ??
          (e.value as string) ??
          label;
        return { value, label };
      }
      return null;
    })
    .filter((x): x is MultiSelectOption => x !== null);
}

// ---------------------------------------------------------------------------
// Saved searches
// ---------------------------------------------------------------------------

export interface SavedSearch {
  id: string;
  name: string;
  platform: string;
  filters: Record<string, unknown>;
  sortField: string | null;
  sortOrder: string | null;
  createdAt: string;
  updatedAt: string;
}

export function useSavedSearches(agencyId: string | undefined) {
  return useQuery({
    queryKey: ['savedSearches', agencyId],
    enabled: Boolean(agencyId),
    staleTime: 30_000,
    queryFn: async () => {
      const data = await graphqlRequest<{ savedSearches: SavedSearch[] }>(
        queries.savedSearches,
        { agencyId }
      );
      return data.savedSearches;
    },
  });
}

export function useSaveDiscoverySearch() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      agencyId: string;
      name: string;
      platform: string;
      filters: Record<string, unknown>;
      sortField?: string | null;
      sortOrder?: string | null;
    }) => {
      const data = await graphqlRequest<{ saveDiscoverySearch: SavedSearch }>(
        mutations.saveDiscoverySearch,
        {
          agencyId: input.agencyId,
          name: input.name,
          platform: input.platform.toUpperCase(),
          filters: input.filters,
          sortField: input.sortField ?? null,
          sortOrder: input.sortOrder ?? null,
        }
      );
      return data.saveDiscoverySearch;
    },
    onSuccess: (_row, input) => {
      client.invalidateQueries({ queryKey: ['savedSearches', input.agencyId] });
    },
  });
}

export function useDeleteDiscoverySearch() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; agencyId: string }) => {
      await graphqlRequest<{ deleteDiscoverySearch: boolean }>(
        mutations.deleteDiscoverySearch,
        { id: input.id }
      );
      return input;
    },
    onSuccess: (_row, input) => {
      client.invalidateQueries({ queryKey: ['savedSearches', input.agencyId] });
    },
  });
}

export function useUpdateDiscoverySearch() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      agencyId: string;
      name?: string;
      filters?: Record<string, unknown>;
      sortField?: string | null;
      sortOrder?: string | null;
    }) => {
      const data = await graphqlRequest<{ updateDiscoverySearch: SavedSearch }>(
        mutations.updateDiscoverySearch,
        {
          id: input.id,
          name: input.name ?? null,
          filters: input.filters ?? null,
          sortField: input.sortField ?? null,
          sortOrder: input.sortOrder ?? null,
        }
      );
      return { agencyId: input.agencyId, row: data.updateDiscoverySearch };
    },
    onSuccess: ({ agencyId }) => {
      client.invalidateQueries({ queryKey: ['savedSearches', agencyId] });
    },
  });
}

// ---------------------------------------------------------------------------
// Multi-select state for the floating action bar
// ---------------------------------------------------------------------------

export function useSelectedCreators() {
  // Simple map-based selection; adequate for Phase F3.
  // Can move to Zustand later if multiple components need to subscribe.
  const state = useMemo(() => new Map<string, DiscoveryCreator>(), []);

  const add = useCallback(
    (c: DiscoveryCreator) => {
      state.set(c.providerUserId, c);
    },
    [state]
  );
  const remove = useCallback(
    (providerUserId: string) => {
      state.delete(providerUserId);
    },
    [state]
  );
  const clear = useCallback(() => state.clear(), [state]);
  return { state, add, remove, clear };
}

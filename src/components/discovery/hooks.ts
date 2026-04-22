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
// Single-creator enrichment & detail sheet
// ---------------------------------------------------------------------------

export type EnrichmentMode = 'RAW' | 'FULL' | 'FULL_WITH_AUDIENCE' | 'EMAIL' | 'CONNECTED_SOCIALS';

export interface CreatorProfile {
  id: string;
  provider: string;
  platform: string;
  providerUserId: string;
  username: string;
  fullName: string | null;
  followers: number | null;
  engagementPercent: number | null;
  biography: string | null;
  nichePrimary: string | null;
  nicheSecondary: string[] | null;
  email: string | null;
  location: string | null;
  language: string | null;
  isVerified: boolean | null;
  isBusiness: boolean | null;
  isCreator: boolean | null;
  profilePictureUrl: string | null;
  enrichmentMode: 'RAW' | 'FULL' | 'FULL_WITH_AUDIENCE' | 'NONE' | null;
  lastEnrichedAt: string | null;
  firstSeenAt: string;
  rawData: Record<string, unknown> | null;
}

export interface CreatorEnrichment {
  id: string;
  agencyId: string;
  creatorProfileId: string | null;
  platform: string;
  handle: string;
  mode: EnrichmentMode;
  creditsSpent: number;
  cacheHit: boolean;
  icCreditsCost: number | null;
  triggeredBy: string;
  createdAt: string;
  profile: CreatorProfile | null;
}

export function useCreatorProfile(platform: string | undefined, handle: string | undefined) {
  return useQuery({
    queryKey: ['creatorProfile', platform, handle],
    enabled: Boolean(platform && handle),
    staleTime: 30_000,
    queryFn: async () => {
      const data = await graphqlRequest<{ creatorProfile: CreatorProfile | null }>(
        queries.creatorProfile,
        { platform: platform!.toUpperCase(), handle: handle! }
      );
      return data.creatorProfile;
    },
  });
}

export function useEnrichCreator() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      agencyId: string;
      platform: string;
      handle: string;
      mode: 'RAW' | 'FULL' | 'FULL_WITH_AUDIENCE';
      forceRefresh?: boolean;
    }) => {
      const data = await graphqlRequest<{ enrichCreator: CreatorEnrichment }>(
        mutations.enrichCreator,
        {
          agencyId: input.agencyId,
          platform: input.platform.toUpperCase(),
          handle: input.handle,
          mode: input.mode,
          forceRefresh: input.forceRefresh ?? null,
        }
      );
      return data.enrichCreator;
    },
    onSuccess: (enrichment, input) => {
      client.invalidateQueries({
        queryKey: ['creatorProfile', input.platform.toUpperCase(), input.handle],
      });
      if (enrichment.profile) {
        client.setQueryData(
          ['creatorProfile', input.platform.toUpperCase(), input.handle],
          enrichment.profile
        );
      }
    },
  });
}

export interface ConnectedIdentity {
  id: string;
  canonicalId: string;
  creatorProfileId: string;
  platform: string;
  source: string;
  confidence: string;
  discoveredAt: string;
  profile: {
    id: string;
    username: string;
    fullName: string | null;
    followers: number | null;
    profilePictureUrl: string | null;
  } | null;
}

export function useFindConnectedSocials() {
  return useMutation({
    mutationFn: async (input: { agencyId: string; platform: string; handle: string }) => {
      const data = await graphqlRequest<{ findConnectedSocials: ConnectedIdentity[] }>(
        mutations.findConnectedSocials,
        {
          agencyId: input.agencyId,
          platform: input.platform.toUpperCase(),
          handle: input.handle,
        }
      );
      return data.findConnectedSocials;
    },
  });
}

export function useFetchCreatorPosts() {
  return useMutation({
    mutationFn: async (input: {
      agencyId: string;
      platform: string;
      handle: string;
      count?: number;
      paginationToken?: string;
    }) => {
      const data = await graphqlRequest<{ fetchCreatorPosts: unknown }>(
        mutations.fetchCreatorPosts,
        {
          agencyId: input.agencyId,
          platform: input.platform.toUpperCase(),
          handle: input.handle,
          count: input.count ?? null,
          paginationToken: input.paginationToken ?? null,
        }
      );
      return data.fetchCreatorPosts;
    },
  });
}

export function useSimilarCreators(input: {
  agencyId: string | undefined;
  platform: string | undefined;
  referenceKey: 'url' | 'username' | 'id';
  referenceValue: string | undefined;
  enabled: boolean;
}) {
  return useQuery({
    queryKey: [
      'similarCreators',
      input.agencyId,
      input.platform,
      input.referenceKey,
      input.referenceValue,
    ],
    enabled:
      input.enabled &&
      Boolean(input.agencyId && input.platform && input.referenceValue),
    staleTime: 60_000,
    queryFn: async () => {
      const data = await graphqlRequest<{ similarCreators: CreatorSearchResult }>(
        queries.similarCreators,
        {
          agencyId: input.agencyId,
          platform: input.platform!.toUpperCase(),
          referenceKey: input.referenceKey,
          referenceValue: input.referenceValue,
          page: 1,
          limit: 12,
        }
      );
      return data.similarCreators;
    },
  });
}

export function useImportCreatorsToAgency() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      agencyId: string;
      items: Array<{
        creatorProfileId?: string;
        platform?: string;
        handle?: string;
        enrichIfMissing?: boolean;
      }>;
    }) => {
      const normalisedItems = input.items.map((item) => ({
        creatorProfileId: item.creatorProfileId ?? null,
        platform: item.platform ? item.platform.toUpperCase() : null,
        handle: item.handle ?? null,
        enrichIfMissing: item.enrichIfMissing ?? null,
      }));
      const data = await graphqlRequest<{ importCreatorsToAgency: Array<Record<string, unknown>> }>(
        mutations.importCreatorsToAgency,
        { agencyId: input.agencyId, items: normalisedItems }
      );
      return data.importCreatorsToAgency;
    },
    onSuccess: (_rows, input) => {
      // Creator list view will re-fetch next time it mounts.
      client.invalidateQueries({ queryKey: ['creatorProfile'] });
      void input;
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

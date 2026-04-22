'use client';

/**
 * useFilterState — Zod filter state <-> URL query params.
 *
 * The URL is the persistence layer; Zod state is the runtime truth. On
 * mount we hydrate state from the URL. Every mutation writes to the URL
 * (debounced 150ms) so that navigation history, copy-link, and saved-search
 * round-trips all work without extra plumbing.
 *
 * Encoding strategy:
 *   - Default values are omitted from the URL (clean URLs).
 *   - Simple strings/numbers/enums go as plain key=value.
 *   - Tuples [min,max] go as "min-max" (null boundary → empty, e.g. "1000-").
 *   - String arrays go as comma-separated lists.
 *   - Nested objects (creator / audience / content) are JSON-stringified
 *     under a single key when non-default.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  defaultFilterState,
  filterSchema,
  type FilterState,
} from './filter-schema';

const WRITE_DEBOUNCE_MS = 150;

// ---------------------------------------------------------------------------
// URL <-> state encode / decode
// ---------------------------------------------------------------------------

type RangeValue = [number | null, number | null];

function encodeRange(r: RangeValue | undefined): string | null {
  if (!r) return null;
  const [min, max] = r;
  if (min === null && max === null) return null;
  return `${min ?? ''}-${max ?? ''}`;
}

function decodeRange(v: string | null): RangeValue | undefined {
  if (!v) return undefined;
  const [minStr, maxStr] = v.split('-');
  const min = minStr === '' ? null : Number(minStr);
  const max = maxStr === '' ? null : Number(maxStr);
  if ((min !== null && Number.isNaN(min)) || (max !== null && Number.isNaN(max))) return undefined;
  return [min, max] as RangeValue;
}

function encodeStringArray(arr: string[]): string | null {
  return arr.length > 0 ? arr.map((s) => encodeURIComponent(s)).join(',') : null;
}

function decodeStringArray(v: string | null): string[] {
  if (!v) return [];
  return v.split(',').map((s) => decodeURIComponent(s)).filter((s) => s.length > 0);
}

export function filterStateToSearchParams(state: FilterState): URLSearchParams {
  const params = new URLSearchParams();

  if (state.q && state.q !== '') params.set('q', state.q);
  if (state.searchMode !== 'ai') params.set('searchMode', state.searchMode);
  if (state.type !== 'any') params.set('type', state.type);
  if (state.searchOn !== 'instagram') params.set('searchOn', state.searchOn);

  const locations = encodeStringArray(state.locations);
  if (locations) params.set('locations', locations);

  const followers = encodeRange(state.followers);
  if (followers) params.set('followers', followers);

  if (state.lastPost) params.set('lastPost', state.lastPost);

  const er = encodeRange(state.er);
  if (er) params.set('er', er);

  if (state.gender !== 'any') params.set('gender', state.gender);

  const languages = encodeStringArray(state.languages);
  if (languages) params.set('languages', languages);

  // Nested objects — JSON when they differ from their default.
  if (JSON.stringify(state.creator) !== JSON.stringify(defaultFilterState.creator)) {
    params.set('creator', JSON.stringify(state.creator));
  }
  if (JSON.stringify(state.audience) !== JSON.stringify(defaultFilterState.audience)) {
    params.set('audience', JSON.stringify(state.audience));
  }
  if (JSON.stringify(state.content) !== JSON.stringify(defaultFilterState.content)) {
    params.set('content', JSON.stringify(state.content));
  }

  if (state.creatorHas.length > 0) {
    params.set('creatorHas', state.creatorHas.join(','));
  }

  if (state.page !== 1) params.set('page', String(state.page));
  if (state.limit !== 30) params.set('limit', String(state.limit));

  return params;
}

function safeParseJson<T>(v: string | null): T | undefined {
  if (!v) return undefined;
  try {
    return JSON.parse(v) as T;
  } catch {
    return undefined;
  }
}

export function searchParamsToFilterState(params: URLSearchParams): FilterState {
  const raw: Record<string, unknown> = {
    q: params.get('q') ?? undefined,
    searchMode: params.get('searchMode') ?? undefined,
    type: params.get('type') ?? undefined,
    searchOn: params.get('searchOn') ?? undefined,
    locations: params.get('locations') ? decodeStringArray(params.get('locations')) : undefined,
    followers: decodeRange(params.get('followers')),
    lastPost: params.get('lastPost') ?? undefined,
    er: decodeRange(params.get('er')),
    gender: params.get('gender') ?? undefined,
    languages: params.get('languages') ? decodeStringArray(params.get('languages')) : undefined,
    creator: safeParseJson(params.get('creator')),
    audience: safeParseJson(params.get('audience')),
    content: safeParseJson(params.get('content')),
    creatorHas: params.get('creatorHas') ? decodeStringArray(params.get('creatorHas')) : undefined,
    page: params.get('page') ? Number(params.get('page')) : undefined,
    limit: params.get('limit') ? Number(params.get('limit')) : undefined,
  };

  // Strip undefined so Zod applies defaults.
  const cleaned: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (v !== undefined) cleaned[k] = v;
  }

  try {
    return filterSchema.parse(cleaned);
  } catch {
    return filterSchema.parse({});
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export interface UseFilterStateReturn {
  state: FilterState;
  setState: (next: FilterState | ((prev: FilterState) => FilterState)) => void;
  /** Patch a single top-level field and write to URL. */
  patch: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  /** Reset to defaults (clears URL). */
  reset: () => void;
  /** Is the current state the default (no filters applied)? */
  isDefault: boolean;
}

/**
 * Read/write filter state via URL query params with debounced writes.
 */
export function useFilterState(): UseFilterStateReturn {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initial hydration from URL.
  const [state, setStateInternal] = useState<FilterState>(() =>
    searchParamsToFilterState(new URLSearchParams(searchParams?.toString() ?? ''))
  );

  const writeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const writeToUrl = useCallback(
    (next: FilterState) => {
      if (writeTimer.current) clearTimeout(writeTimer.current);
      writeTimer.current = setTimeout(() => {
        const params = filterStateToSearchParams(next);
        const qs = params.toString();
        const url = qs.length > 0 ? `?${qs}` : window.location.pathname;
        router.replace(url, { scroll: false });
      }, WRITE_DEBOUNCE_MS);
    },
    [router]
  );

  const setState = useCallback(
    (next: FilterState | ((prev: FilterState) => FilterState)) => {
      setStateInternal((prev) => {
        const resolved = typeof next === 'function' ? next(prev) : next;
        writeToUrl(resolved);
        return resolved;
      });
    },
    [writeToUrl]
  );

  const patch = useCallback(
    <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
      setState((prev) => ({ ...prev, [key]: value }));
    },
    [setState]
  );

  const reset = useCallback(() => {
    setState(defaultFilterState);
  }, [setState]);

  const isDefault = useMemo(
    () => JSON.stringify(state) === JSON.stringify(defaultFilterState),
    [state]
  );

  // If the URL changes externally (back/forward, preset apply), re-hydrate.
  useEffect(() => {
    const next = searchParamsToFilterState(
      new URLSearchParams(searchParams?.toString() ?? '')
    );
    if (JSON.stringify(next) !== JSON.stringify(state)) {
      setStateInternal(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return { state, setState, patch, reset, isDefault };
}

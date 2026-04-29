import { describe, expect, it } from 'vitest';
import { defaultFilterState, type FilterState } from '../state/filter-schema';
import {
  filterStateToSearchParams,
  searchParamsToFilterState,
} from '../state/url-state';

function override(patch: Partial<FilterState>): FilterState {
  return { ...defaultFilterState, ...patch } as FilterState;
}

function roundTrip(state: FilterState): FilterState {
  const params = filterStateToSearchParams(state);
  return searchParamsToFilterState(params);
}

describe('filterStateToSearchParams', () => {
  it('defaults produce no query string', () => {
    const params = filterStateToSearchParams(defaultFilterState);
    expect(params.toString()).toBe('');
  });

  it('omits fields that equal their default', () => {
    const params = filterStateToSearchParams(
      override({ q: 'fitness', locations: ['US'] })
    );
    const string = params.toString();
    expect(string).toContain('q=fitness');
    expect(string).toContain('locations=US');
    // These stay default -> absent
    expect(string).not.toContain('searchMode');
    expect(string).not.toContain('type');
    expect(string).not.toContain('gender');
  });

  it('encodes locations with commas and URL-encodes entries', () => {
    const params = filterStateToSearchParams(
      override({ locations: ['United States', 'UK'] })
    );
    const raw = params.get('locations');
    expect(raw).toBe('United%20States,UK');
  });

  it('encodes follower tuple as "min-max"', () => {
    expect(
      filterStateToSearchParams(override({ followers: [10000, 500000] })).get('followers')
    ).toBe('10000-500000');
  });

  it('encodes open-ended ranges with empty slot', () => {
    expect(
      filterStateToSearchParams(override({ followers: [10000, null] })).get('followers')
    ).toBe('10000-');
    expect(
      filterStateToSearchParams(override({ followers: [null, 500000] })).get('followers')
    ).toBe('-500000');
  });

  it('JSON-encodes nested creator/audience/content only when changed', () => {
    const params = filterStateToSearchParams(
      override({
        creator: { ...defaultFilterState.creator, verified: true },
      })
    );
    expect(params.has('creator')).toBe(true);
    expect(params.has('audience')).toBe(false);
    expect(params.has('content')).toBe(false);
  });
});

describe('searchParamsToFilterState', () => {
  it('empty URL parses to defaults', () => {
    const state = searchParamsToFilterState(new URLSearchParams(''));
    expect(state).toEqual(defaultFilterState);
  });

  it('invalid enums fall back to default', () => {
    const state = searchParamsToFilterState(
      new URLSearchParams('searchOn=facebook&gender=garbage')
    );
    expect(state.searchOn).toBe('instagram');
    expect(state.gender).toBe('any');
  });

  it('malformed JSON in nested block falls back to default for that block', () => {
    const state = searchParamsToFilterState(
      new URLSearchParams('creator=%7Bbroken')
    );
    expect(state.creator).toEqual(defaultFilterState.creator);
  });

  it('malformed range tuple falls back to undefined', () => {
    const state = searchParamsToFilterState(
      new URLSearchParams('followers=notanumber-also')
    );
    expect(state.followers).toBeUndefined();
  });
});

describe('round-trip', () => {
  it('default -> url -> state is idempotent', () => {
    expect(roundTrip(defaultFilterState)).toEqual(defaultFilterState);
  });

  it('complex state survives round-trip', () => {
    const complex: FilterState = override({
      q: 'Plant-based recipes',
      searchMode: 'keywords',
      searchOn: 'tiktok',
      locations: ['United States', 'France'],
      followers: [50000, 1000000],
      lastPost: '30d',
      gender: 'female',
      languages: ['en', 'fr'],
      creator: {
        ...defaultFilterState.creator,
        bioKeywords: ['vegan', 'chef'],
        verified: true,
        followerGrowth: [10, null],
        postingFrequency: 'weekly',
      },
      audience: {
        ...defaultFilterState.audience,
        interests: ['food', 'health'],
      },
      content: {
        ...defaultFilterState.content,
        hashtags: ['#vegan'],
        hasReels: true,
      },
      creatorHas: ['instagram', 'tiktok', 'youtube'],
    });

    const round = roundTrip(complex);
    expect(round).toEqual(complex);
  });

  it('page / limit are preserved when non-default', () => {
    const state = override({ page: 3, limit: 50 });
    const round = roundTrip(state);
    expect(round.page).toBe(3);
    expect(round.limit).toBe(50);
  });
});

import { describe, expect, it } from 'vitest';
import {
  POSTS_CACHE_TTL_DAYS,
  findPriorAgencyPostsFetch,
  isPostsCacheFresh,
  reconstructIcPostsResponse,
  type CachedPostRow,
  type PriorAgencyFetchRow,
} from '../posts-cache-helpers';

const NOW = new Date('2026-04-27T12:00:00Z').getTime();
const daysAgo = (n: number) => new Date(NOW - n * 24 * 60 * 60 * 1000).toISOString();

function row(overrides: Partial<CachedPostRow>): CachedPostRow {
  return {
    post_pk: 'p',
    taken_at: null,
    caption: null,
    media_url: null,
    media_type: null,
    likes: null,
    comments: null,
    views: null,
    raw_data: {},
    fetched_at: daysAgo(0),
    ...overrides,
  };
}

describe('isPostsCacheFresh', () => {
  it('returns false when there are no cached rows', () => {
    expect(isPostsCacheFresh([], NOW)).toBe(false);
  });

  it('returns true when the most recent fetched_at is inside the TTL', () => {
    expect(isPostsCacheFresh([row({ fetched_at: daysAgo(5) })], NOW)).toBe(true);
  });

  it('returns false when every fetched_at is older than the TTL', () => {
    expect(
      isPostsCacheFresh(
        [
          row({ fetched_at: daysAgo(POSTS_CACHE_TTL_DAYS + 1) }),
          row({ fetched_at: daysAgo(POSTS_CACHE_TTL_DAYS + 5) }),
        ],
        NOW
      )
    ).toBe(false);
  });

  it('uses the most recent fetched_at, not the oldest', () => {
    expect(
      isPostsCacheFresh(
        [
          row({ fetched_at: daysAgo(POSTS_CACHE_TTL_DAYS + 5) }),
          row({ fetched_at: daysAgo(1) }),
        ],
        NOW
      )
    ).toBe(true);
  });

  it('exact TTL boundary is considered stale (strictly less than)', () => {
    expect(
      isPostsCacheFresh([row({ fetched_at: daysAgo(POSTS_CACHE_TTL_DAYS) })], NOW)
    ).toBe(false);
  });
});

describe('reconstructIcPostsResponse', () => {
  it('shapes the response like a live IC payload', () => {
    const out = reconstructIcPostsResponse([row({ post_pk: 'a', raw_data: { foo: 1 } })]);
    expect(out.credits_cost).toBe(0);
    expect(out.result.status).toBe('cache');
    expect(out.result.next_token).toBeNull();
    expect(out.result.more_available).toBe(false);
    expect(out.result.num_results).toBe(1);
    expect(out.result.items).toEqual([{ foo: 1 }]);
  });

  it('sorts items by taken_at descending', () => {
    const out = reconstructIcPostsResponse([
      row({ post_pk: 'old', raw_data: { pk: 'old' }, taken_at: daysAgo(20) }),
      row({ post_pk: 'new', raw_data: { pk: 'new' }, taken_at: daysAgo(1) }),
      row({ post_pk: 'mid', raw_data: { pk: 'mid' }, taken_at: daysAgo(10) }),
    ]);
    expect(out.result.items.map((i) => (i as { pk: string }).pk)).toEqual(['new', 'mid', 'old']);
  });

  it('synthesises an IC-like item when raw_data is empty (defensive)', () => {
    const out = reconstructIcPostsResponse([
      row({
        post_pk: 'pk1',
        caption: 'hello',
        likes: 10,
        comments: 2,
        views: 100,
        raw_data: {},
      }),
    ]);
    expect(out.result.items[0]).toMatchObject({
      pk: 'pk1',
      caption: 'hello',
      engagement: { likes: 10, comments: 2, views: 100 },
    });
  });
});

describe('findPriorAgencyPostsFetch', () => {
  it('returns null on empty input', () => {
    expect(findPriorAgencyPostsFetch([], NOW)).toBeNull();
  });

  it('returns the most recent qualifying row', () => {
    const rows: PriorAgencyFetchRow[] = [
      { id: 'newer', created_at: daysAgo(2) },
      { id: 'older', created_at: daysAgo(10) },
    ];
    expect(findPriorAgencyPostsFetch(rows, NOW)?.id).toBe('newer');
  });

  it('returns null when every row is past the TTL', () => {
    const rows: PriorAgencyFetchRow[] = [
      { id: 'old', created_at: daysAgo(POSTS_CACHE_TTL_DAYS + 1) },
    ];
    expect(findPriorAgencyPostsFetch(rows, NOW)).toBeNull();
  });
});

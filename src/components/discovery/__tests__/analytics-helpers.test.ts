import { describe, expect, it } from 'vitest';
import { summarisePostsAnalytics } from '../creator-detail-sheet/sections/analytics-helpers';
import type { ICPost } from '../creator-detail-sheet/sections/posts-grid';

function post(p: Partial<ICPost>): ICPost {
  return { ...p };
}

describe('summarisePostsAnalytics', () => {
  it('returns empty summary when there are no posts', () => {
    const out = summarisePostsAnalytics([]);
    expect(out).toEqual({ trend: [], averageEr: null, topPosts: [], count: 0 });
  });

  it('skips posts without a usable view count', () => {
    const out = summarisePostsAnalytics([
      post({ pk: 'no-views', engagement: { likes: 100, comments: 10 } }),
      post({ pk: 'has-views', engagement: { likes: 100, comments: 10, views: 1000 } }),
    ]);
    expect(out.count).toBe(1);
    expect(out.trend).toHaveLength(1);
    expect(out.topPosts.map((p) => p.pk)).toEqual(['has-views']);
  });

  it('orders the trend oldest-first by taken_at', () => {
    const out = summarisePostsAnalytics([
      post({ pk: 'newer', taken_at: 200, engagement: { likes: 50, comments: 0, views: 1000 } }),
      post({ pk: 'older', taken_at: 100, engagement: { likes: 100, comments: 0, views: 1000 } }),
    ]);
    // older = 0.1, newer = 0.05
    expect(out.trend).toEqual([0.1, 0.05]);
  });

  it('top posts are sorted by ER descending', () => {
    const out = summarisePostsAnalytics(
      [
        post({ pk: 'low', engagement: { likes: 10, comments: 0, views: 1000 } }),
        post({ pk: 'high', engagement: { likes: 200, comments: 50, views: 1000 } }),
        post({ pk: 'mid', engagement: { likes: 100, comments: 10, views: 1000 } }),
      ],
      3
    );
    expect(out.topPosts.map((p) => p.pk)).toEqual(['high', 'mid', 'low']);
    expect(out.topPosts[0].er).toBeCloseTo(0.25, 5);
  });

  it('caps top posts at the requested topN', () => {
    const posts = Array.from({ length: 6 }).map((_, i) =>
      post({ pk: String(i), engagement: { likes: i * 10, comments: 0, views: 1000 } })
    );
    expect(summarisePostsAnalytics(posts, 3).topPosts).toHaveLength(3);
  });

  it('average ER is the arithmetic mean of measurable ERs', () => {
    const out = summarisePostsAnalytics([
      post({ pk: '1', engagement: { likes: 100, comments: 0, views: 1000 } }), // 0.1
      post({ pk: '2', engagement: { likes: 200, comments: 0, views: 1000 } }), // 0.2
    ]);
    expect(out.averageEr).toBeCloseTo(0.15, 5);
  });
});

/**
 * Pure helpers for the approximated-analytics section. No React dependencies
 * so the reducer-style function is unit-testable in isolation.
 */

import { computeDerivedMetrics } from '@/lib/analytics/metrics';
import type { ICPost } from './posts-grid';

export interface PostWithEr extends ICPost {
  er: number | null;
}

export interface AnalyticsSummary {
  /** Per-post ER series, ordered by post.taken_at ascending (oldest first). */
  trend: number[];
  /** Average of the (non-null) ER values across all posts. */
  averageEr: number | null;
  /** Up to N posts with the highest ER, ordered descending. */
  topPosts: PostWithEr[];
  /** Number of posts that contributed to the trend. */
  count: number;
}

/**
 * Reduce a posts payload into the shape the analytics section needs.
 *
 * Engagement rate per post = (likes + comments) / views, via the existing
 * `computeDerivedMetrics` helper. Posts without a usable view count
 * (typical for Instagram photo posts) contribute null and are skipped from
 * the trend / average / top list.
 */
export function summarisePostsAnalytics(
  posts: ICPost[],
  topN = 3
): AnalyticsSummary {
  const enriched: PostWithEr[] = posts.map((post) => {
    const m = computeDerivedMetrics({
      views: post.engagement?.views ?? null,
      likes: post.engagement?.likes ?? null,
      comments: post.engagement?.comments ?? null,
      shares: 0,
      saves: 0,
      creatorFollowers: null,
    });
    return { ...post, er: m.engagement_rate };
  });

  const measurable = enriched.filter((p) => p.er !== null);

  // Trend: oldest first so the sparkline reads left → right as time forward.
  const trendOrdered = measurable
    .slice()
    .sort((a, b) => (a.taken_at ?? 0) - (b.taken_at ?? 0));

  const trend = trendOrdered
    .map((p) => p.er)
    .filter((v): v is number => v !== null);

  const averageEr =
    trend.length > 0 ? trend.reduce((a, b) => a + b, 0) / trend.length : null;

  const topPosts = measurable
    .slice()
    .sort((a, b) => (b.er ?? 0) - (a.er ?? 0))
    .slice(0, topN);

  return { trend, averageEr, topPosts, count: measurable.length };
}

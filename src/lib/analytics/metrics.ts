/**
 * Derived Metrics Calculator
 *
 * Pure computation functions for calculating engagement rates,
 * virality indices, growth velocity, and other derived metrics.
 * No database access, no side effects.
 */

export interface MetricsInput {
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  creatorFollowers: number | null;
}

export interface CalculatedMetrics {
  engagement_rate: number | null;
  like_rate: number | null;
  comment_rate: number | null;
  share_rate: number | null;
  save_rate: number | null;
  virality_index: number | null;
}

export interface GrowthVelocity {
  views_delta: number | null;
  likes_delta: number | null;
  comments_delta: number | null;
  shares_delta: number | null;
  saves_delta: number | null;
  views_growth_pct: number | null;
  likes_growth_pct: number | null;
  engagement_rate_delta: number | null;
}

/**
 * Compute derived metrics from normalized post metrics.
 *
 * engagement_rate = (likes + comments + shares) / views
 * virality_index = views / creatorFollowers
 *
 * All division operations guard against zero denominators (returns null).
 */
export function computeDerivedMetrics(input: MetricsInput): CalculatedMetrics {
  const { views, likes, comments, shares, saves, creatorFollowers } = input;

  const safeViews = views != null && views > 0 ? views : null;
  const safeLikes = likes ?? 0;
  const safeComments = comments ?? 0;
  const safeShares = shares ?? 0;
  const safeSaves = saves ?? 0;

  const totalEngagement = safeLikes + safeComments + safeShares;

  return {
    engagement_rate: safeViews
      ? round(totalEngagement / safeViews, 6)
      : null,

    like_rate: safeViews
      ? round(safeLikes / safeViews, 6)
      : null,

    comment_rate: safeViews
      ? round(safeComments / safeViews, 6)
      : null,

    share_rate: safeViews
      ? round(safeShares / safeViews, 6)
      : null,

    save_rate: safeViews
      ? round(safeSaves / safeViews, 6)
      : null,

    virality_index:
      creatorFollowers != null && creatorFollowers > 0 && views != null
        ? round(views / creatorFollowers, 4)
        : null,
  };
}

/**
 * Compute growth velocity between two snapshots.
 * Returns deltas and percentage changes.
 */
export function computeGrowthVelocity(
  current: MetricsInput,
  previous: MetricsInput | null
): GrowthVelocity {
  if (!previous) {
    return {
      views_delta: null,
      likes_delta: null,
      comments_delta: null,
      shares_delta: null,
      saves_delta: null,
      views_growth_pct: null,
      likes_growth_pct: null,
      engagement_rate_delta: null,
    };
  }

  const viewsDelta = safeDelta(current.views, previous.views);
  const likesDelta = safeDelta(current.likes, previous.likes);

  const currentER = computeDerivedMetrics(current).engagement_rate;
  const previousER = computeDerivedMetrics(previous).engagement_rate;

  return {
    views_delta: viewsDelta,
    likes_delta: likesDelta,
    comments_delta: safeDelta(current.comments, previous.comments),
    shares_delta: safeDelta(current.shares, previous.shares),
    saves_delta: safeDelta(current.saves, previous.saves),
    views_growth_pct: safeGrowthPct(current.views, previous.views),
    likes_growth_pct: safeGrowthPct(current.likes, previous.likes),
    engagement_rate_delta:
      currentER != null && previousER != null
        ? round(currentER - previousER, 6)
        : null,
  };
}

function safeDelta(current: number | null, previous: number | null): number | null {
  if (current == null || previous == null) return null;
  return current - previous;
}

function safeGrowthPct(current: number | null, previous: number | null): number | null {
  if (current == null || previous == null || previous === 0) return null;
  return round((current - previous) / previous, 4);
}

function round(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

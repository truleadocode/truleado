'use client';

import { Heart, MessageCircle, TrendingUp } from 'lucide-react';
import { useFetchCreatorPosts, type DiscoveryCreator } from '../../hooks';
import { formatCount, formatPercent, sparklinePath } from '../../primitives/tokens';
import { Section } from './section';
import { summarisePostsAnalytics } from './analytics-helpers';
import type { ICPost } from './posts-grid';

interface ApproximatedAnalyticsProps {
  agencyId: string;
  creator: DiscoveryCreator;
}

const SUPPORTED = new Set(['instagram', 'tiktok', 'youtube']);

/**
 * Computed entirely client-side from the same posts payload `<PostsGrid />`
 * already fetched (React Query dedupes the call). No additional credits
 * are ever charged here.
 */
export function ApproximatedAnalytics({ agencyId, creator }: ApproximatedAnalyticsProps) {
  const platform = creator.platform.toLowerCase();
  const supportsPosts = SUPPORTED.has(platform);

  const postsQuery = useFetchCreatorPosts({
    agencyId,
    platform: creator.platform,
    handle: creator.username,
    enabled: supportsPosts,
    count: platform === 'instagram' ? 12 : 30,
  });

  if (!supportsPosts) return null;

  const items = (postsQuery.data?.result?.items ?? []) as ICPost[];
  const summary = summarisePostsAnalytics(items, 3);

  return (
    <Section
      title="Approximated analytics"
      description="Computed from public post data — no enrichment required."
    >
      {postsQuery.isLoading ? (
        <Skeleton />
      ) : summary.count === 0 ? (
        <div className="rounded-md border border-tru-border-soft p-4 text-center text-xs text-tru-slate-500">
          Not enough post-level data to compute trends. (Instagram photo posts often don&apos;t
          expose view counts.)
        </div>
      ) : (
        <div className="space-y-4">
          <TrendCard
            trend={summary.trend}
            averageEr={summary.averageEr}
            count={summary.count}
          />
          <TopPosts posts={summary.topPosts} />
        </div>
      )}
    </Section>
  );
}

function TrendCard({
  trend,
  averageEr,
  count,
}: {
  trend: number[];
  averageEr: number | null;
  count: number;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-md border border-tru-border-soft bg-tru-slate-50 p-4">
      <div>
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-tru-slate-500">
          <TrendingUp className="h-3 w-3" /> Engagement rate
        </div>
        <div className="mt-1 text-2xl font-bold tabular-nums text-tru-slate-900">
          {formatPercent(averageEr)}
        </div>
        <div className="text-[11px] text-tru-slate-500">
          Average across {count} measured post{count === 1 ? '' : 's'}.
        </div>
      </div>
      <svg viewBox="0 0 120 36" className="h-10 w-32 shrink-0" aria-hidden>
        <path
          d={sparklinePath(trend, 120, 36)}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="text-tru-blue-600"
        />
      </svg>
    </div>
  );
}

function TopPosts({
  posts,
}: {
  posts: Array<ICPost & { er: number | null }>;
}) {
  return (
    <div>
      <h4 className="mb-2 text-[10.5px] font-bold uppercase tracking-[0.08em] text-tru-slate-400">
        Top performing
      </h4>
      <div className="grid grid-cols-3 gap-2">
        {posts.map((post, i) => {
          const key = post.pk ?? post.media_id ?? String(i);
          const thumb =
            post.thumbnails?.url ?? post.image_versions?.candidates?.[0]?.url ?? post.media_url;
          return (
            <a
              key={key}
              href={post.url ?? '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative block overflow-hidden rounded-md border border-tru-slate-200 bg-white"
            >
              <div className="aspect-square w-full bg-tru-slate-100">
                {thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={thumb}
                    alt=""
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : null}
              </div>
              <div className="absolute right-1 top-1 rounded-full bg-tru-blue-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {formatPercent(post.er)}
              </div>
              <div className="flex items-center gap-2 px-2 py-1 text-[10px] text-tru-slate-500">
                <span className="inline-flex items-center gap-0.5">
                  <Heart className="h-2.5 w-2.5" /> {formatCount(post.engagement?.likes)}
                </span>
                <span className="inline-flex items-center gap-0.5">
                  <MessageCircle className="h-2.5 w-2.5" /> {formatCount(post.engagement?.comments)}
                </span>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-3">
      <div className="h-20 animate-pulse rounded-md bg-tru-slate-100" />
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="aspect-square animate-pulse rounded-md bg-tru-slate-100" />
        ))}
      </div>
    </div>
  );
}

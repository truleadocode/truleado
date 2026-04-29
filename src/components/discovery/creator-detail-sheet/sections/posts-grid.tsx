'use client';

import { Heart, MessageCircle, Eye } from 'lucide-react';
import { useFetchCreatorPosts, type DiscoveryCreator } from '../../hooks';
import { formatCount, proxiedImageSrc } from '../../primitives/tokens';
import { Section } from './section';

interface PostsGridProps {
  agencyId: string;
  creator: DiscoveryCreator;
}

export interface ICPost {
  pk?: string;
  media_id?: string;
  url?: string;
  caption?: string;
  media_url?: string;
  thumbnails?: { url?: string };
  image_versions?: { candidates?: Array<{ url: string; width: number; height: number }> };
  engagement?: { likes?: number; comments?: number; views?: number };
  taken_at?: number;
}

const SUPPORTED = new Set(['instagram', 'tiktok', 'youtube']);

export function PostsGrid({ agencyId, creator }: PostsGridProps) {
  const platform = creator.platform.toLowerCase();
  const supportsPosts = SUPPORTED.has(platform);

  const postsQuery = useFetchCreatorPosts({
    agencyId,
    platform: creator.platform,
    handle: creator.username,
    enabled: supportsPosts,
    count: platform === 'instagram' ? 12 : 30,
  });

  if (!supportsPosts) {
    return (
      <Section title="Recent posts">
        <div className="rounded-md border border-dashed border-tru-slate-300 bg-tru-slate-50 p-6 text-center text-sm text-tru-slate-500">
          Recent-posts data is only available on Instagram, TikTok, and YouTube.
        </div>
      </Section>
    );
  }

  const cacheHit = postsQuery.data?.cacheHit;
  const items = (postsQuery.data?.result?.items ?? []) as ICPost[];

  return (
    <Section
      title="Recent posts"
      description="Latest posts (1 credit per page; free if cached for this agency in the last 30 days)."
      rightSlot={
        cacheHit !== undefined ? (
          <span className="rounded-full bg-tru-slate-100 px-2 py-0.5 text-[10px] uppercase tracking-wider text-tru-slate-600">
            {cacheHit ? 'Cached' : 'Fresh'}
          </span>
        ) : null
      }
    >
      {postsQuery.isLoading ? (
        <SkeletonTiles />
      ) : postsQuery.isError ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Fetching posts failed: {String(postsQuery.error)}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-md border border-tru-border-soft p-6 text-center text-sm text-tru-slate-500">
          No posts returned.
        </div>
      ) : (
        <PostsTiles items={items} />
      )}
    </Section>
  );
}

function PostsTiles({ items }: { items: ICPost[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {items.map((post, i) => {
        const key = post.pk ?? post.media_id ?? String(i);
        const thumb =
          post.thumbnails?.url ?? post.image_versions?.candidates?.[0]?.url ?? post.media_url;
        return (
          <a
            key={key}
            href={post.url ?? '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="group block overflow-hidden rounded-md border border-tru-slate-200 bg-white transition-shadow hover:shadow-sm"
          >
            <div className="aspect-square w-full bg-tru-slate-100">
              {thumb ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={proxiedImageSrc(thumb)}
                  alt=""
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : null}
            </div>
            <div className="flex items-center gap-3 px-2 py-1.5 text-[11px] text-tru-slate-500">
              <span className="inline-flex items-center gap-1">
                <Heart className="h-3 w-3" /> {formatCount(post.engagement?.likes)}
              </span>
              <span className="inline-flex items-center gap-1">
                <MessageCircle className="h-3 w-3" /> {formatCount(post.engagement?.comments)}
              </span>
              {post.engagement?.views ? (
                <span className="inline-flex items-center gap-1">
                  <Eye className="h-3 w-3" /> {formatCount(post.engagement.views)}
                </span>
              ) : null}
            </div>
          </a>
        );
      })}
    </div>
  );
}

function SkeletonTiles() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="aspect-square animate-pulse rounded-md bg-tru-slate-100"
        />
      ))}
    </div>
  );
}


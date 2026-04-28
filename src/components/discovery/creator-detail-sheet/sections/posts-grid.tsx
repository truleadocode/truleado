'use client';

import { useEffect, useState } from 'react';
import { Loader2, Heart, MessageCircle, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFetchCreatorPosts, type DiscoveryCreator } from '../../hooks';
import { formatCount } from '../../primitives/tokens';
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

interface ICPostsResponse {
  credits_cost?: number;
  cacheHit?: boolean;
  result?: {
    num_results?: number;
    more_available?: boolean;
    next_token?: string | null;
    items?: ICPost[];
  };
}

const SUPPORTED = new Set(['instagram', 'tiktok', 'youtube']);

export function PostsGrid({ agencyId, creator }: PostsGridProps) {
  const fetchPosts = useFetchCreatorPosts();
  const [posts, setPosts] = useState<ICPost[]>([]);
  const [nextToken, setNextToken] = useState<string | null>(null);
  const [loadedOnce, setLoadedOnce] = useState(false);

  const platform = creator.platform.toLowerCase();
  const supportsPosts = SUPPORTED.has(platform);

  useEffect(() => {
    setPosts([]);
    setNextToken(null);
    setLoadedOnce(false);
  }, [creator.providerUserId]);

  if (!supportsPosts) {
    return (
      <Section title="Recent posts">
        <div className="rounded-md border border-dashed border-tru-slate-300 bg-tru-slate-50 p-6 text-center text-sm text-tru-slate-500">
          Recent-posts data is only available on Instagram, TikTok, and YouTube.
        </div>
      </Section>
    );
  }

  const load = (paginationToken?: string) => {
    fetchPosts.mutate(
      {
        agencyId,
        platform: creator.platform,
        handle: creator.username,
        count: platform === 'instagram' ? 12 : 30,
        paginationToken,
      },
      {
        onSuccess: (raw) => {
          const response = raw as ICPostsResponse;
          const items = response.result?.items ?? [];
          setPosts((prev) => (paginationToken ? [...prev, ...items] : items));
          setNextToken(response.result?.next_token ?? null);
          setLoadedOnce(true);
        },
      }
    );
  };

  return (
    <Section title="Recent posts" description="Latest 12 posts (1 credit per page).">
      {!loadedOnce && !fetchPosts.isPending ? (
        <div className="rounded-md border border-tru-border-soft bg-tru-slate-50 p-6 text-center text-sm">
          <Button onClick={() => load()} className="gap-2">
            Fetch posts
          </Button>
        </div>
      ) : fetchPosts.isPending && posts.length === 0 ? (
        <div className="flex items-center gap-2 text-xs text-tru-slate-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Fetching posts…
        </div>
      ) : fetchPosts.isError ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Fetching posts failed: {String(fetchPosts.error)}
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-md border border-tru-border-soft p-6 text-center text-sm text-tru-slate-500">
          No posts returned.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
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
                  className="group block overflow-hidden rounded-md border border-tru-slate-200 bg-white transition-shadow hover:shadow-sm"
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
          {nextToken ? (
            <div className="mt-4 text-center">
              <Button
                variant="ghost"
                onClick={() => load(nextToken)}
                disabled={fetchPosts.isPending}
                className="text-tru-blue-600"
              >
                {fetchPosts.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> Loading…
                  </>
                ) : (
                  'Load more posts (1 credit)'
                )}
              </Button>
            </div>
          ) : null}
        </>
      )}
    </Section>
  );
}

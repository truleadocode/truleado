'use client';

import { useMemo } from 'react';
import {
  parseAudienceData,
  parseInstagramEnrichment,
} from '@/components/discovery/enriched-data';
import { AudienceBlock } from '../blocks/audience-block';
import { DonutWithLegend } from '../charts/donut';
import { PostingHeatmap } from '../charts/posting-heatmap';
import { ScatterPlot } from '../charts/scatter-plot';
import { CardHeader } from '../layout/card-header';
import {
  ChipList,
  DescriptionList,
  Empty,
  MiniGrid,
  MiniStat,
  Pill,
} from '../layout/primitives';
import { ProfileHead, type KpiTile, type ProfileHeadTag } from '../layout/profile-head';
import { Card, CardGrid, ProfileShell } from '../layout/profile-shell';
import { SectionHeader } from '../layout/section-header';
import { formatDate, formatNum, formatPct } from '../format';

interface InstagramProfilePageProps {
  /** Raw IC enrichment payload from `creator_profiles.raw_data`. */
  rawData: unknown;
  /** Photo URL from the agency's profile metadata, when present. */
  pictureUrl?: string | null;
}

/**
 * Full per-platform Instagram profile page. Mirrors
 * `product-documentation/influencers.club/creator-profile/page-instagram.jsx`
 * section-for-section. Composes the layout primitives + AudienceBlock with
 * IG-specific Performance Overview (Content Mix donut + Reels stats +
 * Likes/Comments scatter + Posting Heatmap) and Recent Posts (top
 * performers grid + detailed feed).
 */
export function InstagramProfilePage({ rawData, pictureUrl }: InstagramProfilePageProps) {
  const ig = useMemo(() => parseInstagramEnrichment(rawData), [rawData]);
  const audience = useMemo(() => parseAudienceData(rawData, 'instagram'), [rawData]);

  // Top-level common fields the parser doesn't currently surface — we read
  // them through here for the identity dump rather than extending the
  // typed shape (these are display-only).
  const block = pluckIg(rawData);

  if (!ig.exists && !block) {
    return (
      <ProfileShell>
        <Empty>No Instagram enrichment data for this creator yet.</Empty>
      </ProfileShell>
    );
  }

  const username = (block?.username ?? '') as string;
  const fullName = (block?.full_name ?? username) as string;
  const userId = (block?.userid ?? null) as string | null;
  const accountType = block?.account_type as number | null | undefined;
  const isPrivate = !!block?.is_private;
  const isBusinessAccount = !!block?.is_business_account;
  const hasProfilePic = !!block?.has_profile_pic;
  const exists = ig.exists;
  const biography = (block?.biography ?? null) as string | null | { [k: string]: unknown };
  const linksInBio = (block?.links_in_bio ?? []) as Array<string | { url?: string }>;
  const locations = (block?.locations ?? []) as unknown[];
  const mostRecentPostDate = ig.mostRecentPostDate;

  // Posts derived metrics for the Content Mix donut.
  const posts = (block?.post_data ?? []) as IgPost[];
  const reelsCount = posts.filter(
    (p) => p.product_type === 'clips' || p.media_type === 2
  ).length;
  const carouselCount = posts.filter((p) => p.is_carousel).length;
  const photoCount = posts.length - reelsCount - carouselCount;

  // Top posts by likes, for the "Top Performing" grid.
  const topPosts = [...posts]
    .sort((a, b) => (b.engagement?.likes ?? 0) - (a.engagement?.likes ?? 0))
    .slice(0, 8);

  // Scatter chart points: likes vs comments per post.
  const scatterPoints = posts.map((p, i) => ({
    x: p.engagement?.likes ?? 0,
    y: p.engagement?.comments ?? 0,
    i,
  }));

  // Identity tags band.
  const rawTags: Array<ProfileHeadTag | null> = [
    ig.flags.isVerified ? { kind: 'good', label: 'Verified' } : null,
    isBusinessAccount ? { kind: 'accent', label: 'Business' } : null,
    accountType != null ? { label: `Account type ${accountType}` } : null,
    ig.flags.videoContentCreator ? { label: 'Video creator' } : null,
    ig.flags.streamer ? { label: 'Streamer' } : null,
    ig.flags.hasMerch ? { kind: 'good', label: 'Has merch' } : { label: 'No merch' },
    ig.flags.usesLinkInBio ? { label: 'Uses link-in-bio' } : { label: 'No link-in-bio' },
    ig.flags.promotesAffiliateLinks ? { kind: 'warn', label: 'Affiliate links' } : null,
  ];
  const tags: ProfileHeadTag[] = rawTags.filter((t): t is ProfileHeadTag => t !== null);

  const kpis: KpiTile[] = [
    {
      label: 'Followers',
      value: formatNum(ig.followerCount),
      sub: `${formatNum(ig.followingCount)} following`,
    },
    {
      label: 'Engagement Rate',
      value: formatPct(ig.engagementPercent ?? 0),
      sub: 'across last 12 posts',
    },
    {
      label: 'Avg Likes / Comments',
      value: `${formatNum(ig.avgLikes)} / ${formatNum(ig.avgComments)}`,
      sub: `Median ${formatNum(ig.likesMedian)} / ${formatNum(ig.commentsMedian)}`,
    },
    {
      label: 'Total Posts',
      value: formatNum(ig.mediaCount),
      sub: `Last post ${formatDate(mostRecentPostDate)}`,
    },
  ];

  const reels = (block?.reels ?? null) as
    | {
        avg_like_count?: number;
        avg_view_count?: number;
        median_like_count?: number;
        median_view_count?: number;
        comments_count?: number[];
      }
    | null;

  return (
    <ProfileShell>
      <ProfileHead
        platform="instagram"
        displayName={fullName}
        handle={username}
        pictureUrl={pictureUrl ?? null}
        isVerified={ig.flags.isVerified}
        bio={typeof biography === 'string' ? biography : null}
        platformUrl={`https://instagram.com/${username}`}
        kpis={kpis}
        tags={tags}
      />

      <div className="mt-8" />
      <SectionHeader
        title="Profile Snapshot"
        badge={userId ? `@${username} · ID ${userId}` : `@${username}`}
      />
      <CardGrid cols={2}>
        <Card>
          <CardHeader title="Identity & Account" />
          <DescriptionList
            rows={[
              ['Full name', fullName],
              ['Username', `@${username}`],
              ['User ID', userId ?? '—'],
              ['Account type', String(accountType ?? '—')],
              ['Is private', String(isPrivate)],
              ['Is verified', String(ig.flags.isVerified)],
              ['Is business', String(isBusinessAccount)],
              ['Has profile pic', String(hasProfilePic)],
              ['Exists', String(exists)],
              ['Languages', ig.languages.join(', ') || '—'],
            ]}
          />
        </Card>
        <Card>
          <CardHeader title="Bio & Links" />
          <div className="text-[12.5px] leading-relaxed text-cp-ink-2">
            {biographyText(biography) ?? (
              <span className="text-cp-ink-4">No biography</span>
            )}
          </div>
          <div className="mt-3">
            <SubLabel>Links in bio</SubLabel>
            {linksInBio.length > 0 ? (
              <ul className="space-y-1">
                {linksInBio.map((l, i) => {
                  const href =
                    typeof l === 'string' ? l : l?.url ?? JSON.stringify(l);
                  return (
                    <li key={i}>
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block break-all font-mono text-[11px] text-cp-accent-3 hover:underline"
                      >
                        {href}
                      </a>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <Empty>No links in bio</Empty>
            )}
          </div>
        </Card>
      </CardGrid>

      <div className="mt-8" />
      <SectionHeader title="Performance Overview" />
      <CardGrid cols={2}>
        <Card>
          <CardHeader
            title="Content Mix"
            description="Last 12 posts breakdown"
          />
          <DonutWithLegend
            data={[
              { value: reelsCount, label: 'Reels' },
              { value: carouselCount, label: 'Carousels' },
              { value: photoCount, label: 'Photos' },
            ]}
            colors={['#dd2a7b', '#8134af', '#feda77']}
            footer={
              <span>
                Reels share:{' '}
                <span className="font-mono text-cp-ink">
                  {ig.reelsPercentLast12 ?? 0}%
                </span>
              </span>
            }
          />
        </Card>

        {reels ? (
          <Card>
            <CardHeader title="Reels Performance" description="Aggregate reel metrics" />
            <MiniGrid cols={2}>
              <MiniStat label="Avg Likes" value={formatNum(reels.avg_like_count ?? null)} />
              <MiniStat label="Avg Views" value={formatNum(reels.avg_view_count ?? null)} />
              <MiniStat label="Median Likes" value={formatNum(reels.median_like_count ?? null)} />
              <MiniStat label="Median Views" value={formatNum(reels.median_view_count ?? null)} />
            </MiniGrid>
            {reels.comments_count?.length ? (
              <div className="mt-3 text-[11px] text-cp-ink-3">
                Comments samples:{' '}
                <span className="font-mono text-cp-ink">
                  {reels.comments_count.join(', ')}
                </span>
              </div>
            ) : null}
          </Card>
        ) : null}

        {scatterPoints.length > 0 ? (
          <Card span={2}>
            <CardHeader
              title="Engagement by Post"
              description="Likes vs comments scatter for last 12 posts"
            />
            <ScatterPlot
              posts={scatterPoints}
              xKey="x"
              yKey="y"
              xLabel="Likes"
              yLabel="Comments"
              height={240}
            />
          </Card>
        ) : null}

        {posts.length > 0 ? (
          <Card span={2}>
            <CardHeader
              title="Posting Cadence"
              description="Hour × Day-of-week heatmap"
              rightSlot={<Pill>{`${posts.length} posts`}</Pill>}
            />
            <PostingHeatmap
              posts={posts.map((p) => ({ created_at: p.created_at }))}
            />
          </Card>
        ) : null}
      </CardGrid>

      <div className="mt-8" />
      <SectionHeader
        title="Recent Posts"
        badge={`${posts.length} posts`}
      />
      <Card>
        <CardHeader title="Top Performing" description="Sorted by likes" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {topPosts.map((p, i) => (
            <PostCard key={p.post_id} post={p} rank={i + 1} />
          ))}
        </div>
      </Card>

      <div className="mt-3" />
      <Card>
        <CardHeader
          title="Post Details"
          description="All fields per post — caption, tags, media, engagement"
        />
        <div className="flex flex-col gap-2.5">
          {posts.slice(0, 8).map((p) => (
            <PostRow key={p.post_id} post={p} />
          ))}
        </div>
      </Card>

      <div className="mt-8" />
      <SectionHeader title="Tags & Discovery" />
      <CardGrid cols={2}>
        <Card>
          <CardHeader
            title="Tagged Users"
            rightSlot={<Pill>{String(ig.taggedAccounts.length)}</Pill>}
          />
          {ig.taggedAccounts.length > 0 ? (
            <ChipList
              items={ig.taggedAccounts.map((t) => `@${t.username}`)}
              max={20}
              hrefFor={(label) =>
                `https://instagram.com/${label.replace(/^@/, '')}`
              }
            />
          ) : (
            <Empty>No tagged users</Empty>
          )}
        </Card>
        <Card>
          <CardHeader
            title="Hashtags Used"
            rightSlot={<Pill>{String(ig.hashtagsCount.length)}</Pill>}
          />
          {ig.hashtagsCount.length > 0 ? (
            <ChipList
              items={ig.hashtagsCount.map((h) => ({
                label: h.hashtag,
                count: h.count,
              }))}
              hashPrefix
            />
          ) : (
            <Empty>No hashtags found</Empty>
          )}
          <div className="mt-2 text-[11px] text-cp-ink-3">
            Locations tagged:{' '}
            <span className="font-mono text-cp-ink">{locations.length}</span>
          </div>
        </Card>
      </CardGrid>

      <div className="mt-8" />
      <SectionHeader title="Audience Intelligence" />
      <AudienceBlock
        audience={audience}
        sourceLabel="Followers"
        hrefForUser={(u) => `https://instagram.com/${u}`}
      />
    </ProfileShell>
  );
}

/* ───────────────────────────────────────────── */
/* Helpers + sub-components                      */
/* ───────────────────────────────────────────── */

interface IgPost {
  post_id: string;
  created_at?: string;
  caption?: string | null;
  hashtags?: string[];
  post_url?: string;
  media?: Array<{ media_id: string; type: string; url: string }>;
  is_carousel?: boolean;
  tagged_users?: string[];
  engagement?: { likes?: number; comments?: number; view_count?: number };
  media_type?: number;
  product_type?: string;
}

function pluckIg(rawData: unknown): Record<string, unknown> | null {
  if (!rawData || typeof rawData !== 'object') return null;
  const r = rawData as Record<string, unknown>;
  if (r.instagram && typeof r.instagram === 'object') {
    return r.instagram as Record<string, unknown>;
  }
  const result = r.result;
  if (result && typeof result === 'object') {
    const ig = (result as Record<string, unknown>).instagram;
    if (ig && typeof ig === 'object') return ig as Record<string, unknown>;
  }
  return null;
}

function biographyText(
  bio: string | null | { [k: string]: unknown }
): string | null {
  if (typeof bio === 'string') return bio;
  if (bio && typeof bio === 'object') {
    return (
      Object.values(bio)
        .filter((v): v is string => typeof v === 'string')
        .join(' · ') || null
    );
  }
  return null;
}

function SubLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-1.5 text-[10.5px] font-medium uppercase tracking-[0.07em] text-cp-ink-3">
      {children}
    </div>
  );
}

function PostCard({ post, rank }: { post: IgPost; rank: number }) {
  const cover = post.media?.find((m) => m.type === 'image')?.url ?? null;
  const kind =
    post.product_type === 'clips' ? 'Reel' : post.is_carousel ? 'Carousel' : 'Photo';
  return (
    <a
      href={post.post_url ?? '#'}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative block overflow-hidden rounded-md border border-cp-line bg-cp-surface hover:shadow-sm"
    >
      <div className="aspect-square bg-cp-surface-2">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt=""
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[11px] text-cp-ink-4">
            post {rank}
          </div>
        )}
      </div>
      <div className="absolute right-1 top-1 rounded-full bg-cp-ink/85 px-1.5 py-0.5 font-mono text-[9px] font-bold text-white">
        #{rank}
      </div>
      <div className="absolute left-1 top-1 rounded bg-cp-surface/90 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-cp-ink-2">
        {kind}
      </div>
      <div className="flex items-center gap-3 px-2.5 py-1.5 font-mono text-[10.5px] text-cp-ink-3">
        <span>♥ {formatNum(post.engagement?.likes)}</span>
        <span>💬 {formatNum(post.engagement?.comments)}</span>
      </div>
    </a>
  );
}

function PostRow({ post }: { post: IgPost }) {
  return (
    <div className="rounded-md border border-cp-line bg-cp-surface-2 p-3">
      <div className="mb-1.5 flex items-baseline justify-between gap-3 font-mono text-[10.5px] text-cp-ink-3">
        <span>
          {formatDate(post.created_at ?? null)} · {post.created_at?.slice(11, 16)} · ID{' '}
          {post.post_id?.slice(0, 12)}…
        </span>
        <span>
          {post.is_carousel
            ? 'CAROUSEL'
            : post.product_type === 'clips'
            ? 'REEL'
            : 'POST'}{' '}
          · type {post.media_type}
        </span>
      </div>
      <div className="mb-2 text-[12.5px] leading-relaxed text-cp-ink">
        {post.caption || <span className="text-cp-ink-4">No caption</span>}
      </div>
      <div className="flex flex-wrap items-center gap-3.5 font-mono text-[10.5px] text-cp-ink-3">
        <span>♥ {formatNum(post.engagement?.likes)}</span>
        <span>💬 {formatNum(post.engagement?.comments)}</span>
        <span>🖼 {post.media?.length ?? 0} media</span>
        {(post.hashtags?.length ?? 0) > 0 ? (
          <span>#{post.hashtags?.length}</span>
        ) : null}
        {(post.tagged_users?.length ?? 0) > 0 ? (
          <span>@{post.tagged_users?.length}</span>
        ) : null}
        <a
          href={post.post_url}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto text-cp-accent-3 hover:underline"
        >
          ↗ open
        </a>
      </div>
    </div>
  );
}

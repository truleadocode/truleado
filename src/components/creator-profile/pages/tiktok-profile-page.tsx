'use client';

import { useMemo } from 'react';
import {
  parseAudienceData,
  parseTikTokEnrichment,
} from '@/components/discovery/enriched-data';
import { AudienceBlock } from '../blocks/audience-block';
import { PostingHeatmap } from '../charts/posting-heatmap';
import { ScatterPlot } from '../charts/scatter-plot';
import { Sparkline } from '../charts/sparkline';
import { CardHeader } from '../layout/card-header';
import {
  ChipList,
  DescriptionList,
  Empty,
  MiniGrid,
  MiniStat,
  Pill,
} from '../layout/primitives';
import {
  ProfileHead,
  type KpiTile,
  type ProfileHeadTag,
} from '../layout/profile-head';
import { Card, CardGrid, ProfileShell } from '../layout/profile-shell';
import { SectionHeader } from '../layout/section-header';
import { formatDate, formatNum, formatPct } from '../format';

interface TikTokProfilePageProps {
  rawData: unknown;
  pictureUrl?: string | null;
}

/**
 * Full per-platform TikTok profile page. Mirrors
 * `product-documentation/influencers.club/creator-profile/page-tiktok.jsx`:
 * Profile Snapshot (identity dump + bio/niche/brands), Engagement Performance
 * (lifetime aggregates, per-post averages, follower-growth sparkline,
 * saves/reach trends, views-vs-likes scatter, posting heatmap), Recent
 * Videos (top 8 + detailed feed with sound + share + download counts),
 * Tags & Discovery (hashtags + tagged + challenges + links), Audience
 * Intelligence (followers only — likers + commenters return empty_audience).
 */
export function TikTokProfilePage({ rawData, pictureUrl }: TikTokProfilePageProps) {
  const tt = useMemo(() => parseTikTokEnrichment(rawData), [rawData]);
  const audience = useMemo(() => parseAudienceData(rawData, 'tiktok'), [rawData]);
  const block = pluckTt(rawData);

  if (!tt.exists && !block) {
    return (
      <ProfileShell>
        <Empty>No TikTok enrichment data for this creator yet.</Empty>
      </ProfileShell>
    );
  }

  const username = (block?.username ?? '') as string;
  const fullName = (block?.full_name ?? username) as string;
  const userId = (block?.user_id ?? null) as string | null;
  const secUserId = (block?.sec_user_id ?? null) as string | null;
  const biography = (block?.biography ?? null) as string | null;
  const languageCode = (block?.language_code ?? []) as string[];
  const isAd = !!block?.is_ad;
  const ttSeller = (block?.tt_seller ?? null) as Record<string, unknown> | null;
  const duetSetting = (block?.duet_setting ?? null) as string | null;
  const paidPartnership = !!block?.paid_partnership;
  const mentionStatus = (block?.mention_status ?? null) as
    | Record<string, unknown>
    | null;
  const category = (block?.category ?? null) as Record<string, unknown> | null;
  const linksInBio = (block?.links_in_bio ?? []) as Array<string | { url?: string }>;
  const challengesList = (block?.challenges_list ?? []) as Array<
    string | { name?: string }
  >;
  const taggedList = (block?.tagged ?? []) as Array<string | { username?: string }>;
  const postingFrequency = (block?.posting_frequency ?? null) as number | null;

  // Posts (raw) for scatter / heatmap / detailed feed.
  const posts = (block?.post_data ?? []) as TtPost[];
  const scatterPoints = posts.map((p) => ({
    views: p.engagement?.view_count ?? 0,
    likes: p.engagement?.like_count ?? 0,
  }));

  // Top videos by view count.
  const topVideos = [...posts]
    .sort(
      (a, b) =>
        (Number(b.engagement?.view_count) || 0) -
        (Number(a.engagement?.view_count) || 0)
    )
    .slice(0, 8);

  // Follower-growth sparkline points: oldest → newest. Append `0` for `now`.
  const growthData: Array<{ p: string; v: number }> = [
    ...tt.followerGrowthSeries.map((g) => ({
      p: `${g.monthsAgo}m`,
      v: g.growthPercent,
    })),
    { p: 'now', v: 0 },
  ];
  const growth12m = tt.followerGrowthSeries.find((g) => g.monthsAgo === 12)?.growthPercent;

  const rawTags: Array<ProfileHeadTag | null> = [
    tt.flags.isVerified ? { kind: 'good', label: 'Verified' } : null,
    isAd ? { kind: 'warn', label: 'Runs ads' } : null,
    tt.flags.hasPaidPartnership ? { kind: 'warn', label: 'Paid partnerships' } : null,
    tt.flags.isCommerce ? { label: 'Commerce' } : null,
    ttSeller && Object.keys(ttSeller).length > 0 ? { label: 'TT Seller' } : null,
    duetSetting != null ? { label: `Duet: ${duetSetting}` } : null,
    tt.flags.isPrivate ? { kind: 'bad', label: 'Private' } : null,
    tt.flags.hasMerch ? { kind: 'good', label: 'Has merch' } : { label: 'No merch' },
    tt.flags.streamer ? { label: 'Streamer' } : null,
  ];
  const tags = rawTags.filter((t): t is ProfileHeadTag => t !== null);

  const kpis: KpiTile[] = [
    {
      label: 'Followers',
      value: formatNum(tt.followerCount),
      sub: `${formatNum(tt.followingCount)} following · ${formatNum(tt.videoCount)} videos`,
    },
    {
      label: 'Engagement Rate',
      value: formatPct(tt.engagementPercent ?? 0, 2),
      sub: 'lifetime average',
    },
    {
      label: 'Total Likes',
      value: formatNum(tt.totals.likes),
      sub: `${formatNum(tt.totals.shares)} shares · ${formatNum(tt.totals.saves)} saves`,
    },
    {
      label: 'Reach Score',
      value: formatNum(tt.reachScore),
      sub: `Avg views ${formatNum(tt.averages.plays)}`,
    },
  ];

  return (
    <ProfileShell>
      <ProfileHead
        platform="tiktok"
        displayName={fullName}
        handle={username}
        pictureUrl={pictureUrl ?? null}
        isVerified={tt.flags.isVerified}
        bio={biography}
        handleSuffix={tt.region ?? null}
        platformUrl={`https://tiktok.com/@${username.replace(/^@/, '')}`}
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
            single
            rows={[
              ['Full name', fullName],
              ['Username', `@${username}`],
              ['User ID', userId ?? '—'],
              ['Sec User ID', secUserId ? secUserId.slice(0, 28) + '…' : '—'],
              ['Region', tt.region ?? '—'],
              ['Languages', languageCode.join(', ') || '—'],
              ['Verified', String(tt.flags.isVerified)],
              ['Private', String(tt.flags.isPrivate)],
              ['Is ad', String(isAd)],
              ['Commerce', String(tt.flags.isCommerce)],
              ['Duet enabled', String(duetSetting)],
              ['Paid partnership', String(paidPartnership)],
              ['Promotes affiliate', String(tt.flags.promotesAffiliateLinks)],
              ['Uses link in bio', String(tt.flags.usesLinkInBio)],
              ['Has merch', String(tt.flags.hasMerch)],
              ['Streamer', String(tt.flags.streamer)],
              ['Most recent post', formatDate(tt.mostRecentPostDate)],
              [
                'Posting freq',
                postingFrequency != null ? `${postingFrequency} / mo` : '—',
              ],
              [
                'Posting freq (recent)',
                tt.postingFrequencyRecentMonths != null
                  ? `${tt.postingFrequencyRecentMonths} / mo`
                  : '—',
              ],
            ]}
          />
        </Card>

        <Card>
          <CardHeader title="Bio & Categorization" />
          <div className="text-[12.5px] leading-relaxed text-cp-ink-2">
            {biography || <span className="text-cp-ink-4">No biography</span>}
          </div>
          <div className="mt-3 space-y-3">
            {(tt.niches.length > 0 || tt.niceSubclasses.length > 0) ? (
              <div>
                <SubLabel>Niche classification</SubLabel>
                <ChipList items={[...tt.niches, ...tt.niceSubclasses]} />
              </div>
            ) : null}
            <div>
              <SubLabel>Category</SubLabel>
              {category && Object.keys(category).length > 0 ? (
                <ChipList
                  items={Object.entries(category).map(([k, v]) => ({
                    label: k,
                    accent: String(v),
                  }))}
                />
              ) : (
                <ChipList items={['none']} />
              )}
            </div>
            <div>
              <SubLabel>Brands found</SubLabel>
              {tt.brandsFound.length > 0 ? (
                <ChipList items={tt.brandsFound} />
              ) : (
                <Empty>None</Empty>
              )}
            </div>
            {mentionStatus && Object.keys(mentionStatus).length > 0 ? (
              <div>
                <SubLabel>Mention status</SubLabel>
                <ChipList
                  items={Object.entries(mentionStatus).map(([k, v]) => ({
                    label: k,
                    accent: String(v),
                  }))}
                />
              </div>
            ) : null}
          </div>
        </Card>
      </CardGrid>

      <div className="mt-8" />
      <SectionHeader title="Engagement Performance" />
      <CardGrid cols={2}>
        <Card>
          <CardHeader
            title="Lifetime Aggregate"
            description={
              tt.videoCount != null
                ? `Cumulative across all ${formatNum(tt.videoCount)} videos`
                : undefined
            }
          />
          <MiniGrid cols={2}>
            <MiniStat label="Total Likes" value={formatNum(tt.totals.likes)} />
            <MiniStat label="Total Shares" value={formatNum(tt.totals.shares)} />
            <MiniStat label="Total Saves" value={formatNum(tt.totals.saves)} />
            <MiniStat label="Reach Score" value={formatNum(tt.reachScore)} />
          </MiniGrid>
        </Card>

        <Card>
          <CardHeader title="Per-Post Averages" description="Mean & median values" />
          <DescriptionList
            single
            rows={[
              ['Avg likes', formatNum(tt.averages.likes)],
              ['Median likes', formatNum(tt.medians.likes)],
              ['Avg comments', formatNum(tt.averages.comments)],
              ['Median comments', formatNum(tt.medians.comments)],
              ['Avg plays', formatNum(tt.averages.plays)],
              ['Median plays', formatNum(tt.medians.plays)],
              ['Median shares', formatNum(tt.medians.shares)],
              ['Median saves', formatNum(tt.medians.saves)],
              [
                'Avg duration',
                tt.averages.duration != null
                  ? `${tt.averages.duration.toFixed(1)}s`
                  : '—',
              ],
            ]}
          />
        </Card>

        {growthData.length > 1 ? (
          <Card span={2}>
            <CardHeader
              title="Follower Growth"
              description="Quarter-over-quarter % change"
              rightSlot={
                growth12m != null ? (
                  <Pill>{`${growth12m.toFixed(2)}% YoY`}</Pill>
                ) : null
              }
            />
            <div className="grid grid-cols-1 items-center gap-6 lg:grid-cols-[1fr_220px]">
              <Sparkline
                values={growthData.map((g) => g.v)}
                height={100}
                color={growthData[0].v < 0 ? '#c43050' : '#2f6b3a'}
              />
              <DescriptionList
                single
                rows={growthData.map((g) => [
                  `${g.p} ago`,
                  <span
                    key={g.p}
                    className={g.v < 0 ? 'text-cp-bad' : 'text-cp-good'}
                  >
                    {g.v > 0 ? '+' : ''}
                    {g.v.toFixed(2)}%
                  </span>,
                ])}
              />
            </div>
          </Card>
        ) : null}

        {(tt.savesOverTime.length > 0 || tt.reachOverTime.length > 0) ? (
          <Card span={2}>
            <CardHeader
              title="Saves & Reach Trend"
              description="Saves count and reach score across recent posts"
            />
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div>
                <SubLabel>Saves per post (recent)</SubLabel>
                <Sparkline
                  values={tt.savesOverTime.slice(0, 30).reverse()}
                  height={80}
                  color="#2f6b3a"
                />
              </div>
              <div>
                <SubLabel>Reach score per post (recent)</SubLabel>
                <Sparkline
                  values={tt.reachOverTime.slice(0, 30).reverse()}
                  height={80}
                  color="#FE2C55"
                />
              </div>
            </div>
          </Card>
        ) : null}

        {scatterPoints.length > 0 ? (
          <Card span={2}>
            <CardHeader
              title="Views vs Likes"
              description="Engagement scatter for recent videos"
            />
            <ScatterPlot
              posts={scatterPoints}
              xKey="views"
              yKey="likes"
              xLabel="Views"
              yLabel="Likes"
              height={240}
            />
          </Card>
        ) : null}

        {posts.length > 0 ? (
          <Card span={2}>
            <CardHeader title="Posting Heatmap" description="When videos get published" />
            <PostingHeatmap
              posts={posts.map((p) => ({ created_at: p.created_at }))}
            />
          </Card>
        ) : null}
      </CardGrid>

      <div className="mt-8" />
      <SectionHeader
        title="Recent Videos"
        badge={`${posts.length} videos`}
      />
      <Card>
        <CardHeader title="Top Videos" description="Sorted by view count" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {topVideos.map((p, i) => (
            <VideoCard key={p.post_id} post={p} rank={i + 1} />
          ))}
        </div>
      </Card>

      <div className="mt-3" />
      <Card>
        <CardHeader
          title="Video Details"
          description="Caption, sound, hashtags & engagement"
        />
        <div className="flex flex-col gap-2.5">
          {posts.slice(0, 8).map((p) => (
            <VideoRow key={p.post_id} post={p} />
          ))}
        </div>
      </Card>

      <div className="mt-8" />
      <SectionHeader title="Tags & Discovery" />
      <CardGrid cols={2}>
        <Card>
          <CardHeader
            title="Hashtags Used"
            rightSlot={<Pill>{`${tt.hashtags.length} unique`}</Pill>}
          />
          {tt.hashtags.length > 0 ? (
            <ChipList items={tt.hashtags} max={30} hashPrefix />
          ) : (
            <Empty>No hashtags found</Empty>
          )}
        </Card>
        <Card>
          <CardHeader title="Tagged & Challenges" />
          <div className="space-y-3">
            <div>
              <SubLabel>Tagged users ({taggedList.length})</SubLabel>
              {taggedList.length > 0 ? (
                <ChipList
                  items={taggedList.map((t) =>
                    typeof t === 'string' ? t : `@${t.username ?? '?'}`
                  )}
                  max={20}
                />
              ) : (
                <Empty>None</Empty>
              )}
            </div>
            <div>
              <SubLabel>Challenges ({challengesList.length})</SubLabel>
              {challengesList.length > 0 ? (
                <ChipList
                  items={challengesList.map((c) =>
                    typeof c === 'string' ? c : c.name ?? '?'
                  )}
                  max={20}
                />
              ) : (
                <Empty>None</Empty>
              )}
            </div>
            <div>
              <SubLabel>Links in bio ({linksInBio.length})</SubLabel>
              {linksInBio.length > 0 ? (
                <ul className="space-y-1">
                  {linksInBio.map((l, i) => {
                    const href = typeof l === 'string' ? l : l?.url ?? '';
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
                <Empty>None</Empty>
              )}
            </div>
          </div>
        </Card>
      </CardGrid>

      <div className="mt-8" />
      <SectionHeader title="Audience Intelligence" />
      <AudienceBlock
        audience={audience}
        sourceLabel="Followers"
        hrefForUser={(u) => `https://tiktok.com/@${u}`}
      />
    </ProfileShell>
  );
}

/* ───────────────────────────────────────────── */
/* Helpers + sub-components                      */
/* ───────────────────────────────────────────── */

interface TtPost {
  post_id: string;
  created_at?: string;
  caption?: string | null;
  hashtags?: string[];
  post_url?: string;
  media?: { media_id?: string; type?: string; url?: string; video_duration?: number };
  mentions?: string[];
  engagement?: {
    like_count?: number;
    comment_count?: number;
    view_count?: number;
    share_count?: number;
    download_count?: number;
  };
  sound?: { sound_name?: string; sound_url?: string };
}

function pluckTt(rawData: unknown): Record<string, unknown> | null {
  if (!rawData || typeof rawData !== 'object') return null;
  const r = rawData as Record<string, unknown>;
  if (r.tiktok && typeof r.tiktok === 'object') {
    return r.tiktok as Record<string, unknown>;
  }
  const result = r.result;
  if (result && typeof result === 'object') {
    const tt = (result as Record<string, unknown>).tiktok;
    if (tt && typeof tt === 'object') return tt as Record<string, unknown>;
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

function VideoCard({ post, rank }: { post: TtPost; rank: number }) {
  return (
    <a
      href={post.post_url ?? '#'}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative block overflow-hidden rounded-md border border-cp-line bg-cp-surface hover:shadow-sm"
    >
      <div className="aspect-[9/16] flex items-center justify-center bg-gradient-to-br from-[#25F4EE]/30 via-cp-surface-2 to-[#FE2C55]/30">
        <div className="font-mono text-[11px] text-cp-ink-3">video {rank}</div>
      </div>
      <div className="absolute right-1 top-1 rounded-full bg-cp-ink/85 px-1.5 py-0.5 font-mono text-[9px] font-bold text-white">
        #{rank}
      </div>
      <div className="absolute left-1 top-1 rounded bg-cp-surface/90 px-1.5 py-0.5 font-mono text-[9px] text-cp-ink-2">
        {post.media?.video_duration ? `${post.media.video_duration}s` : 'CLIP'}
      </div>
      <div className="flex items-center gap-3 px-2.5 py-1.5 font-mono text-[10.5px] text-cp-ink-3">
        <span>▶ {formatNum(post.engagement?.view_count)}</span>
        <span>♥ {formatNum(post.engagement?.like_count)}</span>
      </div>
    </a>
  );
}

function VideoRow({ post }: { post: TtPost }) {
  return (
    <div className="rounded-md border border-cp-line bg-cp-surface-2 p-3">
      <div className="mb-1.5 flex items-baseline justify-between gap-3 font-mono text-[10.5px] text-cp-ink-3">
        <span>
          {formatDate(post.created_at ?? null)} · {post.created_at?.slice(11, 16)} ·{' '}
          {post.media?.video_duration ? `${post.media.video_duration}s` : '—'}
        </span>
        <span>ID {post.post_id?.slice(0, 12)}…</span>
      </div>
      <div className="mb-2 text-[12.5px] leading-relaxed text-cp-ink">
        {post.caption || <span className="text-cp-ink-4">No caption</span>}
      </div>
      {post.sound?.sound_name ? (
        <div className="mb-1.5 text-[11px] text-cp-ink-3 truncate" title={post.sound.sound_name}>
          ♫ {post.sound.sound_name}
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-3.5 font-mono text-[10.5px] text-cp-ink-3">
        <span>▶ {formatNum(post.engagement?.view_count)}</span>
        <span>♥ {formatNum(post.engagement?.like_count)}</span>
        <span>💬 {formatNum(post.engagement?.comment_count)}</span>
        <span>↗ {formatNum(post.engagement?.share_count)}</span>
        <span>⬇ {formatNum(post.engagement?.download_count)}</span>
        {(post.hashtags?.length ?? 0) > 0 ? <span>#{post.hashtags?.length}</span> : null}
        {(post.mentions?.length ?? 0) > 0 ? <span>@{post.mentions?.length}</span> : null}
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

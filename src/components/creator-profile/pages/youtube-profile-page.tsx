'use client';

import { useMemo } from 'react';
import {
  parseAudienceData,
  parseYouTubeEnrichment,
} from '@/components/discovery/enriched-data';
import { AudienceBlock } from '../blocks/audience-block';
import { DonutWithLegend } from '../charts/donut';
import { Sparkline } from '../charts/sparkline';
import { YearMonthCalendar } from '../charts/year-month-calendar';
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
import { fmtDuration, formatDate, formatNum, formatPct } from '../format';

interface YouTubeProfilePageProps {
  rawData: unknown;
  pictureUrl?: string | null;
}

/**
 * Full per-platform YouTube profile page. Mirrors
 * `product-documentation/influencers.club/creator-profile/page-youtube.jsx`
 * — Channel Snapshot (info + description + niches/keywords/topics/emails),
 * Performance (long-vs-shorts donut + format-specific ER + view stats +
 * cadence + posts-per-month YEAR×MONTH calendar + sparkline of recent
 * views), Top Videos & Catalog (top performers grid + detailed feed with
 * thumbnails), Discovery (categories / topics / hashtags), Audience.
 */
export function YouTubeProfilePage({ rawData, pictureUrl }: YouTubeProfilePageProps) {
  const yt = useMemo(() => parseYouTubeEnrichment(rawData), [rawData]);
  const audience = useMemo(() => parseAudienceData(rawData, 'youtube'), [rawData]);
  const block = pluckYt(rawData);

  if (!yt.exists && !block) {
    return (
      <ProfileShell>
        <Empty>No YouTube enrichment data for this creator yet.</Empty>
      </ProfileShell>
    );
  }

  const customUrl = (block?.custom_url ?? '') as string;
  const channelId = (block?.id ?? null) as string | null;
  const title = (block?.title ?? customUrl) as string;
  const firstName = (block?.first_name ?? null) as string | null;
  const description = (block?.description ?? null) as string | null;
  const speakingLanguage = (block?.speaking_language ?? null) as string | null;
  const privacyStatus = (block?.privacy_status ?? null) as string | null;
  const trailerId = (block?.unsubscribed_trailer_id ?? null) as string | null;
  const playlistId = (block?.related_playlist_id ?? null) as string | null;
  const moderateComments = !!block?.moderate_comments;
  const niceClass = (block?.niche_class ?? null) as
    | Record<string, unknown>
    | null;
  const videoHashtags = (block?.video_hashtags ?? []) as unknown[];

  // Engagement-by-format extras live on the raw block.
  const erLong = (block?.engagement_percent_long ?? null) as number | null;
  const erShorts = (block?.engagement_percent_shorts ?? null) as number | null;
  const elvLong = (block?.engagement_by_likes_and_views_long ?? null) as number | null;
  const elvShorts = (block?.engagement_by_likes_and_views_shorts ?? null) as number | null;
  const ecvLong = (block?.engagement_by_comments_and_views_long ?? null) as number | null;
  const ecvShorts = (block?.engagement_by_comments_and_views_shorts ?? null) as number | null;
  const evsLong = (block?.engagement_by_views_and_subs_long ?? null) as number | null;
  const evsShorts = (block?.engagement_by_views_and_subs_shorts ?? null) as number | null;
  const totalCommentsLast50 = (block?.total_comments_last_50 ?? null) as number | null;
  const leastViews = (block?.least_views ?? null) as number | null;
  const hashtagsCount = (block?.hashtags_count ?? []) as Array<{
    name?: string;
    count?: number;
  }>;

  // Long-form vs Shorts count (derived from post duration).
  const posts = (block?.post_data ?? []) as YtPost[];
  const longCount = posts.filter((p) => durationSeconds(p.media?.duration) > 60).length;
  const shortsCount = posts.length - longCount;

  // Top videos by view count.
  const topVideos = [...posts]
    .sort(
      (a, b) =>
        (Number(b.engagement?.view_count) || 0) -
        (Number(a.engagement?.view_count) || 0)
    )
    .slice(0, 8);

  // Sparkline of recent views (reverse to show oldest → newest).
  const recentViews = posts
    .map((p) => Number(p.engagement?.view_count) || 0)
    .reverse();

  // Identity tags.
  const rawTags: Array<ProfileHeadTag | null> = [
    yt.flags.isVerified ? { kind: 'good', label: 'Verified' } : null,
    yt.flags.isMonetizationEnabled ? { kind: 'good', label: 'Monetized' } : null,
    yt.flags.hasShorts ? { label: 'Shorts' } : null,
    yt.flags.hasCommunityPosts ? { label: 'Community posts' } : null,
    yt.flags.streamer ? { label: 'Streamer' } : null,
    yt.flags.madeForKids ? { kind: 'warn', label: 'Made for kids' } : null,
    moderateComments ? { label: 'Moderates comments' } : null,
    yt.flags.hasPaidPartnership ? { kind: 'warn', label: 'Paid partnership' } : null,
    privacyStatus ? { label: `Privacy: ${privacyStatus}` } : null,
  ];
  const tags = rawTags.filter((t): t is ProfileHeadTag => t !== null);

  const incomeMin = (yt.income as { min?: number } | null)?.min ?? null;
  const incomeMax = (yt.income as { max?: number } | null)?.max ?? null;
  const incomeCurrency = ((yt.income as { currency?: string } | null)?.currency ??
    'USD') as string;

  const kpis: KpiTile[] = [
    {
      label: 'Subscribers',
      value: formatNum(yt.subscriberCount),
      sub: `${formatNum(yt.videoCount)} videos · ${formatNum(yt.viewCount)} total views`,
    },
    {
      label: 'Engagement Rate',
      value: formatPct(yt.engagement.overall ?? 0, 2),
      sub: `Long ${erLong ?? '—'}% · Shorts ${erShorts ?? '—'}%`,
    },
    {
      label: 'Avg Views',
      value: formatNum(yt.views.avg),
      sub: `Long ${formatNum(yt.views.avgLong)} · Shorts ${formatNum(yt.views.avgShorts)}`,
    },
    {
      label: 'Est. Monthly Income',
      value:
        incomeMin != null || incomeMax != null
          ? `$${formatNum(incomeMin)}–${formatNum(incomeMax)}`
          : '—',
      sub: incomeCurrency,
    },
  ];

  return (
    <ProfileShell>
      <ProfileHead
        platform="youtube"
        displayName={title}
        handle={customUrl.replace(/^@/, '')}
        pictureUrl={pictureUrl ?? null}
        isVerified={yt.flags.isVerified}
        bio={description}
        handleSuffix={firstName ?? null}
        platformUrl={`https://youtube.com/${customUrl.startsWith('@') ? customUrl : '@' + customUrl}`}
        kpis={kpis}
        tags={tags}
      />

      <div className="mt-8" />
      <SectionHeader
        title="Channel Snapshot"
        badge={channelId ? `${customUrl} · ID ${channelId}` : customUrl}
      />
      <CardGrid cols={2}>
        <Card>
          <CardHeader title="Channel Info" />
          <DescriptionList
            single
            rows={[
              ['Title', title],
              ['First name', firstName ?? '—'],
              ['Custom URL', customUrl],
              ['Channel ID', channelId ?? '—'],
              ['Country', yt.country ?? '—'],
              ['Language', speakingLanguage ?? '—'],
              ['Published', formatDate(yt.publishedAt)],
              ['Privacy', privacyStatus ?? '—'],
              ['Made for kids', String(yt.flags.madeForKids)],
              ['Monetization', String(yt.flags.isMonetizationEnabled)],
              ['Verified', String(yt.flags.isVerified)],
              ['Has Shorts', String(yt.flags.hasShorts)],
              ['Community posts', String(yt.flags.hasCommunityPosts)],
              ['Moderates comments', String(moderateComments)],
              ['Trailer ID', trailerId ?? '—'],
              ['Playlist ID', playlistId ?? '—'],
              ['Last long upload', formatDate(yt.lastLongVideoUploadDate)],
              ['Last short upload', formatDate(yt.lastShortVideoUploadDate)],
              ['Streamer', String(yt.flags.streamer)],
            ]}
          />
        </Card>

        <Card>
          <CardHeader title="Description" />
          <div className="max-h-[200px] overflow-auto text-[12.5px] leading-relaxed text-cp-ink-2">
            {description || <span className="text-cp-ink-4">No description</span>}
          </div>
          <div className="mt-3 space-y-3">
            {yt.topicDetails.length > 0 ? (
              <div>
                <SubLabel>Topic Details</SubLabel>
                <ChipList items={yt.topicDetails} max={20} />
              </div>
            ) : null}
            {yt.keywords.length > 0 ? (
              <div>
                <SubLabel>Keywords</SubLabel>
                <ChipList items={yt.keywords} max={20} />
              </div>
            ) : null}
            {(niceClass && Object.keys(niceClass).length > 0) || yt.niches.length > 0 ? (
              <div>
                <SubLabel>Niche</SubLabel>
                <ChipList
                  items={[
                    ...Object.entries(niceClass ?? {}).map(([k, v]) => ({
                      label: k,
                      accent: String(v),
                    })),
                    ...yt.niches.map((s) => ({ label: s })),
                  ]}
                />
              </div>
            ) : null}
            {yt.emailsFromVideoDesc.length > 0 ? (
              <div>
                <SubLabel>
                  Emails from descriptions ({yt.emailsFromVideoDesc.length})
                </SubLabel>
                <ChipList items={yt.emailsFromVideoDesc} max={8} />
              </div>
            ) : null}
          </div>
        </Card>
      </CardGrid>

      <div className="mt-8" />
      <SectionHeader title="Performance — Long-form vs Shorts" />
      <CardGrid cols={2}>
        <Card>
          <CardHeader
            title="Format Mix"
            description={
              yt.shortsPercentage != null
                ? `${yt.shortsPercentage}% Shorts overall`
                : undefined
            }
          />
          <DonutWithLegend
            data={[
              { value: longCount, label: 'Long-form' },
              { value: shortsCount, label: 'Shorts' },
            ]}
            colors={['#FF0033', '#000']}
            footer={`From last ${posts.length} videos`}
          />
        </Card>

        <Card>
          <CardHeader title="Engagement by Format" />
          <DescriptionList
            single
            rows={[
              ['ER long-form', erLong != null ? `${erLong}%` : '—'],
              ['ER shorts', erShorts != null ? `${erShorts}%` : '—'],
              ['Likes/views long', elvLong != null ? `${elvLong}%` : '—'],
              ['Likes/views shorts', elvShorts != null ? `${elvShorts}%` : '—'],
              ['Comments/views long', ecvLong != null ? `${ecvLong}%` : '—'],
              ['Comments/views shorts', ecvShorts != null ? `${ecvShorts}%` : '—'],
              ['Views/subs long', evsLong != null ? `${evsLong}%` : '—'],
              ['Views/subs shorts', evsShorts != null ? `${evsShorts}%` : '—'],
            ]}
          />
        </Card>

        <Card>
          <CardHeader title="View Stats" />
          <MiniGrid cols={2}>
            <MiniStat label="Avg Views" value={formatNum(yt.views.avg)} />
            <MiniStat label="Median Views (long)" value={formatNum(yt.views.medianLong)} />
            <MiniStat label="Avg Views (long)" value={formatNum(yt.views.avgLong)} />
            <MiniStat label="Avg Views (shorts)" value={formatNum(yt.views.avgShorts)} />
            <MiniStat label="Total Comments (last 50)" value={formatNum(totalCommentsLast50)} />
            <MiniStat label="Least Views" value={formatNum(leastViews)} />
          </MiniGrid>
        </Card>

        <Card>
          <CardHeader title="Posting Frequency" />
          <DescriptionList
            single
            rows={[
              [
                'Overall',
                yt.postingFrequency.overall != null
                  ? `${yt.postingFrequency.overall} / mo`
                  : '—',
              ],
              [
                'Long-form',
                yt.postingFrequency.long != null
                  ? `${yt.postingFrequency.long} / mo`
                  : '—',
              ],
              [
                'Shorts',
                yt.postingFrequency.shorts != null
                  ? `${yt.postingFrequency.shorts} / mo`
                  : '—',
              ],
              [
                'Recent months',
                yt.postingFrequency.recentMonths != null
                  ? `${yt.postingFrequency.recentMonths} / mo`
                  : '—',
              ],
            ]}
          />
        </Card>

        <Card span={2}>
          <CardHeader
            title="Posts per Month"
            description="Year-over-year upload cadence"
          />
          <YearMonthCalendar postsPerMonthByYear={yt.postsPerMonthByYear} />
        </Card>

        {recentViews.length > 0 ? (
          <Card span={2}>
            <CardHeader
              title="Recent Video Performance"
              description={`Views across last ${recentViews.length} videos`}
            />
            <Sparkline values={recentViews} height={120} color="#FF0033" />
          </Card>
        ) : null}
      </CardGrid>

      <div className="mt-8" />
      <SectionHeader
        title="Top Videos & Catalog"
        badge={`${posts.length} videos`}
      />
      <Card>
        <CardHeader title="Top Performing" description="Sorted by view count" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {topVideos.map((p, i) => (
            <VideoCard key={p.video_id} video={p} rank={i + 1} />
          ))}
        </div>
      </Card>

      <div className="mt-3" />
      <Card>
        <CardHeader
          title="Video Details"
          description="Title, duration, definition, language & engagement"
        />
        <div className="flex flex-col gap-2.5">
          {posts.slice(0, 10).map((p) => (
            <VideoRow key={p.video_id} video={p} />
          ))}
        </div>
      </Card>

      <div className="mt-8" />
      <SectionHeader title="Discovery & Categorization" />
      <CardGrid cols={2}>
        <Card>
          <CardHeader
            title="Video Categories"
            rightSlot={<Pill>{String(yt.videoCategories.length)}</Pill>}
          />
          {yt.videoCategories.length > 0 ? (
            <ChipList items={yt.videoCategories} />
          ) : (
            <Empty>No categories</Empty>
          )}
        </Card>
        <Card>
          <CardHeader
            title="Video Topics"
            rightSlot={<Pill>{String(yt.videoTopics.length)}</Pill>}
          />
          {yt.videoTopics.length > 0 ? (
            <ChipList
              items={yt.videoTopics.map((t) => t.split('/').pop() ?? t)}
              max={40}
              scrollable
            />
          ) : (
            <Empty>No topics</Empty>
          )}
        </Card>
        <Card span={2}>
          <CardHeader
            title="Hashtags"
            rightSlot={<Pill>{String(hashtagsCount.length)}</Pill>}
          />
          {hashtagsCount.filter((h) => h.name && h.name.length > 1).length > 0 ? (
            <ChipList
              items={hashtagsCount
                .filter((h) => h.name && h.name.length > 1)
                .map((h) => ({ label: h.name as string, count: h.count }))}
              hashPrefix
            />
          ) : (
            <Empty>No meaningful hashtags found</Empty>
          )}
          <div className="mt-2 text-[11px] text-cp-ink-3">
            Video-level hashtags pool:{' '}
            <span className="font-mono text-cp-ink">{videoHashtags.length}</span>
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

interface YtPost {
  video_id: string;
  title?: string;
  description?: string;
  published_at?: string;
  category_id?: string;
  default_language?: string;
  default_audio_language?: string;
  engagement?: {
    view_count?: string | number;
    like_count?: string | number;
    comment_count?: string | number;
    favorite_count?: string | number;
  };
  media?: {
    thumbnails?: {
      default?: string;
      medium?: string;
      high?: string;
      standard?: string;
      maxres?: string;
    };
    duration?: string;
    definition?: string;
  };
  post_url?: string;
  topic_categories?: unknown[];
}

function pluckYt(rawData: unknown): Record<string, unknown> | null {
  if (!rawData || typeof rawData !== 'object') return null;
  const r = rawData as Record<string, unknown>;
  if (r.youtube && typeof r.youtube === 'object') {
    return r.youtube as Record<string, unknown>;
  }
  const result = r.result;
  if (result && typeof result === 'object') {
    const yt = (result as Record<string, unknown>).youtube;
    if (yt && typeof yt === 'object') return yt as Record<string, unknown>;
  }
  return null;
}

function durationSeconds(s: string | undefined): number {
  if (!s) return 0;
  const m = s.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  return (Number(m[1] ?? 0)) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0);
}

function SubLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-1.5 text-[10.5px] font-medium uppercase tracking-[0.07em] text-cp-ink-3">
      {children}
    </div>
  );
}

function VideoCard({ video, rank }: { video: YtPost; rank: number }) {
  const thumb =
    video.media?.thumbnails?.medium ?? video.media?.thumbnails?.default;
  return (
    <a
      href={video.post_url ?? '#'}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative block overflow-hidden rounded-md border border-cp-line bg-cp-surface hover:shadow-sm"
    >
      <div className="aspect-video bg-cp-surface-2">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumb}
            alt=""
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[11px] text-cp-ink-4">
            video {rank}
          </div>
        )}
      </div>
      <div className="absolute right-1 top-1 rounded-full bg-cp-ink/85 px-1.5 py-0.5 font-mono text-[9px] font-bold text-white">
        #{rank}
      </div>
      <div className="absolute bottom-12 right-1 rounded bg-cp-ink/85 px-1.5 py-0.5 font-mono text-[9px] text-white">
        {fmtDuration(video.media?.duration)}
      </div>
      <div className="px-2.5 py-1.5">
        <div className="line-clamp-1 text-[11.5px] font-medium text-cp-ink">
          {video.title ?? '—'}
        </div>
        <div className="mt-1 flex items-center gap-3 font-mono text-[10.5px] text-cp-ink-3">
          <span>👁 {formatNum(Number(video.engagement?.view_count) || 0)}</span>
          <span>♥ {formatNum(Number(video.engagement?.like_count) || 0)}</span>
        </div>
      </div>
    </a>
  );
}

function VideoRow({ video }: { video: YtPost }) {
  const thumb = video.media?.thumbnails?.medium ?? video.media?.thumbnails?.default;
  return (
    <div className="flex gap-3 rounded-md border border-cp-line bg-cp-surface-2 p-3">
      <div
        className="aspect-video w-32 shrink-0 rounded border border-cp-line bg-cp-surface bg-cover bg-center"
        style={thumb ? { backgroundImage: `url(${thumb})` } : undefined}
      />
      <div className="min-w-0 flex-1">
        <div className="mb-1 text-[12.5px] font-semibold text-cp-ink line-clamp-2">
          {video.title ?? '—'}
        </div>
        <div className="mb-1.5 font-mono text-[10.5px] text-cp-ink-3">
          {formatDate(video.published_at ?? null)} ·{' '}
          {fmtDuration(video.media?.duration)} ·{' '}
          {video.media?.definition?.toUpperCase() ?? '—'} · cat {video.category_id} ·{' '}
          {video.default_language}/{video.default_audio_language}
        </div>
        <div className="flex flex-wrap items-center gap-3.5 font-mono text-[10.5px] text-cp-ink-3">
          <span>👁 {formatNum(Number(video.engagement?.view_count) || 0)}</span>
          <span>♥ {formatNum(Number(video.engagement?.like_count) || 0)}</span>
          <span>💬 {formatNum(Number(video.engagement?.comment_count) || 0)}</span>
          <span>★ {formatNum(Number(video.engagement?.favorite_count) || 0)}</span>
          {(video.topic_categories?.length ?? 0) > 0 ? (
            <span>{video.topic_categories?.length} topics</span>
          ) : null}
          <a
            href={video.post_url}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto text-cp-accent-3 hover:underline"
          >
            ↗ open
          </a>
        </div>
      </div>
    </div>
  );
}

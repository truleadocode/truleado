'use client';

import { useMemo } from 'react';
import {
  parseAudienceData,
  parseTwitterEnrichment,
} from '@/components/discovery/enriched-data';
import { AudienceBlock } from '../blocks/audience-block';
import { BarsList } from '../charts/bars-list';
import { DonutWithLegend } from '../charts/donut';
import { PostingHeatmap } from '../charts/posting-heatmap';
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

interface TwitterProfilePageProps {
  rawData: unknown;
  pictureUrl?: string | null;
}

const TWEETS_TYPE_COLORS = ['#000', '#1d9bf0', '#7e5bef', '#10b981'];

/**
 * Full per-platform Twitter / X profile page. Mirrors the IC handoff
 * page-twitter.jsx: identity dump + bio/links/cross-platforms, Tweet
 * Performance (tweets-type donut, engagement averages, posting heatmap,
 * tweet languages, retweet network counts), Tweet Feed (10 tweets with
 * full text + media + per-engagement counts), Network & Discovery
 * (hashtags + tagged + RT'd users + recommended). Audience is rendered
 * when present (followers only — IC doesn't populate likers/commenters
 * for Twitter).
 */
export function TwitterProfilePage({ rawData, pictureUrl }: TwitterProfilePageProps) {
  const tw = useMemo(() => parseTwitterEnrichment(rawData), [rawData]);
  const audience = useMemo(() => parseAudienceData(rawData, 'twitter'), [rawData]);
  const block = pluckTw(rawData);

  if (!tw.exists && !block) {
    return (
      <ProfileShell>
        <Empty>No Twitter / X enrichment data for this creator yet.</Empty>
      </ProfileShell>
    );
  }

  const username = (block?.username ?? '') as string;
  const fullName = (block?.full_name ?? username) as string;
  const userId = (block?.userid ?? null) as string | null;
  const joinDate = (block?.join_date ?? null) as string | null;
  const directMessaging = !!block?.direct_messaging;
  const subscriberButton = !!block?.subscriber_button;
  const superFollowedBy = !!block?.super_followed_by;
  const creatorFavoriteCount = (block?.creator_favorite_count ?? null) as number | null;
  const mediaCount = (block?.media_count ?? null) as number | null;
  const languageCode = (block?.language_code ?? []) as string[];
  const otherLinks = (block?.other_links ?? []) as Array<string | { url?: string }>;
  const linksInBio = (block?.links_in_bio ?? []) as Array<string | { url?: string }>;
  const retweetsCount = (block?.retweets_count ?? []) as Array<number | string>;
  const retweetsAggregate = retweetsCount.reduce<number>(
    (sum, v) => sum + (Number(v) || 0),
    0
  );
  const platforms = (block?.platforms ?? null) as Record<
    string,
    Array<string | { username?: string }>
  > | null;

  // Tweets-type donut.
  const tt = tw.tweetsType ?? {};
  const tweetsTypeData = [
    { value: tt.ordinary ?? 0, label: 'Original' },
    { value: tt.retweeted ?? 0, label: 'Retweets' },
    { value: tt.quoted ?? 0, label: 'Quoted' },
    { value: tt.conversation ?? 0, label: 'Replies' },
  ];

  // Tweet languages — count across tweets.
  const langCounts: Record<string, number> = {};
  for (const l of tw.languages) langCounts[l] = (langCounts[l] ?? 0) + 1;
  const langData = Object.entries(langCounts)
    .map(([k, v]) => ({ label: k.toUpperCase(), value: v }))
    .sort((a, b) => b.value - a.value);

  const posts = (block?.post_data ?? []) as TwPost[];

  const rawTags: Array<ProfileHeadTag | null> = [
    tw.flags.isVerified ? { kind: 'good', label: 'Verified' } : null,
    subscriberButton ? { kind: 'accent', label: 'Premium' } : null,
    superFollowedBy ? { kind: 'accent', label: 'Super Follow' } : null,
    directMessaging ? { label: 'DMs open' } : { label: 'DMs closed' },
    tw.flags.streamer ? { label: 'Streamer' } : null,
    tw.flags.hasMerch ? { kind: 'good', label: 'Merch' } : { label: 'No merch' },
    tw.flags.hasPaidPartnership ? { kind: 'warn', label: 'Paid partnerships' } : null,
    tw.flags.streamer ? null : null,
  ];
  const tags = rawTags.filter((t): t is ProfileHeadTag => t !== null);

  const kpis: KpiTile[] = [
    {
      label: 'Followers',
      value: formatNum(tw.followerCount),
      sub: `${formatNum(tw.followingCount)} following`,
    },
    {
      label: 'Engagement Rate',
      value: formatPct(tw.engagementPercent ?? 0, 2),
      sub: 'of last 20 tweets',
    },
    {
      label: 'Avg Engagement',
      value: `${formatNum(tw.averages.likes)} ♥ · ${formatNum(tw.averages.views)} 👁`,
      sub: `${formatNum(tw.averages.replies)} ↩ · ${formatNum(tw.averages.retweets)} ↺`,
    },
    {
      label: 'Total Tweets',
      value: formatNum(tw.tweetsCount),
      sub: `${formatNum(mediaCount)} media · ${formatNum(creatorFavoriteCount)} favs`,
    },
  ];

  return (
    <ProfileShell>
      <ProfileHead
        platform="twitter"
        displayName={fullName}
        handle={username}
        pictureUrl={pictureUrl ?? null}
        isVerified={tw.flags.isVerified}
        bio={tw.biography}
        handleSuffix={joinDate ? `joined ${formatDate(joinDate)}` : null}
        platformUrl={`https://twitter.com/${username}`}
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
              ['Joined', formatDate(joinDate)],
              ['Verified', String(tw.flags.isVerified)],
              ['Direct messaging', String(directMessaging)],
              ['Subscriber button', String(subscriberButton)],
              ['Super followed', String(superFollowedBy)],
              ['Most recent post', formatDate(tw.mostRecentPostDate)],
              ['Languages', languageCode.join(', ') || '—'],
              ['Has merch', String(tw.flags.hasMerch)],
              ['Paid partnership', String(tw.flags.hasPaidPartnership)],
              ['Affiliate links', String(tw.flags.hasMerch === false && false)],
              ['Streamer', String(tw.flags.streamer)],
              ['Exists', String(tw.exists)],
            ]}
          />
        </Card>
        <Card>
          <CardHeader title="Bio & Links" />
          <div className="text-[12.5px] leading-relaxed text-cp-ink-2">
            {tw.biography || <span className="text-cp-ink-4">No biography</span>}
          </div>
          <div className="mt-3 space-y-3">
            <div>
              <SubLabel>Links in bio ({linksInBio.length})</SubLabel>
              {linksInBio.length > 0 ? (
                <ul className="space-y-1">
                  {linksInBio.map((l, i) => (
                    <li key={i}>
                      <a
                        href={typeof l === 'string' ? l : l?.url ?? ''}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block break-all font-mono text-[11px] text-cp-accent-3 hover:underline"
                      >
                        {typeof l === 'string' ? l : l?.url ?? ''}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <Empty>None</Empty>
              )}
            </div>
            <div>
              <SubLabel>Other links ({otherLinks.length})</SubLabel>
              {otherLinks.length > 0 ? (
                <ul className="space-y-1">
                  {otherLinks.map((l, i) => (
                    <li key={i}>
                      <a
                        href={typeof l === 'string' ? l : l?.url ?? ''}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block break-all font-mono text-[11px] text-cp-accent-3 hover:underline"
                      >
                        {typeof l === 'string' ? l : l?.url ?? ''}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <Empty>None</Empty>
              )}
            </div>
            {platforms && Object.keys(platforms).length > 0 ? (
              <div>
                <SubLabel>Cross-platforms</SubLabel>
                <ChipList
                  items={Object.entries(platforms).flatMap(([k, arr]) =>
                    (arr ?? []).map((v) => ({
                      label: typeof v === 'string' ? `${k}: ${v}` : `${k}: ${v.username ?? '?'}`,
                    }))
                  )}
                />
              </div>
            ) : null}
          </div>
        </Card>
      </CardGrid>

      <div className="mt-8" />
      <SectionHeader title="Tweet Performance" />
      <CardGrid cols={2}>
        <Card>
          <CardHeader title="Tweet Type Mix" description="Last 20 tweets composition" />
          <DonutWithLegend
            data={tweetsTypeData}
            colors={TWEETS_TYPE_COLORS}
          />
        </Card>
        <Card>
          <CardHeader title="Engagement Mix" description="Average per-tweet" />
          <MiniGrid cols={2}>
            <MiniStat label="Avg Likes" value={formatNum(tw.averages.likes)} />
            <MiniStat label="Avg Views" value={formatNum(tw.averages.views)} />
            <MiniStat label="Avg Replies" value={formatNum(tw.averages.replies)} />
            <MiniStat label="Avg Retweets" value={formatNum(tw.averages.retweets)} />
            <MiniStat label="Avg Quotes" value={formatNum(tw.averages.quotes)} />
            <MiniStat label="Creator Favs" value={formatNum(creatorFavoriteCount)} />
          </MiniGrid>
        </Card>

        {posts.length > 0 ? (
          <Card span={2}>
            <CardHeader
              title="Posting Heatmap"
              description="When tweets land — hour × weekday"
            />
            <PostingHeatmap
              posts={posts.map((p) => ({ created_at: p.created_at }))}
            />
          </Card>
        ) : null}

        <Card>
          <CardHeader
            title="Tweet Languages"
            description="Detected per tweet"
          />
          {langData.length > 0 ? (
            <BarsList
              data={langData}
              formatter={(v) => `${v} tweet${v === 1 ? '' : 's'}`}
              gradient="linear-gradient(90deg,#1d9bf0,#7e5bef)"
            />
          ) : (
            <Empty>No data</Empty>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Retweet Behavior"
            description="Outbound RTs from last 20 tweets"
          />
          <DescriptionList
            single
            rows={[
              ['Total retweets aggregate', retweetsAggregate.toLocaleString()],
              ["RT'd users tracked", String(tw.retweetUsers.length)],
              ['Tagged usernames', String(tw.taggedUsernames.length)],
              ['Recommended users', String(tw.recommendedUsers.length)],
              ['Hashtags', String(tw.hashtags.length)],
            ]}
          />
        </Card>
      </CardGrid>

      <div className="mt-8" />
      <SectionHeader
        title="Recent Tweets"
        badge={`${posts.length} tweets`}
      />
      <Card>
        <CardHeader
          title="Tweet Feed"
          description="Full text, lang, media & engagement"
        />
        <div className="flex flex-col gap-2.5">
          {posts.slice(0, 10).map((p) => (
            <TweetRow key={p.tweet_id} tweet={p} />
          ))}
        </div>
      </Card>

      <div className="mt-8" />
      <SectionHeader title="Network & Discovery" />
      <CardGrid cols={2}>
        <Card>
          <CardHeader
            title="Hashtags"
            rightSlot={<Pill>{String(tw.hashtags.length)}</Pill>}
          />
          {tw.hashtags.length > 0 ? (
            <ChipList items={tw.hashtags} hashPrefix max={40} />
          ) : (
            <Empty>No hashtags</Empty>
          )}
        </Card>
        <Card>
          <CardHeader
            title="Tagged Usernames"
            rightSlot={<Pill>{String(tw.taggedUsernames.length)}</Pill>}
          />
          {tw.taggedUsernames.length > 0 ? (
            <ChipList
              items={tw.taggedUsernames.map((u) => `@${u}`)}
              max={30}
              hrefFor={(label) =>
                `https://twitter.com/${label.replace(/^@/, '')}`
              }
            />
          ) : (
            <Empty>None</Empty>
          )}
        </Card>
        <Card>
          <CardHeader
            title="Retweeted Users"
            rightSlot={<Pill>{String(tw.retweetUsers.length)}</Pill>}
          />
          {tw.retweetUsers.length > 0 ? (
            <ChipList
              items={tw.retweetUsers.map((u) => `@${u}`)}
              max={30}
              hrefFor={(label) =>
                `https://twitter.com/${label.replace(/^@/, '')}`
              }
            />
          ) : (
            <Empty>None</Empty>
          )}
        </Card>
        <Card>
          <CardHeader
            title="Recommended Accounts"
            description="Suggested by Twitter algorithm"
          />
          {tw.recommendedUsers.length > 0 ? (
            <ChipList
              items={tw.recommendedUsers.map((u) => `@${u}`)}
              max={30}
              hrefFor={(label) =>
                `https://twitter.com/${label.replace(/^@/, '')}`
              }
            />
          ) : (
            <Empty>None</Empty>
          )}
        </Card>
      </CardGrid>

      {(audience.geo || audience.genders || audience.ages || audience.languages) ? (
        <>
          <div className="mt-8" />
          <SectionHeader title="Audience Intelligence" />
          <AudienceBlock
            audience={audience}
            sourceLabel="Followers"
            hrefForUser={(u) => `https://twitter.com/${u}`}
          />
        </>
      ) : null}
    </ProfileShell>
  );
}

/* ───────────────────────────────────────────── */
/* Helpers + sub-components                      */
/* ───────────────────────────────────────────── */

interface TwPost {
  tweet_id: string;
  created_at?: string;
  text?: string | null;
  lang?: string;
  engagement?: {
    like_count?: number;
    retweet_count?: number;
    reply_count?: number;
    quote_count?: number;
    view_count?: number;
  };
  media?: Array<{ media_key?: string; type?: string; url?: string }>;
  tweet_url?: string;
  hashtags?: string[];
  mentions?: string[];
  is_pinned?: boolean;
}

function pluckTw(rawData: unknown): Record<string, unknown> | null {
  if (!rawData || typeof rawData !== 'object') return null;
  const r = rawData as Record<string, unknown>;
  if (r.twitter && typeof r.twitter === 'object') {
    return r.twitter as Record<string, unknown>;
  }
  const result = r.result;
  if (result && typeof result === 'object') {
    const tw = (result as Record<string, unknown>).twitter;
    if (tw && typeof tw === 'object') return tw as Record<string, unknown>;
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

function TweetRow({ tweet }: { tweet: TwPost }) {
  return (
    <div className="rounded-md border border-cp-line bg-cp-surface-2 p-3">
      <div className="mb-1 flex flex-wrap items-baseline gap-2 font-mono text-[10.5px] text-cp-ink-3">
        <span>{formatDate(tweet.created_at ?? null)}</span>
        <span>·</span>
        <span>{tweet.lang?.toUpperCase() ?? '—'}</span>
        <span>·</span>
        <span>ID {tweet.tweet_id?.slice(0, 12)}…</span>
        {tweet.is_pinned ? (
          <span className="text-cp-warn">📌 Pinned</span>
        ) : null}
      </div>
      <div className="text-[12.5px] leading-relaxed text-cp-ink whitespace-pre-wrap">
        {tweet.text || <span className="text-cp-ink-4">(no text)</span>}
      </div>
      {(tweet.media?.length ?? 0) > 0 ? (
        <div className="mt-2 text-[11px] text-cp-ink-3">
          📎 {tweet.media?.length} media: {tweet.media?.map((m) => m.type).join(', ')}
        </div>
      ) : null}
      <div className="mt-2 flex flex-wrap items-center gap-3.5 font-mono text-[10.5px] text-cp-ink-3">
        <span>♥ {formatNum(tweet.engagement?.like_count)}</span>
        <span>↺ {formatNum(tweet.engagement?.retweet_count)}</span>
        <span>↩ {formatNum(tweet.engagement?.reply_count)}</span>
        <span>&quot; {formatNum(tweet.engagement?.quote_count)}</span>
        <span>👁 {formatNum(tweet.engagement?.view_count)}</span>
        {(tweet.hashtags?.length ?? 0) > 0 ? <span>#{tweet.hashtags?.length}</span> : null}
        {(tweet.mentions?.length ?? 0) > 0 ? <span>@{tweet.mentions?.length}</span> : null}
        <a
          href={tweet.tweet_url}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto text-cp-accent-3 hover:underline"
        >
          ↗
        </a>
      </div>
    </div>
  );
}

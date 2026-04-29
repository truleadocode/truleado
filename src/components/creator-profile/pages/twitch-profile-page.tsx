'use client';

import { useMemo } from 'react';
import { ExternalLink } from 'lucide-react';
import { parseTwitchEnrichment } from '@/components/discovery/enriched-data';
import type {
  TwitchEnrichment,
  TwitchShelfItem,
} from '@/components/discovery/enriched-data/parsers/types';
import { CardHeader } from '../layout/card-header';
import { DescriptionList, Empty, MiniGrid, MiniStat, Pill } from '../layout/primitives';
import {
  ProfileHead,
  type KpiTile,
  type ProfileHeadTag,
} from '../layout/profile-head';
import { Card, CardGrid, ProfileShell } from '../layout/profile-shell';
import { SectionHeader } from '../layout/section-header';
import { formatDate, formatNum } from '../format';

interface TwitchProfilePageProps {
  rawData: unknown;
  pictureUrl?: string | null;
}

/**
 * Full per-platform Twitch profile page. Twitch is the exception in the
 * mockup — IC's API doesn't expose follower demographics, so the Audience
 * Intelligence section is REPLACED with:
 *   - Channel Snapshot (identity dump + activity status)
 *   - Featured Clips & Recent VODs (videoShelves from the GraphQL payload)
 *   - Channel Panels (titles + descriptions + URLs + image URLs)
 *   - Connected Accounts & Links (cross-platform handles + bio links)
 *   - API Metadata (raw GraphQL response inspection — Channel.id /
 *     operationName / requestID / durationMilliseconds)
 *
 * Mirrors `product-documentation/influencers.club/creator-profile/page-twitch.jsx`.
 */
export function TwitchProfilePage({ rawData, pictureUrl }: TwitchProfilePageProps) {
  const tw = useMemo(() => parseTwitchEnrichment(rawData), [rawData]);
  const block = pluckTwitch(rawData);

  if (!tw.exists && !block) {
    return (
      <ProfileShell>
        <Empty>No Twitch enrichment data for this creator yet.</Empty>
      </ProfileShell>
    );
  }

  const username = (block?.username ?? '') as string;
  const displayName = tw.displayName ?? username;
  const userId = (block?.user_id ?? null) as string | null;
  const lastBroadcastId = (block?.last_broadcast_id ?? null) as string | null;
  const languageCode = (block?.language_code ?? []) as string[];
  const otherLinks = (block?.other_links ?? []) as Array<string | { url?: string }>;

  // Pull primaryColorHex out of the GraphQL channel block — useful for
  // the design rhythm + we expose it in the API Metadata section.
  const channel = pluckGqlChannel(rawData);
  const primaryColor = channel?.primaryColorHex
    ? `#${String(channel.primaryColorHex).replace(/^#/, '')}`
    : null;

  // Activity-status reach ratio: avg viewers / total followers.
  const reachRatio =
    tw.followerCount && tw.avgViews ? tw.avgViews / tw.followerCount : 0;

  const rawTags: Array<ProfileHeadTag | null> = [
    tw.isPartner ? { kind: 'good', label: 'Partner' } : null,
    (tw.streamedHoursLast30 ?? 0) > 0
      ? { kind: 'good', label: `${tw.streamedHoursLast30}h streamed (30d)` }
      : { kind: 'warn', label: 'Inactive 30d' },
    tw.flags.hasMerch ? { kind: 'good', label: 'Merch' } : { label: 'No merch' },
    tw.flags.hasPaidPartnership ? { kind: 'warn', label: 'Paid partnership' } : null,
    tw.flags.promotesAffiliateLinks ? { kind: 'warn', label: 'Affiliate links' } : null,
    { label: `Lang: ${languageCode.join(', ') || '—'}` },
  ];
  const tags = rawTags.filter((t): t is ProfileHeadTag => t !== null);

  const kpis: KpiTile[] = [
    {
      label: 'Followers',
      value: formatNum(tw.followerCount),
      sub: `User ID ${userId ?? '—'}`,
    },
    {
      label: 'Avg Views / Stream',
      value: formatNum(tw.avgViews),
      sub: 'lifetime average',
    },
    {
      label: 'Streams (30d)',
      value: formatNum(tw.streamsCountLast30),
      sub: `${tw.streamedHoursLast30 ?? 0}h streamed`,
    },
    {
      label: 'Last Streamed',
      value: formatDate(tw.lastStreamed),
      sub: `Game: ${tw.lastBroadcastGame ?? '—'}`,
    },
  ];

  return (
    <ProfileShell>
      <ProfileHead
        platform="twitch"
        displayName={displayName}
        handle={username}
        pictureUrl={pictureUrl ?? null}
        isVerified={tw.isPartner}
        bio={null}
        platformUrl={`https://twitch.tv/${username}`}
        kpis={kpis}
        tags={tags}
      />

      <div className="mt-8" />
      <SectionHeader
        title="Channel Snapshot"
        badge={userId ? `@${username} · ID ${userId}` : `@${username}`}
      />
      <CardGrid cols={2}>
        <Card>
          <CardHeader title="Identity & Account" />
          <DescriptionList
            single
            rows={[
              ['Display name', displayName],
              ['Username', `@${username}`],
              ['User ID', userId ?? '—'],
              ['Partner', String(tw.isPartner)],
              ['Total followers', formatNum(tw.followerCount)],
              ['Avg views', formatNum(tw.avgViews)],
              ['Last broadcast', tw.lastBroadcastGame ?? '—'],
              ['Last broadcast ID', lastBroadcastId ?? '—'],
              ['Last streamed', formatDate(tw.lastStreamed)],
              ['Streams (30d)', formatNum(tw.streamsCountLast30)],
              [
                'Streamed hours (30d)',
                tw.streamedHoursLast30 != null
                  ? `${tw.streamedHoursLast30}h`
                  : '—',
              ],
              ['Has merch', String(tw.flags.hasMerch)],
              ['Paid partnership', String(tw.flags.hasPaidPartnership)],
              ['Promotes affiliate', String(tw.flags.promotesAffiliateLinks)],
              ['Primary color', primaryColor ?? '—'],
            ]}
          />
        </Card>

        <Card>
          <CardHeader
            title="Activity Status"
            description="Stream activity over the last 30 days"
          />
          <div className="rounded-md border border-cp-line bg-cp-surface-2 p-5 text-center">
            <div
              className={
                'font-mono text-[42px] font-bold leading-none tracking-tight ' +
                ((tw.streamedHoursLast30 ?? 0) > 0 ? 'text-cp-good' : 'text-cp-bad')
              }
            >
              {tw.streamedHoursLast30 ?? 0}h
            </div>
            <div className="mt-1.5 text-[11px] text-cp-ink-3">
              {tw.streamsCountLast30 ?? 0} streams · last live{' '}
              {formatDate(tw.lastStreamed)}
            </div>
          </div>
          <div className="mt-3">
            <MiniGrid cols={2}>
              <MiniStat
                label="Reach Ratio"
                value={`${(reachRatio * 100).toFixed(2)}%`}
                sub="avg viewers / followers"
              />
              <MiniStat
                label="Last Game"
                value={tw.lastBroadcastGame ?? '—'}
              />
            </MiniGrid>
          </div>
        </Card>
      </CardGrid>

      <div className="mt-8" />
      <SectionHeader title="Featured Clips & VODs" />
      <CardGrid cols={2}>
        <Card>
          <CardHeader
            title="Featured Clips"
            description="Pinned by the channel"
            rightSlot={<Pill>{String(tw.featuredClips.length)}</Pill>}
          />
          {tw.featuredClips.length > 0 ? (
            <ShelfGrid items={tw.featuredClips.slice(0, 6)} />
          ) : (
            <Empty>No featured clips</Empty>
          )}
        </Card>
        <Card>
          <CardHeader
            title="Recent VODs"
            description="Past broadcasts"
            rightSlot={<Pill>{String(tw.recentVideos.length)}</Pill>}
          />
          {tw.recentVideos.length > 0 ? (
            <ShelfGrid items={tw.recentVideos.slice(0, 6)} />
          ) : (
            <Empty>No recent VODs</Empty>
          )}
        </Card>
      </CardGrid>

      <div className="mt-8" />
      <SectionHeader
        title="Channel Panels"
        badge={`${tw.panels.length} panels`}
      />
      {tw.panels.length > 0 ? (
        <CardGrid cols={2}>
          {tw.panels.map((p, i) => (
            <PanelCard key={i} panel={p} index={i} />
          ))}
        </CardGrid>
      ) : (
        <Empty>No channel panels</Empty>
      )}

      <div className="mt-8" />
      <SectionHeader title="Connected Accounts & Links" />
      <CardGrid cols={2}>
        <Card>
          <CardHeader title="Cross-Platform Identity" />
          {Object.keys(tw.socialMedia).length > 0 ? (
            <DescriptionList
              single
              rows={Object.entries(tw.socialMedia).map(([k, v]) => [k, v])}
            />
          ) : (
            <Empty>No connected accounts</Empty>
          )}
        </Card>
        <Card>
          <CardHeader title="Links" description="In-bio + other links" />
          <div className="space-y-3">
            <div>
              <SubLabel>Links in bio ({tw.linksInBio.length})</SubLabel>
              {tw.linksInBio.length > 0 ? (
                <LinkList links={tw.linksInBio} />
              ) : (
                <Empty>None</Empty>
              )}
            </div>
            <div>
              <SubLabel>Other links ({otherLinks.length})</SubLabel>
              {otherLinks.length > 0 ? (
                <LinkList
                  links={otherLinks.map((l) =>
                    typeof l === 'string' ? l : (l?.url as string | undefined) ?? ''
                  )}
                />
              ) : (
                <Empty>None</Empty>
              )}
            </div>
          </div>
        </Card>
      </CardGrid>

      <div className="mt-8" />
      <SectionHeader title="API Metadata" />
      <CardGrid cols={2}>
        <Card>
          <CardHeader
            title="Raw GraphQL Response"
            description="From the post_data shelf"
          />
          <DescriptionList
            single
            rows={[
              ['Channel.id', (channel?.id as string | undefined) ?? '—'],
              ['Channel.login', (channel?.login as string | undefined) ?? '—'],
              ['Channel.displayName', (channel?.displayName as string | undefined) ?? '—'],
              ['Channel.__typename', (channel?.__typename as string | undefined) ?? '—'],
              [
                'Operation',
                (tw.apiMetadata?.operationName as string | undefined) ?? '—',
              ],
              [
                'Duration',
                tw.apiMetadata?.durationMilliseconds != null
                  ? `${tw.apiMetadata.durationMilliseconds}ms`
                  : '—',
              ],
              [
                'Request ID',
                (tw.apiMetadata?.requestID as string | undefined) ?? '—',
              ],
            ]}
          />
        </Card>
        <Card>
          <CardHeader
            title="No Audience Intelligence"
            description="Twitch's API does not surface follower demographics"
          />
          <p className="text-[12px] leading-relaxed text-cp-ink-2">
            Twitch profiles don&apos;t expose audience intelligence — IC pulls a
            GraphQL channel snapshot instead. Cross-reference with this
            creator&apos;s linked Instagram / Twitter / YouTube profiles for
            audience demographics.
          </p>
          {Object.keys(tw.socialMedia).length > 0 ? (
            <div className="mt-3">
              <SubLabel>Linked profiles</SubLabel>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(tw.socialMedia).map(([k, v]) => (
                  <span
                    key={k}
                    className="inline-flex items-center gap-1 rounded-full border border-cp-line bg-cp-surface-2 px-2 py-0.5 text-[11px] text-cp-ink-2"
                  >
                    {k}: <span className="font-mono">{v}</span>
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </Card>
      </CardGrid>
    </ProfileShell>
  );
}

/* ───────────────────────────────────────────── */
/* Helpers + sub-components                      */
/* ───────────────────────────────────────────── */

function pluckTwitch(rawData: unknown): Record<string, unknown> | null {
  if (!rawData || typeof rawData !== 'object') return null;
  const r = rawData as Record<string, unknown>;
  if (r.twitch && typeof r.twitch === 'object') {
    return r.twitch as Record<string, unknown>;
  }
  const result = r.result;
  if (result && typeof result === 'object') {
    const tw = (result as Record<string, unknown>).twitch;
    if (tw && typeof tw === 'object') return tw as Record<string, unknown>;
  }
  return null;
}

/** Reach into post_data[0].data.channel for the GraphQL channel block. */
function pluckGqlChannel(rawData: unknown): Record<string, unknown> | null {
  const block = pluckTwitch(rawData);
  if (!block) return null;
  const postData = block.post_data;
  if (!Array.isArray(postData) || postData.length === 0) return null;
  const first = postData[0] as Record<string, unknown> | null;
  if (!first || typeof first !== 'object') return null;
  const data = (first.data ?? null) as Record<string, unknown> | null;
  if (!data || typeof data !== 'object') return null;
  const channel = data.channel;
  if (channel && typeof channel === 'object' && !Array.isArray(channel)) {
    return channel as Record<string, unknown>;
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

function ShelfGrid({ items }: { items: TwitchShelfItem[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {items.map((it) => (
        <ShelfTile key={it.id ?? it.slug ?? it.title ?? Math.random()} item={it} />
      ))}
    </div>
  );
}

function ShelfTile({ item }: { item: TwitchShelfItem }) {
  return (
    <div className="overflow-hidden rounded-md border border-cp-line bg-cp-surface">
      <div className="aspect-video bg-cp-surface-2">
        {item.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.thumbnailUrl}
            alt=""
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[11px] text-cp-ink-4">
            {item.kind ?? 'media'}
          </div>
        )}
      </div>
      <div className="p-2.5">
        <div className="line-clamp-2 text-[12px] font-medium text-cp-ink">
          {item.title ?? '—'}
        </div>
        <div className="mt-1 flex items-center gap-2 font-mono text-[10.5px] text-cp-ink-3">
          {item.kind ? (
            <span className="uppercase">{item.kind}</span>
          ) : null}
          {item.durationSeconds != null ? (
            <span>{fmtDurationFromSeconds(item.durationSeconds)}</span>
          ) : null}
          {item.game ? <span className="truncate">· {item.game}</span> : null}
        </div>
      </div>
    </div>
  );
}

function PanelCard({
  panel,
  index,
}: {
  panel: TwitchEnrichment['panels'][number];
  index: number;
}) {
  return (
    <Card>
      <CardHeader
        title={panel.title || `Panel ${index + 1}`}
        description={panel.type ? `Type: ${panel.type}` : undefined}
        rightSlot={panel.imageUrl ? <Pill>📷</Pill> : null}
      />
      <div className="text-[12px] leading-relaxed text-cp-ink-2 whitespace-pre-wrap">
        {panel.description ? (
          panel.description.slice(0, 300)
        ) : (
          <span className="text-cp-ink-4">No description</span>
        )}
      </div>
      {panel.url ? (
        <a
          href={panel.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 block break-all font-mono text-[11px] text-cp-accent-3 hover:underline"
        >
          ↗ {panel.url}
        </a>
      ) : null}
      {panel.imageUrl ? (
        <div className="mt-1 break-all font-mono text-[10px] text-cp-ink-3">
          img: {panel.imageUrl.slice(0, 60)}…
        </div>
      ) : null}
    </Card>
  );
}

function LinkList({ links }: { links: string[] }) {
  return (
    <ul className="space-y-1">
      {links.map((l, i) => (
        <li key={i}>
          <a
            href={l}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 break-all font-mono text-[11px] text-cp-accent-3 hover:underline"
          >
            <ExternalLink className="h-3 w-3 shrink-0" />
            {l}
          </a>
        </li>
      ))}
    </ul>
  );
}

function fmtDurationFromSeconds(sec: number): string {
  if (sec >= 3600) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    return `${h}h ${m}m`;
  }
  if (sec >= 60) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  }
  return `${sec}s`;
}

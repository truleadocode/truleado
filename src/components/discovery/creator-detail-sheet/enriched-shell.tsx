'use client';

import { useMemo, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  buildStandardStatList,
  MetaColumn,
  parseTopLevelCommon,
} from '../enriched-data';
import {
  parseInstagramEnrichment,
  parseTikTokEnrichment,
  parseTwitterEnrichment,
} from '../enriched-data';
import type { CreatorProfile, DiscoveryCreator } from '../hooks';
import { useCreatorIdByProfileId, useImportCreatorsToAgency } from '../hooks';
import { safeDict, safeNumber, safeString } from '../enriched-data/parsers/safe';
import { AnalyticsTab } from './sections/analytics-tab';
import { PostsGrid } from './sections/posts-grid';
import { SimilarAccordion } from './sections/similar-accordion';

interface EnrichedShellProps {
  agencyId: string;
  creator: DiscoveryCreator;
  /** Narrowed: enrichmentMode is FULL or FULL_WITH_AUDIENCE. */
  profile: CreatorProfile;
}

/**
 * Polished post-enrich layout matching IC's profile view. Two-column
 * structure inside a ~5xl Sheet: meta column on the left, tabbed
 * content on the right (Analytics / Posts / Similar Accounts).
 *
 * The Sheet width itself is set on `<SheetContent>` in the parent
 * `index.tsx` based on enrichmentMode.
 */
export function EnrichedShell({ agencyId, creator, profile }: EnrichedShellProps) {
  const { toast } = useToast();
  const platform = creator.platform.toLowerCase();
  const [tab, setTab] = useState<'analytics' | 'posts' | 'similar'>('analytics');

  const common = useMemo(() => parseTopLevelCommon(profile.rawData), [profile.rawData]);

  // Per-platform stat extraction for the left column StatList.
  const stats = useMemo(
    () => buildStatsForPlatform(profile, platform),
    [profile, platform]
  );

  const rosterIdQuery = useCreatorIdByProfileId(agencyId, profile.id ?? null);
  const importToRoster = useImportCreatorsToAgency();
  const alreadyInRoster = !!rosterIdQuery.data;

  const handleAddToRoster = () => {
    importToRoster.mutate(
      {
        agencyId,
        items: [
          {
            creatorProfileId: profile.id,
            platform: creator.platform,
            handle: creator.username,
            enrichIfMissing: false,
          },
        ],
      },
      {
        onSuccess: () => {
          toast({
            title: 'Added to Creator Roster',
            description: 'No credits charged — profile already enriched.',
          });
        },
        onError: (err) => {
          toast({
            title: 'Roster import failed',
            description: err instanceof Error ? err.message : 'Unknown error',
            variant: 'destructive',
          });
        },
      }
    );
  };

  return (
    <div className="flex h-full">
      <MetaColumn
        displayName={profile.fullName ?? creator.username}
        handle={creator.username}
        pictureUrl={profile.profilePictureUrl ?? null}
        providerUserId={profile.providerUserId ?? creator.providerUserId}
        common={common}
        currentPlatform={platform}
        currentFollowers={profile.followers}
        currentEngagementPercent={profile.engagementPercent}
        biography={profile.biography ?? extractBio(profile.rawData, platform)}
        stats={stats}
        onAddToRoster={handleAddToRoster}
        rosterPending={importToRoster.isPending}
        alreadyInRoster={alreadyInRoster}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as typeof tab)}
          className="flex flex-1 flex-col overflow-hidden"
        >
          <TabsList className="sticky top-0 z-10 w-full justify-start gap-1 rounded-none border-b border-tru-slate-200 bg-white/95 px-6 backdrop-blur-sm">
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="posts">Posts</TabsTrigger>
            <TabsTrigger value="similar">Similar Accounts</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto">
            <TabsContent value="analytics" className="mt-0">
              <AnalyticsTab creator={creator} profile={profile} />
            </TabsContent>

            <TabsContent value="posts" className="mt-0">
              <PostsGrid agencyId={agencyId} creator={creator} />
            </TabsContent>

            <TabsContent value="similar" className="mt-0">
              <SimilarAccordion agencyId={agencyId} creator={creator} />
            </TabsContent>
          </div>
        </Tabs>

        {/* Footer: deep-link if already in roster. The Add CTA lives in MetaColumn. */}
        {alreadyInRoster ? (
          <div className="border-t border-tru-slate-100 bg-tru-slate-50 px-6 py-3">
            <a
              href={`/dashboard/creators/${rosterIdQuery.data}?platform=${platform}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-2 text-sm font-semibold text-tru-blue-600 hover:underline"
            >
              <span>View full profile in Creator DB</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function extractBio(rawData: unknown, platform: string): string | null {
  const block = safeDict(deepGet(rawData, [platform]));
  if (!block) return null;
  return (
    safeString(block.biography) ??
    safeString(block.description) ??
    null
  );
}

function buildStatsForPlatform(profile: CreatorProfile, platform: string) {
  // Common base from the profile row.
  const followers = profile.followers;
  const er = profile.engagementPercent;

  // Per-platform extras live in raw_data — read via the parsers.
  if (platform === 'instagram') {
    const ig = parseInstagramEnrichment(profile.rawData);
    const reelsAvgLikes = safeNumber(safeDict(ig.reels)?.avg_likes);
    return buildStandardStatList({
      followers,
      engagementPercent: er,
      numberOfPosts: ig.mediaCount,
      postsPerMonth: postsPerMonthFromPosts(ig.posts),
      averageViews: null, // IG photo posts don't expose view counts
      averageReelLikes: reelsAvgLikes,
      averageLikes: ig.avgLikes,
      averageComments: ig.avgComments,
    });
  }
  if (platform === 'tiktok') {
    const tt = parseTikTokEnrichment(profile.rawData);
    return buildStandardStatList({
      followers,
      engagementPercent: er,
      numberOfPosts: tt.videoCount,
      postsPerMonth: tt.postingFrequencyRecentMonths,
      averageViews: tt.averages.plays,
      averageReelLikes: null,
      averageLikes: tt.averages.likes,
      averageComments: tt.averages.comments,
    });
  }
  if (platform === 'twitter') {
    const tw = parseTwitterEnrichment(profile.rawData);
    return buildStandardStatList({
      followers,
      engagementPercent: er,
      numberOfPosts: tw.tweetsCount,
      postsPerMonth: postsPerMonthFromPosts(tw.posts),
      averageViews: tw.averages.views,
      averageReelLikes: null,
      averageLikes: tw.averages.likes,
      averageComments: tw.averages.replies,
    });
  }
  // YouTube + Twitch fall through to a minimal version.
  return buildStandardStatList({
    followers,
    engagementPercent: er,
    numberOfPosts: null,
    postsPerMonth: null,
    averageViews: null,
    averageReelLikes: null,
    averageLikes: null,
    averageComments: null,
  });
}

/** Approximate posts-per-month from a posts array's published_at distribution. */
function postsPerMonthFromPosts(
  posts: Array<{ publishedAt: string | null }>
): number | null {
  const dates = posts
    .map((p) => (p.publishedAt ? new Date(p.publishedAt).getTime() : null))
    .filter((d): d is number => d !== null);
  if (dates.length < 2) return null;
  const span = Math.max(...dates) - Math.min(...dates);
  const months = span / (30 * 24 * 60 * 60 * 1000);
  if (months < 0.5) return null;
  return dates.length / months;
}

function deepGet(root: unknown, path: string[]): unknown {
  let cur: unknown = root;
  for (const seg of path) {
    if (cur && typeof cur === 'object' && !Array.isArray(cur)) {
      cur = (cur as Record<string, unknown>)[seg];
    } else {
      return undefined;
    }
  }
  return cur;
}

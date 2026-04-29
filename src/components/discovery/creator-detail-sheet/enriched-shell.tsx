'use client';

import { useMemo, useState } from 'react';
import { ExternalLink, Loader2, Sparkles } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
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
import {
  useCreatorIdByProfileId,
  useEnrichCreator,
  useImportCreatorsToAgency,
} from '../hooks';
import { EnrichConfirmDialog } from '../dialogs/enrich-confirm-dialog';
import { safeDict, safeNumber, safeString } from '../enriched-data/parsers/safe';
import { AnalyticsTab } from './sections/analytics-tab';
import { AudienceTab } from './sections/audience-tab';
import { PostsGrid } from './sections/posts-grid';
import { SimilarAccordion } from './sections/similar-accordion';

interface EnrichedShellProps {
  agencyId: string;
  creator: DiscoveryCreator;
  /**
   * Profile in any non-null mode. When `enrichmentMode` is RAW we hide the
   * Audience tab and surface a prominent "Enrich Profile" footer CTA. When
   * FULL / FULL_WITH_AUDIENCE we show the deep-link to the Creator DB.
   */
  profile: CreatorProfile;
}

/**
 * Polished tabbed sidebar that handles both pre-enrich (RAW) and post-enrich
 * (FULL / FULL_WITH_AUDIENCE) states. Two-column shell: meta column on the
 * left, Tabs (Analytics / Audience / Posts / Similar Accounts) on the right,
 * footer with an Enrich CTA pre-enrich and a Creator-DB deep-link post-enrich.
 *
 * The Audience tab is only rendered when `enrichmentMode === 'FULL_WITH_AUDIENCE'`
 * AND the platform is one IC populates audience for (IG / YT / TT). Twitter
 * and Twitch never populate audience, so they never see that tab.
 */
export function EnrichedShell({ agencyId, creator, profile }: EnrichedShellProps) {
  const { toast } = useToast();
  const platform = creator.platform.toLowerCase();
  const isFullEnriched =
    profile.enrichmentMode === 'FULL' ||
    profile.enrichmentMode === 'FULL_WITH_AUDIENCE';
  // Audience tab is only meaningful when IC populated audience data; that's
  // FULL_WITH_AUDIENCE mode AND a platform other than Twitter / Twitch.
  const showAudienceTab =
    profile.enrichmentMode === 'FULL_WITH_AUDIENCE' &&
    platform !== 'twitter' &&
    platform !== 'twitch';
  const [tab, setTab] = useState<'analytics' | 'audience' | 'posts' | 'similar'>('analytics');
  const [confirmOpen, setConfirmOpen] = useState(false);

  const common = useMemo(() => parseTopLevelCommon(profile.rawData), [profile.rawData]);

  // Per-platform stat extraction for the left column StatList.
  const stats = useMemo(
    () => buildStatsForPlatform(profile, platform),
    [profile, platform]
  );

  const rosterIdQuery = useCreatorIdByProfileId(agencyId, profile.id ?? null);
  const importToRoster = useImportCreatorsToAgency();
  const enrich = useEnrichCreator();
  const alreadyInRoster = !!rosterIdQuery.data;
  const enrichPending = enrich.isPending || importToRoster.isPending;

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

  // Pre-enrich FULL+AUDIENCE → import-to-roster flow (used from the footer CTA).
  const runEnrichAndImport = () => {
    enrich.mutate(
      {
        agencyId,
        platform: creator.platform,
        handle: creator.username,
        mode: 'FULL_WITH_AUDIENCE',
      },
      {
        onSuccess: (enriched) => {
          const enrichToast = enriched.cacheHit
            ? `Loaded from cache. ${enriched.creditsSpent} credit${enriched.creditsSpent === 1 ? '' : 's'} charged.`
            : 'Enriched. 25 credits charged.';
          importToRoster.mutate(
            {
              agencyId,
              items: [
                {
                  creatorProfileId: enriched.creatorProfileId ?? undefined,
                  platform: creator.platform,
                  handle: creator.username,
                  enrichIfMissing: false,
                },
              ],
            },
            {
              onSuccess: () => {
                toast({
                  title: 'Profile saved to Creator Roster',
                  description: enrichToast,
                });
                setConfirmOpen(false);
              },
              onError: (err) => {
                toast({
                  title: 'Enriched, roster import failed',
                  description:
                    (err instanceof Error ? err.message : 'Unknown error') +
                    ' — Retry from the roster page.',
                  variant: 'destructive',
                });
                setConfirmOpen(false);
              },
            }
          );
        },
        onError: (err) => {
          toast({
            title: 'Enrichment failed',
            description: err instanceof Error ? err.message : 'Unknown error',
            variant: 'destructive',
          });
          setConfirmOpen(false);
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
            {showAudienceTab ? (
              <TabsTrigger value="audience">Audience</TabsTrigger>
            ) : null}
            <TabsTrigger value="posts">Posts</TabsTrigger>
            <TabsTrigger value="similar">Similar Accounts</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto">
            <TabsContent value="analytics" className="mt-0">
              <AnalyticsTab creator={creator} profile={profile} />
            </TabsContent>

            {showAudienceTab ? (
              <TabsContent value="audience" className="mt-0">
                <AudienceTab profile={profile} />
              </TabsContent>
            ) : null}

            <TabsContent value="posts" className="mt-0">
              <PostsGrid agencyId={agencyId} creator={creator} />
            </TabsContent>

            <TabsContent value="similar" className="mt-0">
              <SimilarAccordion agencyId={agencyId} creator={creator} />
            </TabsContent>
          </div>
        </Tabs>

        {/* Footer:
         *   - already in roster (post-enrich) → deep-link to Creator DB
         *   - not enriched yet (RAW only) → prominent Enrich CTA
         *   - enriched but not yet in this agency's roster → Add to Roster lives in MetaColumn
         */}
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
        ) : !isFullEnriched ? (
          <div className="border-t border-tru-slate-100 bg-gradient-to-r from-tru-blue-50/60 to-tru-slate-50 px-6 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <h4 className="text-sm font-semibold text-tru-slate-900 flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-tru-blue-600" /> Enrich for full insights
                </h4>
                <p className="mt-0.5 text-[11px] text-tru-slate-500">
                  Unlocks audience demographics (geo, ages, gender, interests),
                  brand affinity, lookalikes, follower-growth curve. Free if your
                  agency enriched this creator in the last 30 days.
                </p>
              </div>
              <Button
                onClick={() => setConfirmOpen(true)}
                disabled={enrichPending}
                className="shrink-0 gap-2 bg-tru-blue-600 text-white hover:bg-tru-blue-700"
              >
                {enrichPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Enriching…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" /> Enrich Profile (25 cr)
                  </>
                )}
              </Button>
            </div>
            <EnrichConfirmDialog
              open={confirmOpen}
              onOpenChange={(o) => !enrichPending && setConfirmOpen(o)}
              onConfirm={runEnrichAndImport}
              pending={enrichPending}
            />
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

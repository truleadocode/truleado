'use client';

import { useMemo, useState } from 'react';
import { ExternalLink, Loader2, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  parseInstagramEnrichment,
  parseYouTubeEnrichment,
  parseTikTokEnrichment,
  parseTwitterEnrichment,
  parseTwitchEnrichment,
  parseTopLevelCommon,
  OverviewHeader,
  InstagramPanel,
  YouTubePanel,
  TikTokPanel,
  TwitterPanel,
  TwitchPanel,
} from '../enriched-data';
import type { CreatorProfile, DiscoveryCreator } from '../hooks';
import { useCreatorIdByProfileId, useImportCreatorsToAgency } from '../hooks';
import { Header } from './sections/header';
import { ProfileInfo } from './sections/profile-info';
import { PostsGrid } from './sections/posts-grid';
import { AudienceSection } from './sections/audience-section';
import { SimilarAccordion } from './sections/similar-accordion';
import { ConnectedAccordion } from './sections/connected-accordion';

interface EnrichedShellProps {
  agencyId: string;
  creator: DiscoveryCreator;
  /** Narrowed: enrichmentMode is FULL or FULL_WITH_AUDIENCE. */
  profile: CreatorProfile;
}

/**
 * Post-enrich layout. Replaces the legacy single-scroll sections with
 * sticky-top tabs (Overview / Audience / Posts / Platform) inside the
 * same `max-w-2xl` Sheet.
 *
 * Pre-enrich state is unchanged — `index.tsx` keeps the legacy shell
 * when `enrichmentMode === null`. Once the user pays for FULL or
 * FULL+AUDIENCE, the data deserves richer rendering — and that's what
 * this component delivers.
 */
export function EnrichedShell({ agencyId, creator, profile }: EnrichedShellProps) {
  const { toast } = useToast();
  const platform = creator.platform.toLowerCase();
  const showAudienceTab =
    profile.enrichmentMode === 'FULL_WITH_AUDIENCE' &&
    (platform === 'instagram' || platform === 'youtube' || platform === 'tiktok');

  const [tab, setTab] = useState<'overview' | 'audience' | 'posts' | 'platform'>('overview');

  // Memoise parsed shape — sidebar may re-render on each query refresh.
  const common = useMemo(() => parseTopLevelCommon(profile.rawData), [profile.rawData]);

  const rosterIdQuery = useCreatorIdByProfileId(agencyId, profile.id ?? null);
  const importToRoster = useImportCreatorsToAgency();

  const handleImport = () => {
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
    <>
      <Header creator={creator} mirroredAvatar={profile.profilePictureUrl ?? null} />

      <OverviewHeader common={common} lastEnrichedAt={profile.lastEnrichedAt} />

      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as typeof tab)}
        className="flex flex-col"
      >
        <TabsList
          className="sticky top-0 z-10 w-full justify-start gap-1 rounded-none border-b border-tru-slate-200 bg-white/95 px-6 backdrop-blur-sm"
        >
          <TabsTrigger value="overview">Overview</TabsTrigger>
          {showAudienceTab ? <TabsTrigger value="audience">Audience</TabsTrigger> : null}
          <TabsTrigger value="posts">Posts</TabsTrigger>
          <TabsTrigger value="platform">{platformLabel(platform)}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-0">
          <ProfileInfo profile={profile} isLoading={false} />
          <SimilarAccordion agencyId={agencyId} creator={creator} />
          <ConnectedAccordion agencyId={agencyId} creator={creator} />
        </TabsContent>

        {showAudienceTab ? (
          <TabsContent value="audience" className="mt-0">
            <AudienceSection profile={profile} />
          </TabsContent>
        ) : null}

        <TabsContent value="posts" className="mt-0">
          <PostsGrid agencyId={agencyId} creator={creator} />
        </TabsContent>

        <TabsContent value="platform" className="mt-0">
          <PlatformTab platform={platform} profile={profile} />
        </TabsContent>
      </Tabs>

      {/* Footer: deep-link if already in roster, else add-to-roster CTA. */}
      <div className="border-t border-tru-slate-100 bg-tru-slate-50 px-6 py-3">
        {rosterIdQuery.data ? (
          <a
            href={`/dashboard/creators/${rosterIdQuery.data}?platform=${platform}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between gap-2 text-sm font-semibold text-tru-blue-600 hover:underline"
          >
            <span>View full profile in Creator DB</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        ) : (
          <div>
            <Button
              onClick={handleImport}
              disabled={importToRoster.isPending}
              className="w-full gap-2 bg-tru-blue-600 text-white hover:bg-tru-blue-700"
            >
              {importToRoster.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Adding to roster…
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" /> Add to Creator Roster
                </>
              )}
            </Button>
            <p className="mt-2 text-[11px] text-tru-slate-500">
              This profile is already enriched in our cache. Adding it to your roster is free.
            </p>
          </div>
        )}
      </div>
    </>
  );
}

function platformLabel(platform: string): string {
  switch (platform) {
    case 'instagram':
      return 'Instagram';
    case 'youtube':
      return 'YouTube';
    case 'tiktok':
      return 'TikTok';
    case 'twitter':
      return 'Twitter / X';
    case 'twitch':
      return 'Twitch';
    default:
      return 'Platform';
  }
}

function PlatformTab({
  platform,
  profile,
}: {
  platform: string;
  profile: CreatorProfile;
}) {
  switch (platform) {
    case 'instagram':
      return <InstagramPanel data={parseInstagramEnrichment(profile.rawData)} />;
    case 'youtube':
      return <YouTubePanel data={parseYouTubeEnrichment(profile.rawData)} />;
    case 'tiktok':
      return <TikTokPanel data={parseTikTokEnrichment(profile.rawData)} />;
    case 'twitter':
      return <TwitterPanel data={parseTwitterEnrichment(profile.rawData)} />;
    case 'twitch':
      return <TwitchPanel data={parseTwitchEnrichment(profile.rawData)} />;
    default:
      return (
        <div className="px-6 py-8 text-center text-sm text-tru-slate-500">
          Platform-specific data not available.
        </div>
      );
  }
}

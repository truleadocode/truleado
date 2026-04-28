'use client';

import { useEffect, useRef } from 'react';
import { TrendingUp } from 'lucide-react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useToast } from '@/hooks/use-toast';
import { useCreatorProfile, useEnrichCreator, type DiscoveryCreator } from '../hooks';
import { Header } from './sections/header';
import { ProfileInfo } from './sections/profile-info';
import { PostsGrid } from './sections/posts-grid';
import { ApproximatedAnalytics } from './sections/approximated-analytics';
import { LockedBlock } from './sections/locked-block';
import { AudienceSection } from './sections/audience-section';
import { SimilarAccordion } from './sections/similar-accordion';
import { ConnectedAccordion } from './sections/connected-accordion';
import { EnrichCta } from './sections/enrich-cta';
import { Section } from './sections/section';

interface CreatorDetailSheetProps {
  agencyId: string;
  creator: DiscoveryCreator | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Single scrolling sidebar (replaces the previous 5-tab layout).
 *
 * On open, two cheap-and-cached calls fire automatically:
 *   - `enrichCreator(RAW)` if no enrichment exists for this creator (1 cr)
 *   - `fetchCreatorPosts` first page (1 cr)
 *
 * Both go through the per-agency 30-day dedupe layer in Phase A — repeating
 * an open inside the window costs the agency 0 credits, and a different
 * agency pays our margin while still skipping the IC call.
 */
export function CreatorDetailSheet({ agencyId, creator, open, onOpenChange }: CreatorDetailSheetProps) {
  const { toast } = useToast();
  const profileQuery = useCreatorProfile(creator?.platform, creator?.username);
  const profile = profileQuery.data ?? null;
  const enrich = useEnrichCreator();

  // Guard against re-firing RAW for the same creator within one session.
  const autoEnrichedFor = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!creator || !open) return;
    if (profileQuery.isLoading) return;

    const key = `${creator.platform.toLowerCase()}::${creator.username.toLowerCase()}`;
    if (autoEnrichedFor.current.has(key)) return;

    const needsRaw = profile === null || profile.enrichmentMode === null;
    if (!needsRaw) return;

    autoEnrichedFor.current.add(key);
    enrich.mutate(
      { agencyId, platform: creator.platform, handle: creator.username, mode: 'RAW' },
      {
        onSuccess: (result) => {
          if (result.cacheHit && result.creditsSpent === 0) {
            toast({ title: 'Loaded from cache', description: 'No credits charged.' });
          }
        },
        // Keep the guard set on error — re-firing on every sheet open would
        // hammer IC for a creator that doesn't exist (404) or for which the
        // request consistently fails. A genuine retry happens via the manual
        // Enrich CTA at the bottom of the sheet.
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [creator?.providerUserId, open, profileQuery.isLoading, profile?.enrichmentMode]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-2xl overflow-y-auto p-0 sm:max-w-2xl">
        {creator ? (
          <>
            <Header creator={creator} mirroredAvatar={profile?.profilePictureUrl ?? null} />

            <ProfileInfo
              profile={profile}
              isLoading={profileQuery.isLoading || (enrich.isPending && profile === null)}
            />

            <PostsGrid agencyId={agencyId} creator={creator} />

            <ApproximatedAnalytics agencyId={agencyId} creator={creator} />

            {profile?.enrichmentMode === 'FULL' || profile?.enrichmentMode === 'FULL_WITH_AUDIENCE' ? (
              <FollowerGrowthAvailable />
            ) : (
              <LockedBlock
                title="Follower growth"
                description="12-month subscribers / followers trend."
              />
            )}

            <AudienceSection profile={profile} />

            <EnrichCta agencyId={agencyId} creator={creator} profile={profile} />

            <SimilarAccordion agencyId={agencyId} creator={creator} />

            <ConnectedAccordion agencyId={agencyId} creator={creator} />
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

/**
 * Stub shown once a creator is FULL or FULL_WITH_AUDIENCE enriched. Pointing
 * to the Creator DB page where the actual chart will land in a later phase
 * keeps the locked → unlocked transition visible without committing to the
 * chart UI yet.
 */
function FollowerGrowthAvailable() {
  return (
    <Section title="Follower growth">
      <div className="flex items-center gap-3 rounded-md border border-tru-border-soft bg-tru-slate-50 p-4 text-sm text-tru-slate-700">
        <TrendingUp className="h-4 w-4 shrink-0 text-tru-success" />
        <span>
          12-month growth data is available — view it on the creator&apos;s Roster page.
        </span>
      </div>
    </Section>
  );
}

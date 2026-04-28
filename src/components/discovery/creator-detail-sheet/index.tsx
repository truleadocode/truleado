'use client';

import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useCreatorProfile, type DiscoveryCreator } from '../hooks';
import { Header } from './sections/header';
import { ProfileInfo } from './sections/profile-info';
import { PostsGrid } from './sections/posts-grid';
import { ApproximatedAnalytics } from './sections/approximated-analytics';
import { LockedBlock } from './sections/locked-block';
import { AudienceSection } from './sections/audience-section';
import { SimilarAccordion } from './sections/similar-accordion';
import { ConnectedAccordion } from './sections/connected-accordion';
import { EnrichCta } from './sections/enrich-cta';

interface CreatorDetailSheetProps {
  agencyId: string;
  creator: DiscoveryCreator | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Single scrolling sidebar (replaces the previous 5-tab layout). Sections
 * are stacked top-to-bottom in a deliberate reading order:
 *   1. Header                        — instant, from the search row
 *   2. Profile info                  — RAW enrichment data
 *   3. Recent posts                  — fetchCreatorPosts payload
 *   4. Approximated analytics        — client-side from posts
 *   5. Follower-growth (locked)      — unlocked by Full enrichment
 *   6. Audience demographics         — unlocked by Full+Audience
 *   7. Enrich CTA                    — single action that flips locks
 *   8. Similar / Connected (collapsed accordions)
 *
 * Phase B keeps the existing 3-tier enrich UI inside `<EnrichCta>`. Auto-load
 * (Phase C), the analytics computation (D), and the single-CTA wiring (E)
 * land in subsequent commits.
 */
export function CreatorDetailSheet({ agencyId, creator, open, onOpenChange }: CreatorDetailSheetProps) {
  const profileQuery = useCreatorProfile(creator?.platform, creator?.username);
  const profile = profileQuery.data ?? null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-2xl overflow-y-auto p-0 sm:max-w-2xl">
        {creator ? (
          <>
            <Header creator={creator} mirroredAvatar={profile?.profilePictureUrl ?? null} />

            <ProfileInfo profile={profile} isLoading={profileQuery.isLoading} />

            <PostsGrid agencyId={agencyId} creator={creator} />

            <ApproximatedAnalytics />

            <LockedBlock
              title="Follower growth"
              description="12-month subscribers / followers trend."
            />

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

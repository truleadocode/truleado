'use client';

import { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCreatorProfile } from '../hooks';
import type { DiscoveryCreator } from '../hooks';
import { avatarColorFor, formatCount, initialsFor } from '../primitives/tokens';
import { OverviewTab } from './overview-tab';
import { PostsTab } from './posts-tab';
import { SimilarTab } from './similar-tab';
import { ConnectedTab } from './connected-tab';
import { AudienceTab } from './audience-tab';

interface CreatorDetailSheetProps {
  agencyId: string;
  creator: DiscoveryCreator | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreatorDetailSheet({ agencyId, creator, open, onOpenChange }: CreatorDetailSheetProps) {
  const [tab, setTab] = useState<'overview' | 'posts' | 'similar' | 'connected' | 'audience'>('overview');
  const profileQuery = useCreatorProfile(creator?.platform, creator?.username);

  const contentPlatform = creator?.platform.toLowerCase() ?? '';
  const supportsPosts = ['instagram', 'tiktok', 'youtube'].includes(contentPlatform);
  const profile = profileQuery.data;
  const audienceAvailable = profile?.enrichmentMode === 'FULL_WITH_AUDIENCE';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-2xl overflow-y-auto p-0 sm:max-w-2xl">
        {creator ? (
          <>
            <SheetHeader className="border-b border-tru-slate-200 px-6 pt-6 pb-4">
              <div className="flex items-start gap-4">
                <Avatar creator={creator} mirrored={profile?.profilePictureUrl ?? null} />
                <div className="min-w-0 flex-1">
                  <SheetTitle className="truncate text-left text-lg">
                    {creator.fullName ?? creator.username}
                  </SheetTitle>
                  <SheetDescription className="flex items-center gap-3 text-left text-xs text-tru-slate-500">
                    <span>@{creator.username}</span>
                    <span>•</span>
                    <span className="uppercase">{creator.platform}</span>
                    {creator.followers !== null ? (
                      <>
                        <span>•</span>
                        <span>{formatCount(creator.followers)} followers</span>
                      </>
                    ) : null}
                    <a
                      href={externalUrl(creator)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-auto inline-flex items-center gap-1 text-[11px] text-tru-blue-600 hover:underline"
                    >
                      Open on platform <ExternalLink className="h-3 w-3" />
                    </a>
                  </SheetDescription>
                </div>
              </div>
            </SheetHeader>

            <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="w-full">
              <TabsList className="w-full justify-start gap-1 rounded-none border-b border-tru-slate-200 bg-transparent px-6">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="posts" disabled={!supportsPosts}>
                  Posts {!supportsPosts ? <span className="ml-1 text-[10px]">(n/a)</span> : null}
                </TabsTrigger>
                <TabsTrigger value="similar">Similar</TabsTrigger>
                <TabsTrigger value="connected">Connected</TabsTrigger>
                <TabsTrigger value="audience" disabled={!audienceAvailable}>
                  Audience {!audienceAvailable ? <span className="ml-1 text-[10px]">(enrich first)</span> : null}
                </TabsTrigger>
              </TabsList>
              <div className="p-6">
                <TabsContent value="overview" className="mt-0">
                  <OverviewTab
                    agencyId={agencyId}
                    creator={creator}
                    profile={profile ?? null}
                    isLoading={profileQuery.isLoading}
                  />
                </TabsContent>
                <TabsContent value="posts" className="mt-0">
                  {supportsPosts ? (
                    <PostsTab agencyId={agencyId} creator={creator} />
                  ) : (
                    <Placeholder>Content endpoints are only available on Instagram, TikTok, and YouTube.</Placeholder>
                  )}
                </TabsContent>
                <TabsContent value="similar" className="mt-0">
                  <SimilarTab agencyId={agencyId} creator={creator} />
                </TabsContent>
                <TabsContent value="connected" className="mt-0">
                  <ConnectedTab agencyId={agencyId} creator={creator} />
                </TabsContent>
                <TabsContent value="audience" className="mt-0">
                  <AudienceTab profile={profile ?? null} />
                </TabsContent>
              </div>
            </Tabs>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function Avatar({ creator, mirrored }: { creator: DiscoveryCreator; mirrored: string | null }) {
  const src = mirrored ?? creator.pictureUrl;
  if (src) {
    return (
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full shadow-[inset_0_0_0_2px_#fff]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
      </div>
    );
  }
  const color = avatarColorFor(creator.providerUserId);
  return (
    <div
      className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white shadow-[inset_0_0_0_2px_#fff]"
      style={{ background: color }}
    >
      {initialsFor(creator.fullName ?? creator.username)}
    </div>
  );
}

function externalUrl(creator: DiscoveryCreator): string {
  const h = creator.username;
  switch (creator.platform.toLowerCase()) {
    case 'instagram':
      return `https://instagram.com/${h}`;
    case 'youtube':
      return `https://youtube.com/${h.startsWith('@') ? h : '@' + h}`;
    case 'tiktok':
      return `https://tiktok.com/@${h.replace(/^@/, '')}`;
    case 'twitter':
      return `https://twitter.com/${h}`;
    case 'twitch':
      return `https://twitch.tv/${h}`;
    default:
      return '#';
  }
}

function Placeholder({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-dashed border-tru-slate-300 bg-tru-slate-50 p-6 text-center text-sm text-tru-slate-500">
      {children}
    </div>
  );
}

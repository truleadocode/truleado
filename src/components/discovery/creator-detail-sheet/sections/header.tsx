'use client';

import { ExternalLink } from 'lucide-react';
import { SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import type { DiscoveryCreator } from '../../hooks';
import { avatarColorFor, formatCount, initialsFor } from '../../primitives/tokens';

interface HeaderProps {
  creator: DiscoveryCreator;
  mirroredAvatar: string | null;
}

export function Header({ creator, mirroredAvatar }: HeaderProps) {
  return (
    <SheetHeader className="border-b border-tru-slate-200 px-6 pt-6 pb-4">
      <div className="flex items-start gap-4">
        <Avatar creator={creator} mirrored={mirroredAvatar} />
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

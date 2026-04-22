'use client';

import { Mail, Link2, CheckCircle2, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import type { DiscoveryCreator } from '../hooks';
import {
  avatarColorFor,
  formatCount,
  formatPercent,
  initialsFor,
} from '../primitives/tokens';

interface CreatorRowProps {
  creator: DiscoveryCreator;
  selected: boolean;
  onToggleSelect: () => void;
  onRowClick: () => void;
}

const PLATFORM_URL: Record<string, (handle: string) => string> = {
  instagram: (h) => `https://instagram.com/${h}`,
  youtube: (h) => `https://youtube.com/${h.startsWith('@') ? h : '@' + h}`,
  tiktok: (h) => `https://tiktok.com/@${h.replace(/^@/, '')}`,
  twitter: (h) => `https://twitter.com/${h}`,
  twitch: (h) => `https://twitch.tv/${h}`,
};

export function CreatorRow({ creator, selected, onToggleSelect, onRowClick }: CreatorRowProps) {
  const platform = creator.platform.toLowerCase();
  const externalUrl = PLATFORM_URL[platform]?.(creator.username);
  const cached = !!creator.creatorProfileId;

  return (
    <tr
      className="group cursor-pointer border-b border-tru-border-soft transition-colors last:border-b-0 hover:bg-[#FAFBFD]"
      onClick={onRowClick}
    >
      {/* Select */}
      <td className="w-[52px] px-3.5 py-4 align-middle" onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={selected}
          onCheckedChange={onToggleSelect}
          aria-label={`Select ${creator.username}`}
          className="h-4 w-4"
        />
      </td>

      {/* Creator (avatar + name + location) */}
      <td className="min-w-[240px] px-3.5 py-4 align-middle">
        <div className="flex items-center gap-3">
          <Avatar creator={creator} />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 truncate text-[14px] font-semibold text-tru-slate-900">
              <span className="truncate">{creator.fullName ?? creator.username}</span>
              {/* No verified field from discovery — surfaces after enrichment via cached profile */}
            </div>
            <div className="truncate text-[12.5px] text-tru-slate-500">
              @{creator.username}
              {cached ? (
                <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-tru-blue-50 px-1.5 py-0 text-[10px] font-semibold text-tru-blue-700">
                  <CheckCircle2 className="h-2.5 w-2.5" /> cached
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </td>

      {/* Social link */}
      <td className="w-[90px] px-3.5 py-4 text-center align-middle">
        {externalUrl ? (
          <a
            href={externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] border border-tru-slate-200 text-tru-slate-700 hover:border-tru-slate-300 hover:bg-tru-slate-50"
            aria-label={`Open ${creator.username} on ${platform}`}
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        ) : null}
      </td>

      {/* Followers */}
      <td className="w-[100px] px-3.5 py-4 align-middle text-[14px] font-bold tabular-nums text-tru-slate-900">
        {formatCount(creator.followers)}
      </td>

      {/* Email availability (enriched only) */}
      <td className="w-[80px] px-3.5 py-4 text-center align-middle text-tru-slate-300">
        <Mail className="mx-auto h-4 w-4" />
      </td>

      {/* ER */}
      <td className="w-[80px] px-3.5 py-4 align-middle text-[13.5px] tabular-nums text-tru-slate-800">
        {formatPercent(creator.engagementPercent)}
      </td>

      {/* Growth (enriched only — placeholder for discovery rows) */}
      <td className="w-[140px] px-3.5 py-4 align-middle text-[12.5px] text-tru-slate-400">—</td>

      {/* External links (enriched only) */}
      <td className="w-[120px] px-3.5 py-4 align-middle">
        <span className="inline-flex items-center gap-1 rounded-full border border-tru-slate-200 px-2.5 py-1 text-[12px] font-medium text-tru-slate-400">
          <Link2 className="h-3 w-3" />—
        </span>
      </td>

      {/* Frequently used hashtags (enriched only) */}
      <td className="px-3.5 py-4 align-middle text-[12.5px] text-tru-slate-400">—</td>
    </tr>
  );
}

function Avatar({ creator }: { creator: DiscoveryCreator }) {
  const color = avatarColorFor(creator.providerUserId);
  if (creator.pictureUrl) {
    return (
      <div
        className={cn(
          'relative h-10 w-10 shrink-0 overflow-hidden rounded-full',
          'shadow-[inset_0_0_0_2px_#ffffff]'
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={creator.pictureUrl}
          alt=""
          className="h-full w-full object-cover"
          referrerPolicy="no-referrer"
        />
      </div>
    );
  }
  return (
    <div
      aria-hidden
      className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white shadow-[inset_0_0_0_2px_#ffffff]"
      style={{ background: color }}
    >
      {initialsFor(creator.fullName ?? creator.username)}
    </div>
  );
}

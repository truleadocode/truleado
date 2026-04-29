'use client';

import { Briefcase, Globe, Loader2, MapPin, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { CommonTopLevel } from '../parsers/types';
import {
  avatarColorFor,
  initialsFor,
  proxiedImageSrc,
} from '../../primitives/tokens';
import { CrossPlatformSummary } from './cross-platform-summary';
import { LinksUsed } from './links-used';
import { StatList, type StatListEntry } from './stat-list';

interface MetaColumnProps {
  /** Display name (full_name or fallback to handle). */
  displayName: string;
  /** Handle (without @). */
  handle: string;
  /** Mirrored profile picture URL, when available. Falls back to coloured initials. */
  pictureUrl: string | null;
  /** Provider user id (used for stable avatar colour). */
  providerUserId: string;
  /** Top-level common fields parsed from raw_data. */
  common: CommonTopLevel;
  /** Currently-clicked platform (lowercase). */
  currentPlatform: string;
  /** Followers on the current platform. */
  currentFollowers: number | null;
  /** Engagement % on the current platform. */
  currentEngagementPercent: number | null;
  /** Bio / description from the platform sub-block. */
  biography: string | null;
  /** 8-row stat list pre-built by the caller (see buildStandardStatList). */
  stats: StatListEntry[];
  /** "Add creator to a list" CTA — wired to roster import in the parent. */
  onAddToRoster: () => void;
  /** Pending state for the roster import. */
  rosterPending: boolean;
  /** Already-in-roster flag. When true, hide the Add CTA. */
  alreadyInRoster: boolean;
}

/**
 * Left meta column inside the EnrichedShell. Composes:
 *   - Avatar / display name / handle
 *   - Bio
 *   - Inline meta chips (location, language, niche)
 *   - Links Used
 *   - Add to Roster button (or a quiet "in roster" badge)
 *   - Cross-Platform Summary card
 *   - Stat list card
 */
export function MetaColumn({
  displayName,
  handle,
  pictureUrl,
  providerUserId,
  common,
  currentPlatform,
  currentFollowers,
  currentEngagementPercent,
  biography,
  stats,
  onAddToRoster,
  rosterPending,
  alreadyInRoster,
}: MetaColumnProps) {
  const topNiche = common.aiNiches[0]?.name ?? null;
  return (
    <aside className="flex w-72 shrink-0 flex-col gap-4 border-r border-tru-slate-100 bg-tru-slate-50/40 px-4 py-5 overflow-y-auto">
      {/* Identity block */}
      <div>
        <div className="flex items-start gap-3">
          <Avatar
            src={pictureUrl}
            displayName={displayName}
            providerUserId={providerUserId}
          />
          <div className="min-w-0">
            <h2 className="truncate text-[15px] font-bold text-tru-slate-900">
              {displayName}
            </h2>
            <div className="truncate text-xs text-tru-blue-600">@{handle}</div>
          </div>
        </div>
        {biography ? (
          <p className="mt-3 line-clamp-3 text-[12px] leading-relaxed text-tru-slate-600">
            {biography}
          </p>
        ) : null}
      </div>

      {/* Meta chips */}
      <ul className="space-y-1.5 text-[12px] text-tru-slate-700">
        {common.location ? (
          <li className="inline-flex items-center gap-2">
            <MapPin className="h-3 w-3 text-tru-slate-500" />
            {common.location}
          </li>
        ) : null}
        {common.speakingLanguage ? (
          <li className="inline-flex items-center gap-2">
            <Globe className="h-3 w-3 text-tru-slate-500" />
            {common.speakingLanguage}
          </li>
        ) : null}
        {topNiche ? (
          <li className="inline-flex items-center gap-2">
            <Briefcase className="h-3 w-3 text-tru-slate-500" />
            {topNiche}
          </li>
        ) : null}
      </ul>

      {common.linksInBio.length > 0 ? <LinksUsed links={common.linksInBio} /> : null}

      {/* Roster action */}
      {alreadyInRoster ? (
        <Badge variant="secondary" className="self-start gap-1">
          <UserPlus className="h-3 w-3" /> In your roster
        </Badge>
      ) : (
        <Button
          onClick={onAddToRoster}
          disabled={rosterPending}
          className="w-full gap-2 bg-tru-blue-600 text-white hover:bg-tru-blue-700"
        >
          {rosterPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Adding…
            </>
          ) : (
            <>
              <UserPlus className="h-4 w-4" /> Add creator to a list
            </>
          )}
        </Button>
      )}

      <CrossPlatformSummary
        creatorHas={common.creatorHas}
        currentPlatform={currentPlatform}
        currentFollowers={currentFollowers}
        currentEngagementPercent={currentEngagementPercent}
      />

      <StatList entries={stats} />
    </aside>
  );
}

function Avatar({
  src,
  displayName,
  providerUserId,
}: {
  src: string | null;
  displayName: string;
  providerUserId: string;
}) {
  if (src) {
    return (
      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={proxiedImageSrc(src)}
          alt=""
          className="h-full w-full object-cover"
          referrerPolicy="no-referrer"
        />
      </div>
    );
  }
  return (
    <div
      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
      style={{ background: avatarColorFor(providerUserId) }}
    >
      {initialsFor(displayName)}
    </div>
  );
}

'use client';

import { CheckCircle2, ExternalLink, Mail, MapPin, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { CommonTopLevel } from '../parsers/types';
import { KeyValueGrid, type KeyValueRow } from '../primitives/key-value-grid';

interface OverviewHeaderProps {
  /** Pre-formatted top-level common fields parsed from raw_data. */
  common: CommonTopLevel;
  /** ISO date string from creator_profiles.last_enriched_at — when this snapshot was taken. */
  lastEnrichedAt: string | null;
}

/**
 * Header band that sits between the avatar header and the tabs. Surfaces
 * top-level common fields that DO populate (email is always reliable;
 * location / niche / brand-deals depend on platform).
 *
 * Per the README, IG / Twitter / Twitch don't return most top-level
 * fields. The KeyValueGrid skips null rows so the band collapses
 * gracefully on those platforms.
 */
export function OverviewHeader({ common, lastEnrichedAt }: OverviewHeaderProps) {
  const rows: KeyValueRow[] = [
    {
      key: 'Email',
      value: common.email ? (
        <a
          href={`mailto:${common.email}`}
          className="inline-flex items-center gap-1 text-tru-blue-600 hover:underline"
        >
          <Mail className="h-3 w-3" />
          {common.email}
          {common.emailType ? (
            <span className="rounded-full bg-tru-slate-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-tru-slate-600">
              {common.emailType}
            </span>
          ) : null}
        </a>
      ) : null,
    },
    {
      key: 'Location',
      value: common.location ? (
        <span className="inline-flex items-center gap-1">
          <MapPin className="h-3 w-3 text-tru-slate-500" />
          {common.location}
        </span>
      ) : null,
    },
    {
      key: 'Language',
      value: common.speakingLanguage,
    },
    {
      key: 'Account type',
      value: deriveAccountType(common),
    },
  ];

  // Topic chips — only present on YouTube and TikTok.
  const niches = common.aiNiches.length > 0 ? common.aiNiches : [];

  return (
    <section className="border-b border-tru-slate-100 bg-tru-slate-50/40 px-6 py-4">
      <div className="flex flex-wrap items-center gap-2">
        {common.hasBrandDeals ? (
          <Badge variant="secondary" className="gap-1 bg-emerald-50 text-emerald-700">
            <CheckCircle2 className="h-3 w-3" /> Brand deals
          </Badge>
        ) : null}
        {common.hasLinkInBio ? (
          <Badge variant="secondary" className="gap-1">
            <ExternalLink className="h-3 w-3" /> Link in bio
          </Badge>
        ) : null}
        {common.isCreator ? (
          <Badge variant="secondary" className="gap-1">
            <Users className="h-3 w-3" /> Creator
          </Badge>
        ) : null}
        {niches.slice(0, 3).map((n) => (
          <Badge key={n.name} variant="outline" className="text-tru-slate-700">
            {n.name}
            {n.percentage > 0 ? (
              <span className="ml-1 tabular-nums text-tru-slate-500">{n.percentage.toFixed(0)}%</span>
            ) : null}
          </Badge>
        ))}
      </div>

      <div className="mt-3">
        <KeyValueGrid rows={rows} />
      </div>

      {lastEnrichedAt ? (
        <div className="mt-3 text-[10.5px] uppercase tracking-wider text-tru-slate-400">
          Last enriched {new Date(lastEnrichedAt).toLocaleDateString()}
        </div>
      ) : null}
    </section>
  );
}

function deriveAccountType(common: CommonTopLevel): string | null {
  if (common.isBusiness) return 'Business';
  if (common.isCreator) return 'Creator';
  return null;
}

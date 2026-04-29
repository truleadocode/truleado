'use client';

import { CheckCircle2, ExternalLink, Gamepad2, ShoppingBag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatCount } from '../../primitives/tokens';
import type { TwitchEnrichment } from '../parsers/types';
import { StatBox } from '../primitives/stat-box';

interface TwitchPanelProps {
  data: TwitchEnrichment;
}

export function TwitchPanel({ data }: TwitchPanelProps) {
  return (
    <div className="space-y-5 px-6 py-5">
      {/* Headline metrics */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatBox label="Followers" value={formatCount(data.followerCount)} />
        <StatBox label="Avg viewers" value={formatCount(data.avgViews)} />
        <StatBox
          label="Streamed (30d)"
          value={data.streamedHoursLast30 !== null ? `${data.streamedHoursLast30.toFixed(0)} h` : null}
        />
        <StatBox label="Streams (30d)" value={formatCount(data.streamsCountLast30)} />
      </div>

      {/* Last broadcast info */}
      <div className="flex flex-wrap items-center gap-2">
        {data.isPartner ? (
          <Badge variant="secondary" className="gap-1 bg-purple-50 text-purple-700">
            <CheckCircle2 className="h-3 w-3" /> Twitch Partner
          </Badge>
        ) : null}
        {data.lastBroadcastGame ? (
          <Badge variant="outline" className="gap-1">
            <Gamepad2 className="h-3 w-3" /> Last game: {data.lastBroadcastGame}
          </Badge>
        ) : null}
        {data.lastStreamed ? (
          <span className="text-[11px] text-tru-slate-500">
            Last streamed{' '}
            <span className="font-semibold text-tru-slate-700">
              {new Date(data.lastStreamed).toLocaleDateString()}
            </span>
          </span>
        ) : null}
        <Flags flags={data.flags} />
      </div>

      {/* Channel panels (Twitch's profile sidebar widgets) */}
      {data.panels.length > 0 ? (
        <Section label={`Channel panels (${data.panels.length})`}>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {data.panels.map((p, i) => (
              <li
                key={`${p.title ?? 'panel'}-${i}`}
                className="flex items-start gap-3 rounded-md border border-tru-border-soft p-3"
              >
                {p.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.imageUrl}
                    alt=""
                    className="h-12 w-12 shrink-0 rounded object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : null}
                <div className="min-w-0 flex-1">
                  {p.title ? (
                    <div className="truncate text-sm font-semibold text-tru-slate-900">
                      {p.title}
                    </div>
                  ) : null}
                  {p.description ? (
                    <div className="mt-0.5 line-clamp-2 text-[11px] text-tru-slate-500">
                      {p.description}
                    </div>
                  ) : null}
                  {p.url ? (
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-flex items-center gap-1 text-[11px] text-tru-blue-600 hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Open
                    </a>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {/* Cross-platform handles surfaced under social_media */}
      {Object.keys(data.socialMedia).length > 0 ? (
        <Section label="Other socials">
          <ul className="flex flex-wrap gap-1.5">
            {Object.entries(data.socialMedia).map(([platform, url]) => (
              <li key={platform}>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-md border border-tru-border-soft px-2 py-1 text-[12px] text-tru-slate-700 hover:border-tru-blue-600 hover:bg-tru-blue-50 hover:text-tru-blue-600"
                >
                  <ExternalLink className="h-3 w-3" />
                  {platform}
                </a>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {/* Bio links */}
      {data.linksInBio.length > 0 ? (
        <Section label="Links">
          <ul className="space-y-1">
            {data.linksInBio.slice(0, 6).map((url) => (
              <li key={url} className="truncate text-[12px]">
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-tru-blue-600 hover:underline"
                >
                  {url}
                </a>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section>
      <h4 className="mb-2 text-[10.5px] font-bold uppercase tracking-[0.08em] text-tru-slate-400">
        {label}
      </h4>
      {children}
    </section>
  );
}

function Flags({ flags }: { flags: TwitchEnrichment['flags'] }) {
  const chips: Array<{ key: string; label: string; icon: React.ReactNode }> = [];
  if (flags.hasMerch) chips.push({ key: 'm', label: 'Has merch', icon: <ShoppingBag className="h-3 w-3" /> });
  if (flags.hasPaidPartnership)
    chips.push({ key: 'p', label: 'Paid partnership', icon: <CheckCircle2 className="h-3 w-3" /> });
  if (flags.promotesAffiliateLinks)
    chips.push({ key: 'a', label: 'Affiliate links', icon: <ExternalLink className="h-3 w-3" /> });
  return (
    <>
      {chips.map((c) => (
        <Badge key={c.key} variant="secondary" className="gap-1">
          {c.icon}
          {c.label}
        </Badge>
      ))}
    </>
  );
}

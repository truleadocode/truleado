'use client';

import { CheckCircle2, MapPin, ShoppingBag, Verified } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatCount, formatPercent } from '../../primitives/tokens';
import type { TikTokEnrichment } from '../parsers/types';
import { SparklineCard } from '../primitives/sparkline-card';
import { StatBox } from '../primitives/stat-box';
import { TopList } from '../primitives/top-list';

interface TikTokPanelProps {
  data: TikTokEnrichment;
}

export function TikTokPanel({ data }: TikTokPanelProps) {
  return (
    <div className="space-y-5 px-6 py-5">
      {/* Headline metrics */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatBox label="Followers" value={formatCount(data.followerCount)} />
        <StatBox label="ER" value={formatPercent(data.engagementPercent)} />
        <StatBox label="Avg plays" value={formatCount(data.averages.plays)} />
        <StatBox label="Total likes" value={formatCount(data.totals.likes)} />
      </div>

      {/* Median row */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatBox label="Likes (median)" value={formatCount(data.medians.likes)} compact />
        <StatBox label="Comments (median)" value={formatCount(data.medians.comments)} compact />
        <StatBox label="Saves (median)" value={formatCount(data.medians.saves)} compact />
        <StatBox label="Shares (median)" value={formatCount(data.medians.shares)} compact />
      </div>

      {/* Reach + saves over time */}
      {data.reachOverTime.length > 1 ? (
        <SparklineCard
          label="Reach score over recent posts"
          values={data.reachOverTime}
          current={data.reachScore !== null ? data.reachScore.toFixed(2) : undefined}
          hint={`Last ${data.reachOverTime.length} posts`}
        />
      ) : null}

      {data.savesOverTime.length > 1 ? (
        <SparklineCard
          label="Saves over recent posts"
          values={data.savesOverTime}
          current={formatCount(data.medians.saves)}
          hint={`Last ${data.savesOverTime.length} posts (median shown)`}
        />
      ) : null}

      {/* Region pill + flag chips */}
      <div className="flex flex-wrap items-center gap-1.5">
        {data.region ? (
          <Badge variant="secondary" className="gap-1">
            <MapPin className="h-3 w-3" /> {data.region}
          </Badge>
        ) : null}
        <Flags flags={data.flags} />
      </div>

      {/* Niches */}
      {data.niches.length > 0 ? (
        <Section label="Top niches">
          <div className="flex flex-wrap gap-1.5">
            {data.niches.map((n) => (
              <Badge key={n} variant="outline" className="text-tru-slate-700">
                {n}
              </Badge>
            ))}
          </div>
        </Section>
      ) : null}

      {/* Brands found in posts */}
      {data.brandsFound.length > 0 ? (
        <Section label="Brands mentioned">
          <div className="flex flex-wrap gap-1.5">
            {data.brandsFound.map((b) => (
              <Badge key={b} variant="outline" className="text-tru-slate-700">
                {b}
              </Badge>
            ))}
          </div>
        </Section>
      ) : null}

      {/* Hashtags */}
      {data.hashtags.length > 0 ? (
        <TopList
          title="Recent hashtags"
          entries={data.hashtags.slice(0, 16).map((h, i) => ({
            label: `#${h.replace(/^#/, '')}`,
            value: data.hashtags.length - i,
          }))}
          showBars={false}
          formatValue={() => ''}
          max={16}
        />
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

function Flags({ flags }: { flags: TikTokEnrichment['flags'] }) {
  const chips: Array<{ key: string; label: string; icon: React.ReactNode }> = [];
  if (flags.isVerified) chips.push({ key: 'v', label: 'Verified', icon: <Verified className="h-3 w-3" /> });
  if (flags.ttSeller) chips.push({ key: 's', label: 'TikTok Seller', icon: <ShoppingBag className="h-3 w-3" /> });
  if (flags.isCommerce)
    chips.push({ key: 'c', label: 'Commerce account', icon: <ShoppingBag className="h-3 w-3" /> });
  if (flags.hasPaidPartnership)
    chips.push({ key: 'p', label: 'Paid partnership', icon: <CheckCircle2 className="h-3 w-3" /> });
  if (flags.hasMerch) chips.push({ key: 'm', label: 'Has merch', icon: <ShoppingBag className="h-3 w-3" /> });
  if (flags.usesLinkInBio)
    chips.push({ key: 'l', label: 'Uses link in bio', icon: <CheckCircle2 className="h-3 w-3" /> });
  if (chips.length === 0) return null;
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

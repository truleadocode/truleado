'use client';

import { CheckCircle2, MessageSquare, ShoppingBag, Verified } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatCount, formatPercent } from '../../primitives/tokens';
import type { YouTubeEnrichment } from '../parsers/types';
import { BarChart } from '../primitives/bar-chart';
import { StatBox } from '../primitives/stat-box';
import { TopList } from '../primitives/top-list';

interface YouTubePanelProps {
  data: YouTubeEnrichment;
}

export function YouTubePanel({ data }: YouTubePanelProps) {
  // Sort posts_per_month chronologically (keys look like "2024-01" or "Jan 2024")
  const ppmData = data.postsPerMonth
    ? Object.entries(data.postsPerMonth)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => ({ key: shortenMonth(key), value }))
    : [];

  return (
    <div className="space-y-5 px-6 py-5">
      {/* Headline metrics */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatBox label="Subscribers" value={formatCount(data.subscriberCount)} />
        <StatBox label="Total views" value={formatCount(data.viewCount)} />
        <StatBox label="Videos" value={formatCount(data.videoCount)} />
        <StatBox label="ER" value={formatPercent(data.engagement.overall)} />
      </div>

      {/* Long-vs-shorts split — YouTube's signature breakdown */}
      <Section label="Long videos vs Shorts">
        <div className="grid grid-cols-2 gap-3">
          <SplitCard
            title="Long videos"
            metrics={[
              { label: 'Avg views', value: formatCount(data.views.avgLong) },
              { label: 'ER', value: formatPercent(data.engagement.long) },
              { label: 'Posts/mo', value: numberOrDash(data.postingFrequency.long) },
            ]}
          />
          <SplitCard
            title="Shorts"
            metrics={[
              { label: 'Avg views', value: formatCount(data.views.avgShorts) },
              { label: 'ER', value: formatPercent(data.engagement.shorts) },
              { label: 'Posts/mo', value: numberOrDash(data.postingFrequency.shorts) },
            ]}
          />
        </div>
        {data.shortsPercentage !== null ? (
          <div className="mt-2 text-[11px] text-tru-slate-500">
            Shorts make up <span className="font-semibold text-tru-slate-700">{data.shortsPercentage.toFixed(0)}%</span> of recent uploads.
          </div>
        ) : null}
      </Section>

      {/* Posting cadence over time */}
      {ppmData.length > 0 ? (
        <Section label="Posts per month">
          <BarChart data={ppmData} highlightTop={1} />
        </Section>
      ) : null}

      {/* Flag chips */}
      <Flags flags={data.flags} />

      {/* Niches & topics */}
      {data.niches.length > 0 ? (
        <Section label="Top niches">
          <div className="flex flex-wrap gap-1.5">
            {data.niches.slice(0, 10).map((n) => (
              <Badge key={n} variant="outline" className="text-tru-slate-700">
                {n}
              </Badge>
            ))}
          </div>
        </Section>
      ) : null}

      {data.videoTopics.length > 0 ? (
        <Section label="Recurring video topics">
          <div className="flex flex-wrap gap-1.5">
            {data.videoTopics.slice(0, 12).map((t) => (
              <Badge key={t} variant="outline" className="text-tru-slate-700">
                {t}
              </Badge>
            ))}
          </div>
        </Section>
      ) : null}

      {/* Income block (YouTube only) */}
      {data.income ? <IncomeBlock income={data.income} /> : null}

      {/* Emails harvested from video descriptions */}
      {data.emailsFromVideoDesc.length > 0 ? (
        <Section label="Contact emails (from video descriptions)">
          <ul className="space-y-1">
            {data.emailsFromVideoDesc.slice(0, 6).map((e) => (
              <li key={e}>
                <a
                  href={`mailto:${e}`}
                  className="text-sm text-tru-blue-600 hover:underline"
                >
                  {e}
                </a>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {/* Top keywords as a list */}
      {data.keywords.length > 0 ? (
        <TopList
          title="Channel keywords"
          entries={data.keywords.map((k, i) => ({ label: k, value: data.keywords.length - i }))}
          showBars={false}
          formatValue={() => ''}
          max={8}
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

interface SplitCardProps {
  title: string;
  metrics: Array<{ label: string; value: string }>;
}

function SplitCard({ title, metrics }: SplitCardProps) {
  return (
    <div className="rounded-md border border-tru-border-soft bg-white p-3">
      <div className="mb-2 text-xs font-semibold text-tru-slate-700">{title}</div>
      <dl className="grid grid-cols-3 gap-2 text-[11px]">
        {metrics.map((m) => (
          <div key={m.label} className="space-y-0.5">
            <dt className="text-tru-slate-500">{m.label}</dt>
            <dd className="font-bold tabular-nums text-tru-slate-900">{m.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function Flags({ flags }: { flags: YouTubeEnrichment['flags'] }) {
  const chips: Array<{ key: string; label: string; icon: React.ReactNode }> = [];
  if (flags.isVerified) chips.push({ key: 'v', label: 'Verified', icon: <Verified className="h-3 w-3" /> });
  if (flags.isMonetizationEnabled)
    chips.push({ key: 'mon', label: 'Monetization on', icon: <CheckCircle2 className="h-3 w-3" /> });
  if (flags.hasShorts) chips.push({ key: 's', label: 'Has Shorts', icon: <CheckCircle2 className="h-3 w-3" /> });
  if (flags.hasCommunityPosts)
    chips.push({ key: 'c', label: 'Community posts', icon: <MessageSquare className="h-3 w-3" /> });
  if (flags.hasPaidPartnership)
    chips.push({ key: 'p', label: 'Paid partnership', icon: <ShoppingBag className="h-3 w-3" /> });
  if (flags.madeForKids) chips.push({ key: 'k', label: 'Made for kids', icon: <CheckCircle2 className="h-3 w-3" /> });
  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map((c) => (
        <Badge key={c.key} variant="secondary" className="gap-1">
          {c.icon}
          {c.label}
        </Badge>
      ))}
    </div>
  );
}

function IncomeBlock({ income }: { income: Record<string, unknown> }) {
  const entries = Object.entries(income).filter(
    ([, v]) => typeof v === 'number' || typeof v === 'string'
  );
  if (entries.length === 0) return null;
  return (
    <Section label="Estimated income">
      <dl className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {entries.map(([k, v]) => (
          <div
            key={k}
            className="rounded-md border border-tru-border-soft bg-tru-slate-50 px-3 py-2"
          >
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-tru-slate-500">
              {humanise(k)}
            </dt>
            <dd className="mt-0.5 text-sm font-bold tabular-nums text-tru-slate-900">
              {typeof v === 'number' ? formatCount(v) : String(v)}
            </dd>
          </div>
        ))}
      </dl>
    </Section>
  );
}

function shortenMonth(key: string): string {
  const m = key.match(/(\d{4})[-_/]?(\d{2})/);
  if (m) {
    const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][parseInt(m[2], 10) - 1];
    return `${month}'${m[1].slice(2)}`;
  }
  return key;
}

function humanise(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function numberOrDash(v: number | null): string {
  return v === null ? '—' : v.toFixed(1);
}

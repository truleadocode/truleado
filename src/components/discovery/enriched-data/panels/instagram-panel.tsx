'use client';

import { CheckCircle2, Hash, ShoppingBag, ExternalLink, Verified } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatCount, formatPercent } from '../../primitives/tokens';
import type { InstagramEnrichment } from '../parsers/types';
import { StatBox } from '../primitives/stat-box';
import { TopList } from '../primitives/top-list';

interface InstagramPanelProps {
  data: InstagramEnrichment;
}

export function InstagramPanel({ data }: InstagramPanelProps) {
  return (
    <div className="space-y-5 px-6 py-5">
      {/* Engagement & followers row */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatBox label="Followers" value={formatCount(data.followerCount)} />
        <StatBox label="ER" value={formatPercent(data.engagementPercent)} />
        <StatBox label="Avg likes" value={formatCount(data.avgLikes)} />
        <StatBox label="Avg comments" value={formatCount(data.avgComments)} />
      </div>

      {/* Median row + reels split */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <StatBox label="Likes (median)" value={formatCount(data.likesMedian)} compact />
        <StatBox label="Comments (median)" value={formatCount(data.commentsMedian)} compact />
        <StatBox
          label="Reels share"
          value={data.reelsPercentLast12 !== null ? `${data.reelsPercentLast12.toFixed(0)}%` : null}
          hint="Last 12 posts"
          compact
        />
      </div>

      {/* Flag chips */}
      <Flags flags={data.flags} />

      {/* Languages */}
      {data.languages.length > 0 ? (
        <Section label="Languages spoken">
          <div className="flex flex-wrap gap-1.5">
            {data.languages.map((l) => (
              <Badge key={l} variant="outline" className="uppercase tabular-nums">
                {l}
              </Badge>
            ))}
          </div>
        </Section>
      ) : null}

      {/* Tagged accounts — collaboration discovery */}
      {data.taggedAccounts.length > 0 ? (
        <Section label={`Recently tagged (${data.taggedAccounts.length})`}>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {data.taggedAccounts.slice(0, 8).map((tag) => (
              <li
                key={tag.username}
                className="flex items-center gap-2 rounded-md border border-tru-border-soft px-2 py-1.5"
              >
                {tag.pictureUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={tag.pictureUrl}
                    alt=""
                    className="h-7 w-7 rounded-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="h-7 w-7 rounded-full bg-tru-slate-100" />
                )}
                <a
                  href={`https://instagram.com/${tag.username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-w-0 truncate text-sm text-tru-slate-900 hover:text-tru-blue-600 hover:underline"
                >
                  @{tag.username}
                </a>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {/* Top hashtags */}
      {data.hashtagsCount.length > 0 ? (
        <TopList
          title="Top hashtags"
          entries={data.hashtagsCount.map((h) => ({
            label: `#${h.hashtag.replace(/^#/, '')}`,
            value: h.count,
          }))}
          max={10}
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

function Flags({ flags }: { flags: InstagramEnrichment['flags'] }) {
  const chips: Array<{ key: string; label: string; icon: React.ReactNode }> = [];
  if (flags.isVerified) chips.push({ key: 'verified', label: 'Verified', icon: <Verified className="h-3 w-3" /> });
  if (flags.isBusinessAccount)
    chips.push({ key: 'business', label: 'Business account', icon: <CheckCircle2 className="h-3 w-3" /> });
  if (flags.hasMerch) chips.push({ key: 'merch', label: 'Has merch', icon: <ShoppingBag className="h-3 w-3" /> });
  if (flags.usesLinkInBio)
    chips.push({ key: 'lib', label: 'Uses link in bio', icon: <ExternalLink className="h-3 w-3" /> });
  if (flags.videoContentCreator)
    chips.push({ key: 'vid', label: 'Video creator', icon: <Hash className="h-3 w-3" /> });
  if (flags.streamer) chips.push({ key: 'stream', label: 'Streams live', icon: <Hash className="h-3 w-3" /> });

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

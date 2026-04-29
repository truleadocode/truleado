'use client';

import { CheckCircle2, MessageSquare, Verified } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatCount, formatPercent } from '../../primitives/tokens';
import type { TwitterEnrichment } from '../parsers/types';
import { BarChart } from '../primitives/bar-chart';
import { StatBox } from '../primitives/stat-box';

interface TwitterPanelProps {
  data: TwitterEnrichment;
}

export function TwitterPanel({ data }: TwitterPanelProps) {
  // tweets_type into bars
  const tweetsTypeBars = data.tweetsType
    ? Object.entries(data.tweetsType).map(([k, v]) => ({ key: humanise(k), value: v }))
    : [];

  return (
    <div className="space-y-5 px-6 py-5">
      {/* Headline metrics */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatBox label="Followers" value={formatCount(data.followerCount)} />
        <StatBox label="ER" value={formatPercent(data.engagementPercent)} />
        <StatBox label="Avg likes" value={formatCount(data.averages.likes)} />
        <StatBox label="Avg views" value={formatCount(data.averages.views)} />
      </div>

      {/* Quote / reply / retweet split */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <StatBox label="Avg replies" value={formatCount(data.averages.replies)} compact />
        <StatBox label="Avg retweets" value={formatCount(data.averages.retweets)} compact />
        <StatBox label="Avg quotes" value={formatCount(data.averages.quotes)} compact />
      </div>

      {/* Tweets type breakdown */}
      {tweetsTypeBars.length > 0 ? (
        <Section label="Tweet mix">
          <BarChart data={tweetsTypeBars} highlightTop={1} />
        </Section>
      ) : null}

      {/* Flag chips */}
      <Flags flags={data.flags} />

      {/* Languages */}
      {data.languages.length > 0 ? (
        <Section label="Languages of recent tweets">
          <div className="flex flex-wrap gap-1.5">
            {dedupe(data.languages).slice(0, 12).map((l) => (
              <Badge key={l} variant="outline" className="uppercase tabular-nums">
                {l}
              </Badge>
            ))}
          </div>
        </Section>
      ) : null}

      {/* Recommended users + retweet network — collaboration discovery */}
      {data.recommendedUsers.length > 0 ? (
        <Section label="Recommended users">
          <UserList usernames={data.recommendedUsers} />
        </Section>
      ) : null}

      {data.retweetUsers.length > 0 ? (
        <Section label={`Retweets (top ${Math.min(data.retweetUsers.length, 12)})`}>
          <UserList usernames={data.retweetUsers.slice(0, 12)} />
        </Section>
      ) : null}

      {data.taggedUsernames.length > 0 ? (
        <Section label="Tagged in tweets">
          <UserList usernames={data.taggedUsernames.slice(0, 12)} />
        </Section>
      ) : null}

      {/* Account meta */}
      {data.joinDate ? (
        <div className="text-[11px] text-tru-slate-500">
          Joined Twitter on{' '}
          <span className="font-semibold text-tru-slate-700">
            {new Date(data.joinDate).toLocaleDateString()}
          </span>
        </div>
      ) : null}
    </div>
  );
}

function UserList({ usernames }: { usernames: string[] }) {
  return (
    <ul className="flex flex-wrap gap-1.5">
      {usernames.map((u) => (
        <li key={u}>
          <a
            href={`https://twitter.com/${u}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-md border border-tru-border-soft px-2 py-1 text-[12px] text-tru-slate-700 hover:border-tru-blue-600 hover:bg-tru-blue-50 hover:text-tru-blue-600"
          >
            @{u}
          </a>
        </li>
      ))}
    </ul>
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

function Flags({ flags }: { flags: TwitterEnrichment['flags'] }) {
  const chips: Array<{ key: string; label: string; icon: React.ReactNode }> = [];
  if (flags.isVerified) chips.push({ key: 'v', label: 'Verified', icon: <Verified className="h-3 w-3" /> });
  if (flags.hasPaidPartnership)
    chips.push({ key: 'p', label: 'Paid partnership', icon: <CheckCircle2 className="h-3 w-3" /> });
  if (flags.directMessaging)
    chips.push({ key: 'd', label: 'DMs open', icon: <MessageSquare className="h-3 w-3" /> });
  if (flags.superFollowedBy)
    chips.push({ key: 's', label: 'Subscriptions', icon: <CheckCircle2 className="h-3 w-3" /> });
  if (flags.hasMerch) chips.push({ key: 'm', label: 'Has merch', icon: <CheckCircle2 className="h-3 w-3" /> });
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

function humanise(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function dedupe<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

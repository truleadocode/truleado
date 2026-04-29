'use client';

import { Loader2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useSimilarCreators, type DiscoveryCreator } from '../../hooks';
import {
  avatarColorFor,
  formatCount,
  formatPercent,
  initialsFor,
  proxiedImageSrc,
} from '../../primitives/tokens';
import { Section } from './section';

interface SimilarAccordionProps {
  agencyId: string;
  creator: DiscoveryCreator;
}

/**
 * "Similar Accounts" tab content. Promoted from the legacy collapsed
 * accordion to a full table matching IC's Similar Accounts panel:
 * Account / Subscribers / Avg Engagement / Similarity Score columns.
 *
 * Fires the `similarCreators` query immediately on mount when used as
 * a tab — no longer lazy-loaded behind a `<details>` since being on
 * the tab means the user explicitly asked to see it.
 */
export function SimilarAccordion({ agencyId, creator }: SimilarAccordionProps) {
  const query = useSimilarCreators({
    agencyId,
    platform: creator.platform,
    referenceKey: 'username',
    referenceValue: creator.username,
    enabled: true,
  });

  return (
    <Section title="Similar Accounts">
      {query.isLoading ? (
        <div className="flex items-center gap-2 text-xs text-tru-slate-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Finding similar creators…
        </div>
      ) : query.isError ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Lookalike search failed: {String(query.error)}
        </div>
      ) : (
        <SimilarTable accounts={query.data?.accounts ?? []} />
      )}
    </Section>
  );
}

interface SimilarRow {
  providerUserId: string;
  username: string;
  fullName: string | null;
  followers: number | null;
  pictureUrl: string | null;
  engagementPercent: number | null;
}

function SimilarTable({ accounts }: { accounts: SimilarRow[] }) {
  if (accounts.length === 0) {
    return (
      <div className="rounded-md border border-tru-border-soft p-4 text-center text-xs text-tru-slate-500">
        No similar creators surfaced.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-tru-border-soft">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Account</TableHead>
            <TableHead className="text-right">Subscribers</TableHead>
            <TableHead className="text-right">Avg. Engagement</TableHead>
            <TableHead className="w-[120px] text-right">Similarity Score</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {accounts.map((a, rank) => {
            const score = approximateSimilarityScore(rank);
            return (
              <TableRow key={a.providerUserId}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar account={a} />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-tru-slate-900">
                        {a.fullName ?? a.username}
                      </div>
                      <div className="truncate text-xs text-tru-slate-500">
                        @{a.username}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right tabular-nums text-tru-slate-700">
                  {formatCount(a.followers)}
                </TableCell>
                <TableCell className="text-right tabular-nums text-tru-slate-700">
                  {formatPercent(a.engagementPercent)}
                </TableCell>
                <TableCell className="text-right">
                  <ScoreBadge score={score} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <p className="border-t border-tru-slate-100 bg-tru-slate-50 px-4 py-2 text-[11px] text-tru-slate-500">
        Similarity scores are approximated from rank order — IC ranks results
        most-similar-first.
      </p>
    </div>
  );
}

function Avatar({ account }: { account: SimilarRow }) {
  if (account.pictureUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={proxiedImageSrc(account.pictureUrl)}
        alt=""
        className="h-8 w-8 shrink-0 rounded-full object-cover"
        referrerPolicy="no-referrer"
      />
    );
  }
  return (
    <div
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
      style={{ background: avatarColorFor(account.providerUserId) }}
    >
      {initialsFor(account.fullName ?? account.username)}
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const tone =
    score >= 90
      ? 'bg-emerald-100 text-emerald-800'
      : score >= 80
      ? 'bg-emerald-50 text-emerald-700'
      : 'bg-amber-50 text-amber-800';
  return (
    <span
      className={
        'inline-flex h-7 min-w-[44px] items-center justify-center rounded-md text-sm font-bold tabular-nums ' +
        tone
      }
    >
      {score}
    </span>
  );
}

/**
 * IC's similarCreators endpoint returns rank-ordered (most similar first)
 * but doesn't expose a numeric score. Approximate as `100 - rank * 3`,
 * floored at 60 — gives a visually-pleasing decreasing list while making
 * the rank-based nature of the score clear.
 */
function approximateSimilarityScore(rank: number): number {
  return Math.max(100 - rank * 3, 60);
}

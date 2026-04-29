'use client';

import { useMemo } from 'react';
import { Info } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { DiscoveryCreator } from '../hooks';
import { CreatorRow } from './creator-row';
import { formatCount } from '../primitives/tokens';

interface ResultsTableProps {
  accounts: DiscoveryCreator[];
  total: number;
  selectedIds: Set<string>;
  onToggleSelect: (creator: DiscoveryCreator) => void;
  onToggleSelectAll: (allRowIds: string[], select: boolean) => void;
  onRowClick: (creator: DiscoveryCreator) => void;
}

export function ResultsTable({
  accounts,
  total,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onRowClick,
}: ResultsTableProps) {
  const allIds = useMemo(() => accounts.map((a) => a.providerUserId), [accounts]);
  const selectedOnPage = allIds.filter((id) => selectedIds.has(id)).length;
  const allOnPageSelected = selectedOnPage === allIds.length && allIds.length > 0;
  const someOnPageSelected = selectedOnPage > 0 && !allOnPageSelected;

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[13.5px]">
        <thead>
          <tr className="border-b border-tru-border-soft bg-white text-[12.5px] font-semibold text-tru-slate-500">
            <th className="w-[52px] px-3.5 py-3 text-left" scope="col">
              <Checkbox
                checked={allOnPageSelected}
                onCheckedChange={(v) => onToggleSelectAll(allIds, v === true)}
                aria-label={
                  allOnPageSelected ? 'Deselect all on page' : 'Select all on page'
                }
                data-indeterminate={someOnPageSelected}
                className="h-4 w-4"
              />
            </th>
            <th className="min-w-[240px] whitespace-nowrap px-3.5 py-3 text-left" scope="col">
              Select all on page ({formatCount(total)})
            </th>
            <th className="w-[90px] px-3.5 py-3 text-center" scope="col">
              Social Links
            </th>
            <th className="w-[100px] px-3.5 py-3 text-left" scope="col">
              Followers
            </th>
            <th className="w-[80px] px-3.5 py-3 text-center" scope="col">
              Email
            </th>
            <th className="w-[80px] px-3.5 py-3 text-left" scope="col">
              <span className="inline-flex items-center gap-1">
                ER
                <TooltipProvider delayDuration={100}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-tru-slate-400" />
                    </TooltipTrigger>
                    <TooltipContent className="text-xs">
                      Engagement rate — total interactions divided by followers, averaged
                      over the most recent posts.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </span>
            </th>
            <th className="w-[140px] px-3.5 py-3 text-left" scope="col">
              Growth
            </th>
            <th className="w-[120px] px-3.5 py-3 text-left" scope="col">
              External Links
            </th>
            <th className="px-3.5 py-3 text-left" scope="col">
              Frequently used hashtags
            </th>
          </tr>
        </thead>
        <tbody>
          {accounts.map((creator) => (
            <CreatorRow
              key={creator.providerUserId}
              creator={creator}
              selected={selectedIds.has(creator.providerUserId)}
              onToggleSelect={() => onToggleSelect(creator)}
              onRowClick={() => onRowClick(creator)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

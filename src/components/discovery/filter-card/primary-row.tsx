'use client';

import { useState } from 'react';
import { Search, Camera, Sparkles, Lock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { searchPlatforms, type FilterState, type SearchPlatform } from '../state/filter-schema';

const PLATFORM_LABELS: Record<SearchPlatform, string> = {
  instagram: 'IG',
  youtube: 'YT',
  tiktok: 'TT',
  twitter: 'X',
  twitch: 'Tw',
};

interface PrimaryRowProps {
  state: FilterState;
  patch: <K extends keyof FilterState>(k: K, v: FilterState[K]) => void;
  onSubmit: () => void;
}

/**
 * First row of the filter card.
 * Layout: [Visual search mode] [AI/Keyword toggle] [Search input] [Search button] [Search-on segmented]
 *
 * Type pill ("creators / brands / hashtags") is hidden in F3 — IC only
 * supports creators. It will be reinstated as a locked control if we ever
 * surface the types via a future provider.
 */
export function PrimaryRow({ state, patch, onSubmit }: PrimaryRowProps) {
  const [draft, setDraft] = useState(state.q ?? '');

  const apply = () => {
    patch('q', draft.trim() === '' ? undefined : draft.trim());
    patch('page', 1);
    onSubmit();
  };

  return (
    <div className="grid items-stretch gap-2" style={{ gridTemplateColumns: 'auto 160px 1fr auto auto' }}>
      {/* 1. Visual search mode (disabled placeholder) */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-[10px] border border-tru-slate-200 bg-white text-tru-slate-700 hover:border-tru-slate-300"
            aria-label="Search mode"
            title="Search mode"
          >
            <Camera className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuItem onClick={() => patch('searchMode', 'ai')} className="text-sm">
            <Sparkles className="mr-2 h-3.5 w-3.5" /> AI search
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => patch('searchMode', 'keywords')} className="text-sm">
            <Search className="mr-2 h-3.5 w-3.5" /> Keyword search
          </DropdownMenuItem>
          <DropdownMenuItem disabled className="text-sm text-tru-slate-400">
            <Lock className="mr-2 h-3.5 w-3.5" /> Visual search (soon)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* 2. AI/Keyword indicator pill */}
      <div
        className={cn(
          'flex h-11 items-center gap-2 rounded-[10px] border px-3 text-[13px]',
          'border-tru-slate-200 bg-white text-tru-slate-800'
        )}
      >
        <Sparkles className="h-3.5 w-3.5 text-tru-blue-600" />
        <span className="flex-1 truncate">
          {state.searchMode === 'ai' ? 'Search with AI' : state.searchMode === 'keywords' ? 'Keyword search' : 'Visual'}
        </span>
      </div>

      {/* 3. Search input */}
      <div className="flex h-11 items-center rounded-[10px] border border-tru-slate-200 bg-white px-3 focus-within:border-tru-blue-600 focus-within:ring-4 focus-within:ring-tru-blue-50">
        <Search className="mr-2 h-4 w-4 text-tru-slate-400" />
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              apply();
            }
          }}
          placeholder={
            state.searchMode === 'ai'
              ? "Find creators by content — one niche at a time (e.g. 'Plant-based recipes')"
              : 'Search creators by bio keyword'
          }
          className="h-full w-full bg-transparent text-sm text-tru-slate-900 placeholder:text-tru-slate-400 focus:outline-none"
          aria-label="Discovery search query"
        />
      </div>

      {/* 4. Search button */}
      <Button
        type="button"
        onClick={apply}
        className="h-11 w-11 rounded-[10px] bg-tru-slate-100 p-0 text-tru-slate-700 hover:bg-tru-slate-200"
        aria-label="Search"
      >
        <Search className="h-4 w-4" />
      </Button>

      {/* 5. Search-on segmented (NEW — IC requires one platform per query) */}
      <div className="flex h-11 items-center gap-0.5 rounded-[10px] border border-tru-slate-200 bg-white p-0.5">
        {searchPlatforms.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => {
              patch('searchOn', p);
              patch('page', 1);
            }}
            className={cn(
              'h-full rounded-[8px] px-2.5 text-[12px] font-semibold transition-colors',
              state.searchOn === p
                ? 'bg-tru-blue-600 text-white'
                : 'text-tru-slate-600 hover:bg-tru-slate-100'
            )}
            aria-pressed={state.searchOn === p}
          >
            {PLATFORM_LABELS[p]}
          </button>
        ))}
      </div>
    </div>
  );
}

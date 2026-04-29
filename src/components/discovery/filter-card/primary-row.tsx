'use client';

import { useState } from 'react';
import {
  Search,
  Sparkles,
  Lock,
  ChevronDown,
  Check,
  Instagram,
  Youtube,
  Music2,
  Twitch,
  Twitter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { searchPlatforms, type FilterState, type SearchPlatform } from '../state/filter-schema';

interface PlatformMeta {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const PLATFORM_META: Record<SearchPlatform, PlatformMeta> = {
  instagram: { label: 'Instagram', icon: Instagram },
  youtube: { label: 'YouTube', icon: Youtube },
  tiktok: { label: 'TikTok', icon: Music2 },
  twitch: { label: 'Twitch', icon: Twitch },
  twitter: { label: 'Twitter', icon: Twitter },
};

interface PrimaryRowProps {
  state: FilterState;
  patch: <K extends keyof FilterState>(k: K, v: FilterState[K]) => void;
  onSubmit: () => void;
}

/**
 * Primary row — left-aligned controls:
 *   [Platform dropdown] [Search-mode dropdown] [Search input] [Search button]
 *
 * The 5-option segmented control that used to live on the right was collapsed
 * into the leftmost platform dropdown per the design handoff screenshot.
 */
export function PrimaryRow({ state, patch, onSubmit }: PrimaryRowProps) {
  const [draft, setDraft] = useState(state.q ?? '');

  const apply = () => {
    patch('q', draft.trim() === '' ? undefined : draft.trim());
    patch('page', 1);
    onSubmit();
  };

  const CurrentPlatformIcon = PLATFORM_META[state.searchOn].icon;
  const currentPlatformLabel = PLATFORM_META[state.searchOn].label;

  return (
    <div
      className="grid items-stretch gap-2"
      style={{ gridTemplateColumns: 'auto auto 1fr auto' }}
    >
      {/* 1. Platform dropdown (replaces the old camera / visual-search trigger
           and the right-side segmented control). */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex h-11 items-center gap-2 rounded-[10px] border border-tru-slate-200 bg-white px-2.5 text-tru-slate-800 hover:border-tru-slate-300"
            aria-label={`Searching on ${currentPlatformLabel}`}
            title={`Searching on ${currentPlatformLabel}`}
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-tru-slate-100">
              <CurrentPlatformIcon className="h-4 w-4" />
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-tru-slate-400" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          {searchPlatforms.map((p) => {
            const Icon = PLATFORM_META[p].icon;
            const active = state.searchOn === p;
            return (
              <DropdownMenuItem
                key={p}
                onClick={() => {
                  patch('searchOn', p);
                  patch('page', 1);
                }}
                className="flex items-center gap-2 text-sm"
              >
                <Icon className="h-4 w-4 text-tru-slate-700" />
                <span className="flex-1">{PLATFORM_META[p].label}</span>
                {active ? <Check className="h-3.5 w-3.5 text-tru-blue-600" /> : null}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* 2. Search-mode dropdown — now interactive (used to be a read-only
           indicator). Pairs with the platform dropdown to the left. */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              'flex h-11 items-center gap-2 rounded-[10px] border px-3 text-[13px] transition-colors',
              'border-tru-slate-200 bg-white text-tru-slate-800 hover:border-tru-slate-300'
            )}
          >
            <Sparkles className="h-3.5 w-3.5 text-tru-blue-600" />
            <span className="flex-1 whitespace-nowrap">
              {state.searchMode === 'ai'
                ? 'Search with AI'
                : state.searchMode === 'keywords'
                  ? 'Keyword search'
                  : 'Visual'}
            </span>
            <ChevronDown className="h-3 w-3 text-tru-slate-400" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-52">
          <DropdownMenuItem onClick={() => patch('searchMode', 'ai')} className="text-sm">
            <Sparkles className="mr-2 h-3.5 w-3.5" /> AI search
            {state.searchMode === 'ai' ? (
              <Check className="ml-auto h-3.5 w-3.5 text-tru-blue-600" />
            ) : null}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => patch('searchMode', 'keywords')} className="text-sm">
            <Search className="mr-2 h-3.5 w-3.5" /> Keyword search
            {state.searchMode === 'keywords' ? (
              <Check className="ml-auto h-3.5 w-3.5 text-tru-blue-600" />
            ) : null}
          </DropdownMenuItem>
          <DropdownMenuItem disabled className="text-sm text-tru-slate-400">
            <Lock className="mr-2 h-3.5 w-3.5" /> Visual search (soon)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

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
    </div>
  );
}

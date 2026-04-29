'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FilterState } from '../state/filter-schema';
import { InstagramSections } from './platform-sections/instagram-sections';
import { YoutubeSections } from './platform-sections/youtube-sections';
import { TiktokSections } from './platform-sections/tiktok-sections';
import { TwitterSections } from './platform-sections/twitter-sections';
import { TwitchSections } from './platform-sections/twitch-sections';

const LS_KEY = 'discovery.advanced.expanded';

interface AdvancedSectionProps {
  state: FilterState;
  patch: <K extends keyof FilterState>(k: K, v: FilterState[K]) => void;
}

export function AdvancedSection({ state, patch }: AdvancedSectionProps) {
  const [expanded, setExpanded] = useState<boolean>(true);

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem(LS_KEY) : null;
    if (stored !== null) setExpanded(stored === 'true');
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') window.localStorage.setItem(LS_KEY, String(expanded));
  }, [expanded]);

  return (
    <div className="mt-4">
      <div className="relative">
        <hr className="border-t border-tru-border-soft" />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls="discovery-advanced"
            onClick={() => setExpanded((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-full border border-tru-slate-200 bg-white px-3.5 py-1.5 text-[12.5px] font-semibold text-tru-blue-600 transition-colors hover:border-tru-blue-600 hover:bg-tru-blue-50"
          >
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {expanded ? 'See fewer filters' : 'See more filters'}
          </button>
        </div>
      </div>

      <div
        id="discovery-advanced"
        className={cn(
          'grid transition-[grid-template-rows] duration-[220ms] ease-out',
          expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        )}
      >
        <div className="overflow-hidden">
          <div className="pt-5">
            <PlatformSections state={state} patch={patch} />
          </div>
        </div>
      </div>
    </div>
  );
}

function PlatformSections({ state, patch }: AdvancedSectionProps) {
  switch (state.searchOn) {
    case 'instagram':
      return <InstagramSections state={state} patch={patch} />;
    case 'youtube':
      return <YoutubeSections state={state} patch={patch} />;
    case 'tiktok':
      return <TiktokSections state={state} patch={patch} />;
    case 'twitter':
      return <TwitterSections state={state} patch={patch} />;
    case 'twitch':
      return <TwitchSections state={state} patch={patch} />;
    default:
      return null;
  }
}

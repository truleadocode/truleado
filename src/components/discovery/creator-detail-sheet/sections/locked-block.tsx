'use client';

import { Lock } from 'lucide-react';
import { Section } from './section';

interface LockedBlockProps {
  title: string;
  description: string;
}

/**
 * Generic blurred placeholder for sections that require Full+Audience
 * enrichment. The actual unlocked content lives in their respective
 * sections — when the profile transitions to enrichmentMode === 'FULL'
 * or 'FULL_WITH_AUDIENCE', the parent swaps the LockedBlock for the
 * real block.
 */
export function LockedBlock({ title, description }: LockedBlockProps) {
  return (
    <Section title={title}>
      <div className="relative overflow-hidden rounded-md border border-dashed border-tru-slate-300 bg-tru-slate-50 p-6">
        <div className="pointer-events-none select-none space-y-2 opacity-30 blur-[2px]">
          <div className="h-3 w-3/4 rounded bg-tru-slate-300" />
          <div className="h-3 w-1/2 rounded bg-tru-slate-300" />
          <div className="h-3 w-2/3 rounded bg-tru-slate-300" />
          <div className="h-3 w-2/5 rounded bg-tru-slate-300" />
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-center">
          <Lock className="h-4 w-4 text-tru-slate-500" />
          <span className="text-[12px] font-semibold text-tru-slate-700">{title} locked</span>
          <span className="text-[11px] text-tru-slate-500">{description}</span>
        </div>
      </div>
    </Section>
  );
}

'use client';

import { cn } from '@/lib/utils';

interface SectionHeaderProps {
  title: string;
  /** Small chip to the right of the title (e.g. "12 posts"). */
  badge?: string | null;
  /** Right-aligned slot for tabs / toggles / actions. */
  rightSlot?: React.ReactNode;
  className?: string;
}

/**
 * Mirrors the mockup's `<SectionH>` (shared.jsx ~line 120). Renders an h2 +
 * inline horizontal line + optional badge / right-slot. Used as the band
 * separator between sections of a Creator Profile page.
 */
export function SectionHeader({ title, badge, rightSlot, className }: SectionHeaderProps) {
  return (
    <div
      className={cn(
        'flex items-baseline gap-3 border-b border-cp-line/0 pb-2 mb-3',
        className
      )}
    >
      <h2 className="text-[15px] font-semibold tracking-tight text-cp-ink">
        {title}
      </h2>
      <div className="flex-1 h-px bg-cp-line" aria-hidden />
      {badge ? (
        <span className="inline-flex items-center rounded-full border border-cp-line bg-cp-surface-2 px-2 py-0.5 text-[10.5px] font-medium uppercase tracking-wider text-cp-ink-2">
          {badge}
        </span>
      ) : null}
      {rightSlot}
    </div>
  );
}

'use client';

import { cn } from '@/lib/utils';

interface CardHeaderProps {
  title: string;
  description?: string | null;
  rightSlot?: React.ReactNode;
  className?: string;
}

/**
 * Mirrors the mockup's `<CardH>` (shared.jsx ~line 127). Title + optional
 * description on the left, right-slot for badges / counts on the right.
 * Sits inside `<Card>` blocks as the top row.
 */
export function CardHeader({
  title,
  description,
  rightSlot,
  className,
}: CardHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between gap-3 mb-3', className)}>
      <div className="min-w-0">
        <h3 className="text-[13.5px] font-semibold text-cp-ink leading-tight">
          {title}
        </h3>
        {description ? (
          <div className="mt-0.5 text-[11.5px] text-cp-ink-3">{description}</div>
        ) : null}
      </div>
      {rightSlot ? <div className="shrink-0">{rightSlot}</div> : null}
    </div>
  );
}

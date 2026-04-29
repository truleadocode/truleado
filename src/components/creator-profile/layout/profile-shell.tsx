'use client';

import { cn } from '@/lib/utils';

interface ProfileShellProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Outer wrapper for a Creator Profile page. Sets the cp-bg background, the
 * 1440px max-width canvas, and the JetBrains Mono font variable. Mirrors
 * the mockup's `.page` rule in styles.css.
 */
export function ProfileShell({ children, className }: ProfileShellProps) {
  return (
    <div
      className={cn(
        'creator-profile-scope bg-cp-bg text-cp-ink',
        'mx-auto w-full max-w-[1440px] px-6 pb-20 pt-4 md:px-8',
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * `Card` is intentionally redefined here (not the shadcn one) — the mockup
 * card rhythm uses its own border, padding, and shadow tokens. Keeping it
 * scoped to creator-profile/ avoids polluting the rest of the app.
 */
export function Card({
  children,
  className,
  span,
}: {
  children: React.ReactNode;
  className?: string;
  /** "2" → spans 2 columns in the parent grid (lg+). */
  span?: 1 | 2;
}) {
  return (
    <div
      className={cn(
        'rounded-[10px] border border-cp-line bg-cp-surface p-4 shadow-[0_1px_0_rgba(20,18,12,0.04)]',
        span === 2 && 'lg:col-span-2',
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * 2-column responsive grid (1 column on mobile, 2 on lg) used inside
 * sections to lay out cards. Mirrors the mockup's `.grid` rule.
 */
export function CardGrid({
  children,
  className,
  cols = 2,
}: {
  children: React.ReactNode;
  className?: string;
  cols?: 1 | 2 | 3 | 4;
}) {
  return (
    <div
      className={cn(
        'grid gap-3',
        cols === 1 && 'grid-cols-1',
        cols === 2 && 'grid-cols-1 lg:grid-cols-2',
        cols === 3 && 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
        cols === 4 && 'grid-cols-2 lg:grid-cols-4',
        className
      )}
    >
      {children}
    </div>
  );
}

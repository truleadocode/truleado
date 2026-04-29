'use client';

import { cn } from '@/lib/utils';

/**
 * Shared layout primitives used by the platform-specific blocks/pages.
 * Mirrors the mockup's `.dl`, `.minis`, `.chips`, `.empty`, `.pill` rules
 * from styles.css.
 */

interface DescriptionListProps {
  /** Rows as `[label, value]` tuples. Values can be ReactNode for inline links. */
  rows: Array<[string, React.ReactNode]>;
  /** Single-column layout (default 2-col on lg). */
  single?: boolean;
  className?: string;
}

/**
 * 2-column key/value list — used everywhere for identity dumps and metadata
 * blocks. Heavy use of `font-mono tabular-nums` on values to match the
 * design rhythm.
 */
export function DescriptionList({ rows, single, className }: DescriptionListProps) {
  return (
    <dl
      className={cn(
        'grid gap-x-4 gap-y-1.5 text-[12px]',
        single ? 'grid-cols-[max-content_1fr]' : 'grid-cols-1 lg:grid-cols-2',
        className
      )}
    >
      {rows.map(([k, v], i) => (
        <div key={i} className="flex items-baseline justify-between gap-3 border-b border-cp-line/40 py-1">
          <dt className="text-[10.5px] uppercase tracking-[0.07em] text-cp-ink-3 shrink-0">
            {k}
          </dt>
          <dd
            className="font-mono text-[11.5px] text-cp-ink-2 truncate text-right"
            title={typeof v === 'string' ? v : undefined}
          >
            {v ?? '—'}
          </dd>
        </div>
      ))}
    </dl>
  );
}

interface MiniStatProps {
  label: string;
  value: React.ReactNode;
  /** Sub-line under the value. */
  sub?: React.ReactNode;
  tone?: 'good' | 'bad' | 'warn' | null;
}

/** Small stat tile — used inside cards for sub-metrics. */
export function MiniStat({ label, value, sub, tone }: MiniStatProps) {
  return (
    <div className="rounded-md border border-cp-line bg-cp-surface-2 p-2.5">
      <div className="text-[10px] font-medium uppercase tracking-wider text-cp-ink-3">
        {label}
      </div>
      <div
        className={cn(
          'mt-0.5 font-mono text-[15px] font-bold leading-none',
          tone === 'bad' && 'text-cp-bad',
          tone === 'good' && 'text-cp-good',
          tone === 'warn' && 'text-cp-warn',
          !tone && 'text-cp-ink'
        )}
      >
        {value}
      </div>
      {sub ? (
        <div className="mt-0.5 text-[10.5px] text-cp-ink-3 truncate" title={typeof sub === 'string' ? sub : undefined}>
          {sub}
        </div>
      ) : null}
    </div>
  );
}

interface MiniGridProps {
  children: React.ReactNode;
  cols?: 2 | 3 | 4;
  className?: string;
}

/** Standard wrapper for `MiniStat` rows — `.minis` from the mockup. */
export function MiniGrid({ children, cols = 2, className }: MiniGridProps) {
  return (
    <div
      className={cn(
        'grid gap-2.5',
        cols === 2 && 'grid-cols-2',
        cols === 3 && 'grid-cols-2 md:grid-cols-3',
        cols === 4 && 'grid-cols-2 lg:grid-cols-4',
        className
      )}
    >
      {children}
    </div>
  );
}

interface ChipListProps {
  /** Either plain strings (label only) or {label, count, accent} objects. */
  items: Array<string | { label: string; count?: number; accent?: string }>;
  /** Truncate to N rows. Default unlimited. */
  max?: number;
  /** Hash-prefix labels (e.g. `#travel`). */
  hashPrefix?: boolean;
  /** Optional click-through href builder. */
  hrefFor?: (label: string) => string | null;
  className?: string;
  /** Cap the visible area with overflow scroll (e.g. for long topic lists). */
  scrollable?: boolean;
}

/** Inline chip list — `.chips` from the mockup. Used for hashtags, topics, etc. */
export function ChipList({
  items,
  max,
  hashPrefix,
  hrefFor,
  className,
  scrollable,
}: ChipListProps) {
  if (items.length === 0) {
    return <Empty>No items</Empty>;
  }
  const sliced = max ? items.slice(0, max) : items;
  return (
    <div
      className={cn(
        'flex flex-wrap gap-1.5',
        scrollable && 'max-h-40 overflow-auto',
        className
      )}
    >
      {sliced.map((it, i) => {
        const obj = typeof it === 'string' ? { label: it } : it;
        const display = hashPrefix ? `#${obj.label.replace(/^#/, '')}` : obj.label;
        const href = hrefFor?.(obj.label);
        const inner = (
          <>
            <span>{display}</span>
            {obj.count != null ? (
              <strong className="font-mono text-cp-ink">×{obj.count}</strong>
            ) : null}
            {obj.accent ? (
              <strong className="font-mono text-cp-ink">{obj.accent}</strong>
            ) : null}
          </>
        );
        const className =
          'inline-flex items-center gap-1 rounded-full border border-cp-line bg-cp-surface-2 px-2 py-0.5 text-[11px] text-cp-ink-2';
        if (href) {
          return (
            <a key={i} href={href} target="_blank" rel="noopener noreferrer" className={className + ' hover:border-cp-accent hover:text-cp-ink'}>
              {inner}
            </a>
          );
        }
        return (
          <span key={i} className={className}>
            {inner}
          </span>
        );
      })}
      {max && items.length > max ? (
        <span className="inline-flex items-center rounded-full border border-cp-line-2 bg-cp-surface px-2 py-0.5 text-[11px] text-cp-ink-3">
          +{items.length - max} more
        </span>
      ) : null}
    </div>
  );
}

/** Empty-state placeholder block — `.empty` from the mockup. */
export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-dashed border-cp-line-2 bg-cp-surface-2 p-4 text-center text-[11px] text-cp-ink-3">
      {children}
    </div>
  );
}

/** Inline "pill" — the bordered count chip used in card-header right slots. */
export function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-cp-line-2 bg-cp-surface-2 px-2 py-0.5 font-mono text-[10.5px] text-cp-ink-2">
      {children}
    </span>
  );
}

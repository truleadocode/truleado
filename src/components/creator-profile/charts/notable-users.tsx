'use client';

import type { AudienceCreator } from '@/components/discovery/enriched-data/parsers/types';
import { formatNum } from '../format';

interface NotableUsersProps {
  users: AudienceCreator[];
  /** Truncate to N users. Default 12. */
  max?: number;
  /** Per-user external URL builder (handle → href). Optional. */
  hrefFor?: (user: AudienceCreator) => string;
}

/**
 * Avatar + name + handle + follower count grid, rendered 3 columns wide on
 * desktop. Used for both `notable_users` (high-influence followers) and
 * `audience_lookalikes` (similar creators by audience overlap).
 */
export function NotableUsers({ users, max = 12, hrefFor }: NotableUsersProps) {
  if (!users || users.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-cp-line-2 bg-cp-surface-2 p-4 text-center text-[11px] text-cp-ink-3">
        No notable users
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
      {users.slice(0, max).map((u) => {
        const display = u.fullName || u.username;
        const initials = display
          .split(' ')
          .map((s) => s[0])
          .filter(Boolean)
          .slice(0, 2)
          .join('')
          .toUpperCase();
        const inner = (
          <>
            {u.pictureUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={u.pictureUrl}
                alt=""
                referrerPolicy="no-referrer"
                className="h-9 w-9 shrink-0 rounded-full bg-cp-surface-2 object-cover"
              />
            ) : (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cp-line text-[11px] font-bold text-cp-ink-2 font-mono">
                {initials}
              </div>
            )}
            <div className="min-w-0 flex-1 text-[12px]">
              <div className="flex items-center gap-1 truncate">
                <span className="truncate font-medium text-cp-ink">{display}</span>
                {u.isVerified ? (
                  <span className="text-cp-accent-3" title="Verified">
                    ✓
                  </span>
                ) : null}
              </div>
              <div className="truncate text-[11px] text-cp-ink-3 font-mono">
                @{u.username}
                {u.followers != null ? ` · ${formatNum(u.followers)}` : ''}
                {u.score != null ? ` · ${(u.score * 100).toFixed(0)}% match` : ''}
              </div>
            </div>
          </>
        );

        const href = hrefFor?.(u);
        if (href) {
          return (
            <a
              key={u.username}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 rounded-[8px] border border-cp-line bg-cp-surface p-2.5 transition-colors hover:border-cp-accent hover:bg-cp-surface-2"
            >
              {inner}
            </a>
          );
        }
        return (
          <div
            key={u.username}
            className="flex items-center gap-2.5 rounded-[8px] border border-cp-line bg-cp-surface p-2.5"
          >
            {inner}
          </div>
        );
      })}
    </div>
  );
}

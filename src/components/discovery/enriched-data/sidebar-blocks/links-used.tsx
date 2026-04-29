'use client';

import { ExternalLink } from 'lucide-react';

interface LinksUsedProps {
  links: string[];
  /** Cap at N links visible — extras collapse to a "+N more" pill. */
  max?: number;
}

/**
 * Compact chip list for `links_in_bio`. Truncates to a domain shown as
 * "https://www.5..." matching IC's style, and renders the rest as a
 * "+N more" affordance.
 */
export function LinksUsed({ links, max = 3 }: LinksUsedProps) {
  if (links.length === 0) return null;
  const visible = links.slice(0, max);
  const overflow = links.length - visible.length;

  return (
    <div className="rounded-lg border border-tru-border-soft bg-white p-4">
      <h3 className="mb-2.5 text-[10.5px] font-bold uppercase tracking-[0.08em] text-tru-slate-400">
        Links Used
      </h3>
      <ul className="space-y-1.5">
        {visible.map((link) => (
          <li key={link}>
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex max-w-full items-center gap-1 truncate rounded-md border border-tru-slate-200 px-2 py-1 text-[11px] text-tru-slate-700 hover:border-tru-blue-600 hover:text-tru-blue-600"
              title={link}
            >
              <ExternalLink className="h-2.5 w-2.5 shrink-0" />
              <span className="truncate">{shortenUrl(link)}</span>
            </a>
          </li>
        ))}
        {overflow > 0 ? (
          <li>
            <span className="inline-flex items-center rounded-md border border-tru-slate-200 px-2 py-1 text-[11px] text-tru-slate-500">
              +{overflow} more
            </span>
          </li>
        ) : null}
      </ul>
    </div>
  );
}

function shortenUrl(url: string): string {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');
    // "https://www.5..." style — show first ~3 chars after host root.
    const protocol = u.protocol === 'https:' ? 'https://www.' : `${u.protocol}//`;
    return `${protocol}${host.slice(0, 3)}...`;
  } catch {
    return url.slice(0, 16) + (url.length > 16 ? '...' : '');
  }
}

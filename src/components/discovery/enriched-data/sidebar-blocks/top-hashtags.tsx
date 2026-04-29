'use client';

import { Badge } from '@/components/ui/badge';

interface TopHashtagsProps {
  hashtags: string[];
  /** Cap chip list at N — extras collapse to "+N more". Default 8. */
  max?: number;
}

/**
 * Chip row for "Top Hashtags". IC renders these inline at the bottom
 * of the Analytics tab. We accept a flat string array (per-platform
 * parsers already extract this — see `hashtagsCount` for IG, `hashtags`
 * for the rest).
 */
export function TopHashtags({ hashtags, max = 8 }: TopHashtagsProps) {
  if (hashtags.length === 0) return null;
  const visible = hashtags.slice(0, max);
  const overflow = hashtags.length - visible.length;

  return (
    <div>
      <h3 className="mb-2 text-[10.5px] font-bold uppercase tracking-[0.08em] text-tru-slate-400">
        Top Hashtags
      </h3>
      <div className="flex flex-wrap gap-1.5">
        {visible.map((h) => (
          <Badge
            key={h}
            variant="outline"
            className="rounded-full bg-tru-blue-50 text-tru-blue-700 hover:bg-tru-blue-100"
          >
            #{h.replace(/^#/, '')}
          </Badge>
        ))}
        {overflow > 0 ? (
          <Badge variant="outline" className="rounded-full">
            +{overflow} more
          </Badge>
        ) : null}
      </div>
    </div>
  );
}

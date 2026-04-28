'use client';

import { Section } from './section';

/**
 * Approximated analytics — sparkline + top performing posts derived
 * client-side from the posts payload. Real implementation lands in Phase D.
 * For Phase B we render an inert placeholder so the section's slot in the
 * layout is reserved.
 */
export function ApproximatedAnalytics() {
  return (
    <Section
      title="Approximated analytics"
      description="Engagement-rate trend and top posts from the most recent fetch."
    >
      <div className="flex h-20 items-center justify-center rounded-md border border-dashed border-tru-slate-300 bg-tru-slate-50 text-xs text-tru-slate-500">
        Sparkline + top posts coming next.
      </div>
    </Section>
  );
}

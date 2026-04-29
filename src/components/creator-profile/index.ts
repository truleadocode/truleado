/**
 * Creator Profile public surface.
 *
 * Mirrors the IC mockup at `product-documentation/influencers.club/creator-profile/`.
 * Scoped to the per-platform Creator DB pages — do NOT use these elsewhere
 * in the dashboard. They depend on the cp-* design tokens (which only the
 * Creator Profile pages should touch) and JetBrains Mono (which won't
 * cascade unless the parent has the `font-mono` variable set up).
 */

// Layout
export { ProfileShell, Card, CardGrid } from './layout/profile-shell';
export { ProfileHead, PLATFORM_THEME } from './layout/profile-head';
export type { CreatorPlatform, KpiTile, ProfileHeadTag } from './layout/profile-head';
export { SectionHeader } from './layout/section-header';
export { CardHeader } from './layout/card-header';

// Charts
export { Donut, DonutWithLegend } from './charts/donut';
export { Sparkline } from './charts/sparkline';
export { ScatterPlot } from './charts/scatter-plot';
export { PostingHeatmap } from './charts/posting-heatmap';
export { AgePyramid } from './charts/age-pyramid';
export { BarsList, type BarRow } from './charts/bars-list';
export { CountryList } from './charts/country-list';
export { CredibilityMeter } from './charts/credibility-meter';
export { ReachFlow } from './charts/reach-flow';
export { Histogram } from './charts/histogram';
export { NotableUsers } from './charts/notable-users';
export { YearMonthCalendar } from './charts/year-month-calendar';

// Blocks
export { AudienceBlock } from './blocks/audience-block';

// Formatters
export { formatNum, formatPct, formatDate, flagEmoji, fmtDuration } from './format';

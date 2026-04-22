'use client';

/**
 * Creator Discovery — Influencers.club rebuild.
 *
 * Phase F1 (Foundation) landed the GraphQL client operations, design tokens,
 * and Tailwind additions. The UI is being rebuilt phase by phase (F2–F9) and
 * will replace this placeholder with the full Discovery experience.
 *
 * Until then, this page renders a minimal notice so the route compiles and
 * agencies that navigate here aren't thrown into the old (now-broken) UI.
 */

export default function DiscoveryPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-16 text-center">
      <h1 className="text-2xl font-semibold text-tru-slate-900">
        Creator Discovery
      </h1>
      <p className="mt-3 text-sm text-tru-slate-500">
        The new Influencers.club-powered experience is being rebuilt. This
        page will return with filters, search, enrichment, and bulk actions
        shortly.
      </p>
    </div>
  );
}

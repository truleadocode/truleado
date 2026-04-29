# Handoff: Discovery Page Redesign

## Overview

The Discovery page is the agency-side creator search surface in Truleado. Users apply a stack of filters (search + quick filters + Creator / Audience / Content advanced filters + platform picker) and get back a paginated list of creators with follower counts, engagement, growth trend, and hashtag metadata. From here they select creators and export to a list.

This redesign replaces the current Discovery page with a denser, faster, more discoverable filter surface modelled after best-in-class creator-discovery UIs (influencers.club reference). Key changes:

- Primary row combines AI/keyword search mode, input, and result Type picker in one band.
- A compact 6-pill quick-filter row covers the 80% case without expanding.
- "See fewer / more" collapses the Creator / Audience / Content advanced grids.
- Platform picker ("Creator has") is a single horizontal icon row, not nested tabs.
- Results switch from card grid to a data-dense table with inline sparkline and hashtag chips.
- Plan-gated locked rows with blur + "Unlock the next 10 results" upsell.

## About the Design Files

The files in this bundle are **design references created in HTML** — prototypes showing the intended look and behavior, not production code to copy directly.

The task is to **recreate `Discovery.html` in Truleado's existing codebase** (Next.js 14 + Tailwind 3 + shadcn/ui per the Truleado design system), using its established patterns, component library, and data layer. Do not lift the HTML wholesale; rebuild it as idiomatic React components that match the rest of the agency app.

## Fidelity

**High-fidelity.** Colors, typography, spacing, radii, and interactions are final. Match them pixel-for-pixel using the project's `tokens.css` / Tailwind mapping. The enclosed `Discovery.html` is the source of truth; when this README disagrees with the HTML, the HTML wins.

---

## Screens / Views

There is one screen: `/discovery` (inside the agency portal). It is composed of a persistent left rail + top bar + a content column containing two stacked cards.

### Layout (1440px reference)

```
┌─ sidebar 64px ─┬────────── main column ────────────────┐
│                │  topbar  (48px)                        │
│  logo          │  ┌──────────────────────────────────┐  │
│  nav icons     │  │  FILTER CARD                     │  │
│  (8 items)     │  │   primary row                    │  │
│  …             │  │   quick filter row (6 pills)     │  │
│                │  │   ── see fewer/more ──           │  │
│                │  │   Creator section  (8 pills)     │  │
│                │  │   Audience section (4 pills)     │  │
│                │  │   Content section  (8 pills)     │  │
│                │  │   Creator has (platform row)     │  │
│                │  │   Save Filters | Filters Preset  │  │
│                │  └──────────────────────────────────┘  │
│                │  ┌──────────────────────────────────┐  │
│                │  │  RESULTS CARD                    │  │
│                │  │   header (count / sort / export) │  │
│                │  │   table (9 columns)              │  │
│                │  │   locked rows (blurred)          │  │
│                │  │   Unlock next 10 CTA             │  │
│                │  └──────────────────────────────────┘  │
└────────────────┴────────────────────────────────────────┘
```

Content max width: 1400px, horizontally centered, `padding: 20px 28px 40px`.

---

### Component breakdown

All colors, radii, type sizes, and spacings below come from `tokens.css`. Anything with a hex value is reproduced inline for convenience — prefer the token when implementing.

#### 1. Sidebar (`aside.sidebar`)

- Width: `64px`, full height, sticky.
- Background `#FFFFFF`, right border `#E2E8F0`.
- Logo: `36×36`, `border-radius: 10px`, signature gradient `linear-gradient(135deg, #2563EB, #4338CA)`, white "T" glyph `font-weight: 800` `15px`.
- Nav icons: `40×40` buttons, `border-radius: 10px`, icon `20×20` in `#64748B`.
  - Hover: `bg #F1F5F9`, icon `#0F172A`.
  - Active: `bg #EFF6FF`, icon `#2563EB`.
- Items (top → bottom): Discovery (active), Lists, AI insights, Campaigns, Reports, Payments, spacer, Calendar, Help.

#### 2. Top bar (`.topbar`)

- Height ~48px, `padding: 12px 28px`, bottom border `#E2E8F0`, bg `#FFFFFF`.
- Breadcrumb left-aligned: **Discovery** (bold `#0F172A`) `/` `Creator search` (muted `#64748B`).
- "Ask Chat" pill right-aligned: `border-radius: 9999px`, border `#E2E8F0`, `padding: 6px 14px`, `font-size: 12.5px`, `font-weight: 600`. Leading 14px gradient square icon.

#### 3. Filter card (`.filter-card`)

- Background `#FFFFFF`, border `#E2E8F0`, `border-radius: 14px`, `padding: 14px`, `box-shadow: 0 1px 2px rgba(15,23,42,0.03)`.

##### 3a. Primary row

Grid: `auto 1.1fr 2.4fr auto auto`, gap `8px`, row height `44px`.

1. **Visual-search mode** — `44px` square with `10px` radius, border `#E2E8F0`. Inside: a `32×32` `#F1F5F9` tile with camera glyph, then a muted caret. Acts as a mode switcher (visual / AI / keyword).
2. **AI/Keyword mode dropdown** — pill button, 44px, radius 10, border #E2E8F0. Label "✦ Search with AI/Keywords" + caret.
3. **Search input** — `h: 44`, radius 10, border `#E2E8F0`. Placeholder: `Find creators by content—one niche at a time (e.g. 'Plant-based recipes')`. Placeholder color `#94A3B8`.
4. **Search button** — `44×44`, radius 10, bg `#F1F5F9`, border `#E2E8F0`. Magnifier glyph. Hover bg `#E2E8F0`.
5. **Type dropdown** — `min-width: 140px`, same pill treatment, label "Type".

##### 3b. Quick filter row

Six equal-width dropdown pills in a 6-column grid, gap `8px`, top margin `10px`. Labels, left→right:

1. Location (multi-select combobox — cities/countries)
2. Followers (range slider — e.g., 1K–10M, log scale)
3. Last Post (enum — 7d / 30d / 90d / 1y)
4. Engagement Rate (range — 0%–20%)
5. Gender (single-select — Any / Female / Male / Non-binary)
6. Language (multi-select — ISO language codes)

##### 3c. See fewer / more toggle

Centered pill on top of a horizontal hairline (`1px #EEF2F7`). Pill: white bg, border `#E2E8F0`, radius 9999, `padding: 6px 14px`, `font-size: 12.5px`, `font-weight: 600`, color `#2563EB`. Label toggles "See fewer" ↔ "See more" with a small bar glyph. **Default: expanded.** Persist state to `localStorage("discovery.advanced.expanded")`.

##### 3d. Advanced filters — sections

Each section starts with a small uppercase label: `font-size: 10.5px`, `font-weight: 700`, `letter-spacing: 0.08em`, `text-transform: uppercase`, color `#94A3B8`, margin-bottom `10px`.

**Creator** (two rows of 4):
- Link in bio contains (combobox, free-text + chips)
- Keywords in bio (combobox)
- Estimated Income (range $/mo)
- Exclude Private Profiles (checkbox pill, with info tooltip)
- Verified Profile (checkbox pill, with info tooltip)
- Follower Growth (range %)
- Posting Frequency (enum)
- Number of posts (range)

**Audience** (one row of 4):
- Age Range (dual slider)
- Interests (multi-select)
- Brand Category (multi-select)
- Audience Credibility (range % — bot-detection confidence)

**Content** (two rows of 4):
- Hashtags (combobox)
- Keywords in captions (combobox)
- Has Reels (checkbox pill, subtext `(Has Videos Previously)`, info icon)
- Reels % (range)
- Avg. Views for Reels `(last 30 reels)` (range)
- Average Likes `(last 30 posts)` (range)
- Average Comments `(last 30 posts)` (range)
- Tagged Profiles (combobox)

All pills use the same `<FilterDropdown>` component (see "Component contracts" below).

##### 3e. Platform row ("Creator has")

Separated by a 1px top border `#EEF2F7`, padding-top `14px`, margin-top `18px`.

- Small uppercase label "Creator has".
- 19 platform buttons `38×38`, radius 8, border `#E2E8F0`, icon `16×16` in `#1E293B`.
  - Hover: border `#2563EB`, icon `#2563EB`, bg `#EFF6FF`.
  - Active: bg `#2563EB`, icon white, border `#2563EB`.
- Platforms in order: Instagram, TikTok, YouTube, Twitch, Patreon, Twitter, Discord, Clubhouse, Snapchat, Facebook, Mastodon, Phone, Spotify, WhatsApp, Telegram, VK, X, LinkedIn, Tumblr.
- "More ▾" pill at the end opens a popover for the long tail.
- Default: Instagram active (inherit from the user's most recent search).

##### 3f. Save row

Border-top `1px #EEF2F7`, `margin-top: 18px`, `padding-top: 14px`, flex gap `10px`.

- **Save Filters** (primary-ish): `bg #94A3B8` (slate-400), white text, radius 8, `padding: 9px 16px`, `font-weight: 600`. Hover bg `#64748B`. Icon: floppy disk. Opens a dialog to name + save current filter state.
- **Filters Preset ▾**: white bg, border `#E2E8F0`, `color #1E293B`. Icon: bookmark + caret. Popover lists user's saved presets + "Manage presets…".

#### 4. Results card (`.results-card`)

- White bg, border `#E2E8F0`, radius 14, same shadow as filter card.

##### 4a. Header

- Count pill: `bg #F1F5F9`, radius 9999, `padding: 6px 14px`, `font-size: 13px`. Content `"<bold count> Creators with contact details found"`. Count is tabular-nums, short form (e.g. `341.8M`).
- Sort dropdown (ghost button): `"Show me <b>Most Relevant</b> ▾"`. Bold + caret in primary blue. Options: Most Relevant, Most Followers, Highest ER, Fastest Growth, Newest.
- Right cluster: kebab menu (`34×34` ghost button, opens: Save view, Copy link, Reset), then **Export Results to a List** — primary blue button `bg #2563EB`, white text, radius 8, `padding: 9px 16px`, `font-weight: 600`, `box-shadow: 0 1px 2px rgba(37,99,235,0.25)`.

##### 4b. Table

Single `<table>`, 9 columns, horizontal scroll on overflow. `font-size: 13.5px`.

| Col | Header | Content | Width |
|---|---|---|---|
| 1 | (checkbox) | row select (`16×16` check, 3px radius, 1.5px border `#CBD5E1`; checked = bg & border `#2563EB`, white tick) | 52px |
| 2 | `Select all on page (<count>)` | avatar (`40` circle, initials fallback, random brand color) + name (bold) + verified badge + location (muted `#64748B`) | min 260px |
| 3 | `Social Links` | centered `32×32` rounded-8 outline button with platform glyph | ~90px |
| 4 | `Followers` | tabular-nums bold | ~100px |
| 5 | `Email` | `32×32` mail glyph, no border | ~80px |
| 6 | `ER` + info icon | tabular-nums `#1E293B` | ~80px |
| 7 | `Growth` | sparkline `54×18` + colored delta (`+x.x%` green `#059669`, `-x.x%` red `#DC2626`, `—` muted). Sparkline stroke color matches delta | ~140px |
| 8 | `External Links Used` | link chip — pill border + link glyph + count | ~120px |
| 9 | `Frequently used hashtags` | up to 2 hashtag chips (ellipsis at 110px max-width) + `+N` more chip | fill |

Header: bg white, `font-weight: 600`, color `#64748B`, `font-size: 12.5px`, border-bottom `#EEF2F7`. Body rows: `padding: 18px 14px`, border-bottom `#EEF2F7`, hover bg `#FAFBFD`.

**Locked rows** (plan-gated): apply `filter: blur(3px); opacity: 0.55; pointer-events: none; user-select: none;` to all cells **except the checkbox column**. Show 1–3 locked rows at the end of the current page as a teaser.

##### 4c. Unlock row

Centered pill: white bg, border `#E2E8F0`, radius 9999, `padding: 8px 18px`, color `#2563EB`, weight 600. Text: "Unlock the next 10 results +". Hover bg `#EFF6FF`, border `#2563EB`.
Below: `12px` muted note "Only available on Pro or higher plans".
Clicking → opens the upgrade flow (or the existing billing modal). If user is already on Pro, this CTA becomes "Load next 10" and paginates.

---

## Interactions & Behavior

### Filter changes
- Every filter change updates local state + the URL (searchParams) + fires a debounced (400ms) search. Results area shows a loading skeleton; `keepPreviousData` keeps old rows visible during fetch to avoid flicker.
- Clearing a filter to its default removes its key from the URL.
- Active filters (non-default) display with a subtle primary border and tinted bg so users can see what's applied at a glance.

### See fewer / more
- Default: expanded. Collapse hides Creator / Audience / Content / Platform / Save rows.
- Smooth height animation, 220ms `cubic-bezier(0.16, 1, 0.3, 1)`.
- State persists to `localStorage("discovery.advanced.expanded")`.

### Platform picker
- Multi-select toggle. Clicking cycles on/off. "More" opens a popover with the full platform list.

### Row selection
- Click checkbox → select. Click header checkbox → "Select all on page" with indeterminate state when partial.
- Selection persists across pagination until filters change or user clears.
- When >0 selected, show a floating action bar (bottom-centered, primary background) with `[N selected] [Add to list] [Compare] [Export] [Clear]`.

### Export flow
- "Export Results to a List" opens a dialog:
  1. Choose list (combobox of user's lists) or "+ New list".
  2. Scope toggle: "Selected creators (N)" vs. "All matching creators (<count>)".
  3. CTA "Export" → POST, show progress toast, navigate to list on completion.

### Save filters / presets
- "Save Filters" → dialog asks for a name (prefilled from the first non-default field: e.g. "Beauty, US, 10K–100K") → POST to `/api/filter-presets`.
- "Filters Preset ▾" → menu of user's presets + "Manage presets…".
- Selecting a preset replaces current filter state and URL.

### Sort
- Dropdown triggers a new search; also written to the URL.

### Hover / focus states
- All interactive elements get a visible focus ring: `box-shadow: 0 0 0 3px rgba(37,99,235,0.25)` on `:focus-visible`.
- Dropdown pills: border transitions `border-color #E2E8F0 → #CBD5E1` on hover, `#2563EB` when active/open.

### Animations / transitions
- Section expand/collapse: 220ms `cubic-bezier(0.16, 1, 0.3, 1)` on height.
- Popover open: 150ms fade + 4px translate from trigger.
- Row hover: instant bg change (no transition — feels laggy otherwise).
- Sparkline: render on mount, no animation.

### Loading / empty / error states
- **Loading**: 5 skeleton rows (animated shimmer) inside the results card. Count pill shows "Searching…".
- **Empty**: `Illustration + "No creators match these filters. Try widening followers or removing a platform." + [Clear filters]` button.
- **Error**: inline banner at the top of the results card, red-50 bg, "Something went wrong loading results. [Retry]".

### Responsive
- Primary layout is desktop (≥1280px). Below that:
  - Quick filter row wraps to 3 cols at 1024px, 2 cols at 768px.
  - Advanced grids drop from 4 → 2 cols at 1024px.
  - Table becomes horizontally scrollable with the creator column sticky.
  - Below 768px the Discovery page is not a primary use case — show the existing mobile "Coming soon on mobile" treatment or a simplified list.

---

## State Management

Recommended stack: React Query + URL-synced local state via `useSearchParams` + a single zod schema.

### Filter schema (single source of truth)

```ts
// _lib/filter-schema.ts
export const filterSchema = z.object({
  q: z.string().optional(),
  searchMode: z.enum(['ai', 'keywords', 'visual']).default('ai'),
  type: z.enum(['creators', 'brands', 'hashtags']).default('creators'),
  location: z.array(z.string()).default([]),
  followers: z.tuple([z.number(), z.number()]).optional(),
  lastPost: z.enum(['7d','30d','90d','1y']).optional(),
  er: z.tuple([z.number(), z.number()]).optional(),
  gender: z.enum(['any','f','m','nb']).default('any'),
  language: z.array(z.string()).default([]),

  creator: z.object({
    bioLink: z.string().optional(),
    bioKeywords: z.array(z.string()).default([]),
    income: z.tuple([z.number(), z.number()]).optional(),
    excludePrivate: z.boolean().default(false),
    verified: z.boolean().default(false),
    followerGrowth: z.tuple([z.number(), z.number()]).optional(),
    postingFrequency: z.enum(['daily','weekly','monthly']).optional(),
    postCount: z.tuple([z.number(), z.number()]).optional(),
  }).default({}),

  audience: z.object({
    ageRange: z.tuple([z.number(), z.number()]).optional(),
    interests: z.array(z.string()).default([]),
    brandCategory: z.array(z.string()).default([]),
    credibility: z.tuple([z.number(), z.number()]).optional(),
  }).default({}),

  content: z.object({
    hashtags: z.array(z.string()).default([]),
    captionKeywords: z.array(z.string()).default([]),
    hasReels: z.boolean().default(false),
    reelsPct: z.tuple([z.number(), z.number()]).optional(),
    avgReelViews: z.tuple([z.number(), z.number()]).optional(),
    avgLikes: z.tuple([z.number(), z.number()]).optional(),
    avgComments: z.tuple([z.number(), z.number()]).optional(),
    taggedProfiles: z.array(z.string()).default([]),
  }).default({}),

  platforms: z.array(z.enum([
    'ig','tt','yt','twitch','patreon','twitter','discord','clubhouse','snap',
    'fb','mastodon','phone','spotify','wa','tg','vk','x','li','tumblr'
  ])).default(['ig']),

  sort: z.enum(['relevance','followers','er','growth','newest']).default('relevance'),
  cursor: z.string().optional(),
});
export type Filters = z.infer<typeof filterSchema>;
```

This schema drives URL parsing, form validation, and the API payload.

### Queries

```ts
// _lib/queries.ts
export function useCreatorSearch(filters: Filters) {
  return useQuery({
    queryKey: ['creators', filters],
    queryFn: () => api.post('/api/discovery', filters).then(r => r.data),
    keepPreviousData: true,
    staleTime: 30_000,
  });
}

export function useFilterPresets() { /* ... */ }
export function useSavePreset()    { /* useMutation */ }
export function useExportToList()  { /* useMutation */ }
```

### URL sync

Small hook that reads/writes the zod-validated state to `?...` searchParams. Debounce writes 150ms so typing doesn't spam `router.replace`.

---

## Component contracts

Keep each component ≤150 lines. Split further if needed.

### `<FilterDropdown>`

```ts
type FilterDropdownProps = {
  label: string;
  hint?: string;                  // e.g. "(last 30 reels)"
  active?: boolean;               // drives the active border + tint
  leading?: React.ReactNode;      // checkbox, icon
  trailing?: React.ReactNode;     // info tooltip icon
  children: React.ReactNode;      // popover body
};
```

Built on shadcn `<Popover>`. Trigger is the pill. Body is passed in. Shared styles so visual consistency is enforced.

### `<RangeFilter>`, `<SelectFilter>`, `<ComboboxFilter>`, `<CheckFilter>`

Each is a popover body. They read/write a slice of the filter state via a prop pair `{value, onChange}`.

### `<PlatformPicker>`

```ts
type PlatformPickerProps = {
  value: Platform[];
  onChange: (v: Platform[]) => void;
  visible?: number; // default 19
};
```

Renders a horizontal row of icon buttons + a "More" popover. Icons from the project's existing icon set.

### `<ResultsTable>`

```ts
type ResultsTableProps = {
  rows: Creator[];
  lockedRows?: Creator[];
  selection: Set<string>;
  onSelectionChange: (s: Set<string>) => void;
  loading?: boolean;
};
```

Prefer TanStack Table if column resize/reorder is on the near roadmap; otherwise a plain `<table>` with shadcn styling is fine.

### `<Sparkline>`

```ts
type SparklineProps = {
  points: number[];   // daily values
  color?: string;     // default derived from delta sign
  width?: number;     // default 54
  height?: number;    // default 18
};
```

Renders a single SVG path. No axes, no tooltips — it's decorative.

---

## API contracts

### `POST /api/discovery`

Request body: validated `Filters` (same zod schema server-side).

Response:
```ts
{
  total: number;              // 341_800_000
  results: Creator[];         // current page
  locked: Creator[];          // teaser rows for upsell
  nextCursor?: string;
}
```

### `Creator` shape

```ts
type Creator = {
  id: string;
  name: string;
  handle: string;
  location?: string;
  verified: boolean;
  avatarUrl?: string;
  primaryPlatform: Platform;
  followers: number;
  er: number;                        // 0–1
  growth30d: number;                 // -1..1
  growthSeries: number[];            // ~14 points for sparkline
  emailAvailable: boolean;
  externalLinksUsed: number;
  topHashtags: string[];             // ordered
  platforms: Platform[];
};
```

### `POST /api/filter-presets`, `GET /api/filter-presets`
Name + serialized `Filters`.

### `POST /api/lists/:id/bulk-add`
`{ creatorIds: string[] }` or `{ filterSnapshot: Filters, scope: 'all' | 'selected' }`.

---

## Design Tokens

All colors, radii, spacing, type scale are defined in `tokens.css`. Map them into your Tailwind config so existing classes (`text-primary`, `bg-muted`, `rounded-xl`, etc.) match the mock.

**Colors used in this page** (reference):
- Page bg `#F4F6FA` (slightly cooler than slate-100 — or use `--tru-slate-100` if you don't want a new token).
- Surfaces `#FFFFFF`, border `#E2E8F0`, border-soft `#EEF2F7`.
- Ink `#0F172A`, ink-2 `#1E293B`, muted `#64748B`, muted-2 `#94A3B8`.
- Primary `#2563EB`, primary-ink `#1D4ED8`, blue-50 `#EFF6FF`.
- Success `#059669`, danger `#DC2626`.
- Avatar palette: `#7C3AED`, `#F59E0B`, `#0F172A`, `#EC4899`, `#2563EB`, `#0EA5E9` (deterministic from creator ID).

**Radii**: `8` (buttons, small), `10` (pills), `14` (cards), `9999` (count pill, Unlock CTA, platform action).

**Type scale** (matches `tokens.css`):
- Section label: `10.5px / 700 / 0.08em uppercase`
- Table header: `12.5px / 600`
- Body / dropdown labels: `13–13.5px / 500–600`
- Count pill: `13px / 400–700 mix`
- Avatar initials: `14px / 700`

**Spacing**: 4px grid. Filter card padding `14px`. Section gap inside card `~14–18px`. Results row padding `18px 14px`.

**Shadows**:
- Card: `0 1px 2px rgba(15,23,42,0.03)`.
- Export button: `0 1px 2px rgba(37,99,235,0.25)`.
- Sidebar logo: `var(--tru-shadow-blue)`.

---

## Assets

- **Fonts**: Inter variable (included in `fonts/`). Match the rest of the app.
- **Icons**: The mock uses an inline SVG sprite with custom icons for sidebar nav, platforms (Instagram, TikTok, YouTube, Twitch, Patreon, Twitter/X, Discord, Clubhouse, Snapchat, Facebook, Mastodon, Phone, Spotify, WhatsApp, Telegram, VK, LinkedIn, Tumblr), utility (search, caret, info, mail, link, kebab, export, plus, save, bookmark, verified-badge), and sparkline. In the real codebase, use your existing icon set (Lucide / custom pack). The sprite in `Discovery.html` is illustrative — keep it as a visual reference but replace with production icons.
- **Avatars**: placeholder initials-on-color. Hook up to real creator headshots from the search API.

---

## Files

This handoff bundle contains:

- `README.md` — this document.
- `Discovery.html` — the pixel-accurate design reference. Open in a browser to inspect layout, hover states, interactions. Right-click → Inspect to read exact CSS.
- `tokens.css` — the design tokens the HTML uses. Reproduces the Truleado design system's token set.
- `fonts/Inter-VariableFont_opsz_wght.ttf`, `fonts/Inter-Italic-VariableFont_opsz_wght.ttf` — Inter variable font files used by `tokens.css` (already in your codebase, included here for standalone fidelity).

---

## Recommended implementation order

1. Route `/discovery` + zod schema + URL sync. Empty page; console-log filter changes.
2. `<FilterDropdown>` primitive + primary row + quick filter row. Wire up 2–3 real filters.
3. API route with stub data + `<ResultsTable>` rendering stubs.
4. Advanced filters (Creator / Audience / Content) + platform picker.
5. Selection + floating action bar + Export dialog.
6. Save presets (save + list + apply + manage).
7. Loading / empty / error states, virtualization (TanStack Virtual over 50 rows), a11y pass (aria-expanded, aria-pressed, focus-visible rings, fieldset/legend).
8. Plan-gated locked rows + Unlock CTA (hook up to existing billing flow).

Each step ships independently behind a feature flag (`ff_discovery_v2`).

---

## Out of scope

- Mobile layout beyond the coarse breakpoint guidance above.
- Changes to the list / campaign / creator-detail pages (Discovery feeds into them; those surfaces are unchanged).
- Search infrastructure changes — assume the existing search backend can already answer the filter shape described above; any new fields (e.g. `reelsPct`, `growthSeries`) need backend coordination.

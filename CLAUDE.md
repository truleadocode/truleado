# CLAUDE.md — Truleado

## Project Overview

Truleado is an **Agency Operating System for Influencer Marketing** — a B2B SaaS platform that enables marketing agencies to execute, collaborate on, and report on influencer marketing campaigns. It has three separate portals: agency dashboard (`/dashboard`), client portal (`/client`), and creator portal (`/creator`).

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript (strict mode)
- **UI:** React 18, Tailwind CSS 3, shadcn/ui (new-york style, lucide icons)
- **Backend API:** GraphQL via Apollo Server 4 (`POST /api/graphql`)
- **Auth:** Firebase Authentication (JWTs) — magic link auth for client/creator portals
- **Database:** Supabase (PostgreSQL with Row Level Security)
- **Notifications:** Novu
- **Payments:** Razorpay
- **Forms:** react-hook-form + zod
- **Charts:** Recharts
- **Rich text:** Tiptap

## Commands

```bash
npm run dev          # Dev server at http://127.0.0.1:3000
npm run build        # Production build
npm run lint         # ESLint (next lint)
npm run db:migrate   # Push migrations (supabase db push)
npm run db:reset     # Reset local DB (supabase db reset)
npm run db:gen-types # Regenerate Supabase types → src/lib/supabase/database.types.ts
```

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/             # Login, signup, forgot-password
│   ├── (dashboard)/dashboard/  # Agency dashboard (protected)
│   │   ├── campaigns/, clients/, projects/, deliverables/, creators/
│   │   ├── contacts/, approvals/, settings/
│   ├── (onboarding)/       # Agency onboarding flow
│   ├── client/             # External client portal (magic link auth)
│   ├── creator/            # Creator portal (magic link auth)
│   └── api/                # API routes (graphql, upload, download, auth, razorpay)
├── components/
│   ├── ui/                 # shadcn/ui primitives
│   ├── layout/             # header, sidebar, protected-route
│   └── [feature]/          # Feature-specific components
├── contexts/
│   └── auth-context.tsx    # Firebase auth state + agency context
├── graphql/
│   ├── schema/typeDefs.ts  # GraphQL SDL
│   ├── resolvers/queries.ts
│   ├── resolvers/mutations/  # One file per domain
│   └── context.ts          # Request context (Firebase token verification)
├── hooks/                  # Custom React hooks
└── lib/
    ├── utils.ts            # cn() helper (clsx + tailwind-merge)
    ├── firebase/           # Client + Admin SDK init
    ├── supabase/           # Client, admin, storage helpers, database.types.ts
    ├── graphql/client.ts   # Frontend graphqlRequest(), queries{}, mutations{}
    ├── rbac/               # Roles, permissions, authorization helpers
    ├── audit/              # Fire-and-forget activity logging
    ├── analytics/          # Social analytics aggregation
    ├── social/             # Apify + YouTube API integrations
    └── novu/               # Notification client, triggers, workflows
```

## Domain Model

```
Agency → Client (Brand) → Project → Campaign → Deliverables, Creators, Payments, Analytics
```

## Key Conventions

### Code Style
- `"use client"` at top of all interactive components
- **Default exports** for page components, **named exports** for layout/feature components
- **PascalCase** for component names, **kebab-case** for filenames
- Import alias: `@/*` maps to `./src/*`
- Use `cn()` from `@/lib/utils` for all class merging

### State Management
- No Redux/Zustand — use React `useState` + `useCallback` + `useEffect`
- Auth state lives in `AuthContext`; agency selection persisted in `localStorage`

### Data Fetching
- No Apollo Client on the frontend — plain `fetch` via `graphqlRequest()` from `@/lib/graphql/client`
- All queries and mutations are pre-built string constants in `src/lib/graphql/client.ts`
- Auth header: `Authorization: Bearer <firebase_id_token>`
- Agency header: `X-Agency-ID: <agency_uuid>`

### GraphQL Mutations
- Explicit state transitions — named mutations per transition (e.g., `activateCampaign`, `submitCampaignForReview`), never generic update mutations
- All authorization happens server-side in resolvers, never on the frontend

### File Uploads
- All uploads go through `/api/upload` → Supabase Storage (service role key server-side)
- Downloads via `/api/download` (signed URLs)

### Notifications
- Toasts: `const { toast } = useToast()` for all user-facing feedback
- Background: Novu for in-app + email notifications

### Audit Logging
- Fire-and-forget via `logActivity()` / `logSystemActivity()` — never throws

## User Roles

- `AGENCY_ADMIN` — full access within agency
- `ACCOUNT_MANAGER` — manages client relationships
- `OPERATOR` — day-to-day campaign execution
- `INTERNAL_APPROVER` — reviews deliverables
- `CLIENT_USER` — external brand users
- `CREATOR` — campaign-scoped access via creator portal

## Product Documentation

Detailed specs live in `/product-documentation/`:
- `MASTER_PRD.md` — product requirements
- `TECHNICAL_LLD.md` — low-level design
- `DATABASE_SCHEMA_DDL.md` — full schema DDL
- `GRAPHQL_API_CONTRACT.md` — API contract
- `STATE_MACHINES.md` — state machine definitions

## Database

- Supabase (PostgreSQL 15) with Row Level Security on all tables
- 30 sequential migrations in `supabase/migrations/`
- Storage buckets: `campaign-attachments`, `deliverables`
- Types auto-generated — run `npm run db:gen-types` after schema changes

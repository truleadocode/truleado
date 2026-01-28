# Truleado

**Agency Operating System for Influencer Marketing**

Truleado is a B2B SaaS platform designed for marketing agencies to execute, collaborate, and report on influencer marketing campaigns.

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Backend**: GraphQL API (Apollo Server)
- **Authentication**: Firebase Authentication
- **Database**: Supabase (PostgreSQL with Row Level Security)

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account
- Firebase project

### Environment Setup

1. Copy the example environment file:
   ```bash
   cp .env.example .env.local
   ```

2. Fill in your environment variables:
   - Supabase URL and keys
   - Firebase configuration

### Database Setup

1. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Link to your Supabase project:
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   ```

3. Run migrations:
   ```bash
   npm run db:migrate
   ```

### Development

```bash
npm install
npm run dev
```

The app will be available at `http://localhost:3000`.
GraphQL playground is at `http://localhost:3000/api/graphql`.

## Architecture

### Domain Hierarchy

```
Agency
└── Client (Brand)
    └── Project
        └── Campaign (Execution Unit)
            ├── Deliverables
            ├── Approvals
            ├── Creators
            ├── Analytics
            └── Payments
```

### Key Principles

1. **Campaign-centric**: All execution resolves at campaign level
2. **Multi-tenant**: Agency isolation via RLS
3. **Immutable records**: Approvals, analytics, payments
4. **Explicit state machines**: No generic update mutations
5. **Backend authorization**: Frontend never decides permissions

### User Roles

- **Agency Admin**: Full access within agency
- **Account Manager**: Owns client relationships
- **Operator**: Day-to-day execution
- **Internal Approver**: Reviews deliverables
- **Client User**: External brand users
- **Creator**: Campaign-scoped access

## GraphQL API

Single endpoint: `POST /api/graphql`

Authentication via Firebase JWT in Authorization header:
```
Authorization: Bearer <firebase_id_token>
```

Agency context via header:
```
X-Agency-ID: <agency_uuid>
```

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/graphql/       # GraphQL endpoint
│   └── ...
├── graphql/
│   ├── schema/            # Type definitions
│   ├── resolvers/         # Query & mutation resolvers
│   ├── context.ts         # Request context
│   └── errors.ts          # Error definitions
├── lib/
│   ├── firebase/          # Firebase client & admin
│   ├── supabase/          # Supabase client & admin
│   ├── rbac/              # Permission system
│   └── audit/             # Activity logging
supabase/
└── migrations/            # Database migrations
```

## License

Proprietary - All rights reserved

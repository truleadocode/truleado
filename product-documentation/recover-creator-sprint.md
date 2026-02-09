Creator Contracting & Portal Sprint Plan
Overview
This plan implements the Creator Contracting & Portal feature for Truleado by extending (not forking) the existing campaign, deliverable, and notification systems. The implementation follows existing patterns (client portal magic links, RBAC system, deliverable workflows) and maintains backward compatibility.

Architecture Decisions
1. Creator Authentication: Link via creators.user_id
Decision: Add nullable user_id foreign key to creators table, reusing the existing Firebase + users table authentication system.

Why:

Maintains single identity system
Reuses proven client portal magic link pattern
Enables future flexibility (creators can become agency users)
1:1 relationship per agency (simpler than junction table)
2. Proposal System: Separate proposal_versions Table
Decision: Create append-only proposal_versions table with state tracking, plus denormalized current state on campaign_creators.

Why:

Immutable audit trail (append-only via RLS)
Efficient queries (can index on state, version_number)
Clean separation from campaign_creators.status (invite lifecycle)
Extensible for future features (attachments, milestones)
3. Deliverable Assignment: Nullable creator_id on Deliverables
Decision: Add nullable deliverables.creator_id foreign key.

Why:

Maintains campaign-centric design (deliverables exist independently)
Backward compatible (existing deliverables unaffected)
NULL = agency-executed content (not all deliverables need creators)
Simple queries for creator's assigned work
4. Reuse Existing Deliverable Workflow
Decision: Extend existing deliverable_versions and tracking systems with creator permissions.

Why:

Single source of truth (no sync issues)
Existing approval state machine works perfectly
Notifications already implemented
Zero duplication
Sprint Phases
Phase 1: Foundation (Sprint 1 - Days 1-3)
Goal: Database schema + creator authentication

Database Migrations
Migration 00022: Creator Authentication

Add creators.user_id UUID REFERENCES users(id) (nullable)
Add unique constraint: (agency_id, user_id) where user_id IS NOT NULL
Create RLS helper: is_creator_for_agency(p_agency_id UUID)
Create RLS helper: get_creator_id_for_user(p_agency_id UUID)
Migration 00023: Proposal System

Create proposal_state enum: draft | sent | countered | accepted | rejected
Create proposal_versions table (append-only):
id, campaign_creator_id, version_number, state
rate_amount, rate_currency, deliverable_scopes (JSONB), notes
created_by, created_by_type (agency | creator), created_at
Unique: (campaign_creator_id, version_number)
Add to campaign_creators: proposal_state, current_proposal_version, proposal_accepted_at
Create trigger: sync proposal_state from latest proposal_versions row
RLS policies: agency users see all proposals, creators see only their own
Migration 00024: Deliverable Creator Assignment

Add deliverables.creator_id UUID REFERENCES creators(id) (nullable)
Add deliverables.proposal_version_id UUID REFERENCES proposal_versions(id) (nullable, tracks which proposal)
Indexes on both columns
Migration 00025: Creator Tracking Permissions

RLS policies: creators can insert/view deliverable_tracking_records for their deliverables
RLS policies: creators can insert/view deliverable_tracking_urls for their tracking records
Migration 00026: Creator Deliverable Permissions

RLS policies: creators can insert/update/view deliverable_versions for their deliverables (except approved)
RLS policies: creators can view deliverables where creator_id matches
RLS policies: creators can view campaigns they're assigned to
RLS policies: creators can view their own campaign_creators records
Authentication Implementation
File: /src/app/api/creator-auth/request-magic-link/route.ts (new)

Replicate /api/client-auth/request-magic-link/route.ts pattern
Validate email against creators table (where is_active = true)
Generate Firebase magic link (60 min TTL)
Send via Novu workflow: creator-magic-link
Return 200 always (security: don't reveal if email exists)
File: /src/app/creator/verify/page.tsx (new)

Firebase email link sign-in
On first login: create users + auth_identities records, link creators.user_id
Redirect to /creator/dashboard
File: /src/app/creator/login/page.tsx (new)

Email input form
Call /api/creator-auth/request-magic-link
Show "Check your email" message
File: /src/graphql/context.ts (extend)

Add CreatorContext interface: { id, agencyId, displayName }
After loading contact, query creators where user_id = userRow.id and is_active = true
Populate ctx.creator if found
Verification
Creator can request magic link and authenticate
ctx.creator is populated in GraphQL context
RLS policies prevent cross-creator data access
Existing agency users maintain full access
Phase 2: Proposal System (Sprint 1-2 - Days 4-7)
Goal: Full proposal lifecycle (agency creates → creator responds)

GraphQL Schema
File: /src/graphql/schema/typeDefs.ts (extend)


enum ProposalState {
  DRAFT, SENT, COUNTERED, ACCEPTED, REJECTED
}

type ProposalDeliverableScope {
  deliverableType: String!
  quantity: Int!
  notes: String
}

type ProposalVersion {
  id: ID!
  campaignCreator: CampaignCreator!
  versionNumber: Int!
  state: ProposalState!
  rateAmount: Money
  rateCurrency: String
  deliverableScopes: [ProposalDeliverableScope!]!
  notes: String
  createdBy: User
  createdByType: String!
  createdAt: DateTime!
}

extend type CampaignCreator {
  proposalState: ProposalState
  currentProposalVersion: Int
  proposalAcceptedAt: DateTime
  proposalVersions: [ProposalVersion!]!
  currentProposal: ProposalVersion
}

extend type Deliverable {
  creator: Creator
  proposalVersion: ProposalVersion
}

input ProposalDeliverableScopeInput {
  deliverableType: String!
  quantity: Int!
  notes: String
}

input CreateProposalInput {
  campaignCreatorId: ID!
  rateAmount: Money
  rateCurrency: String
  deliverableScopes: [ProposalDeliverableScopeInput!]!
  notes: String
}

input CounterProposalInput {
  campaignCreatorId: ID!
  rateAmount: Money
  rateCurrency: String
  deliverableScopes: [ProposalDeliverableScopeInput!]!
  notes: String
}

type Mutation {
  createProposal(input: CreateProposalInput!): ProposalVersion!
  sendProposal(campaignCreatorId: ID!): ProposalVersion!
  acceptProposal(campaignCreatorId: ID!): ProposalVersion!
  rejectProposal(campaignCreatorId: ID!, reason: String): ProposalVersion!
  counterProposal(input: CounterProposalInput!): ProposalVersion!
  assignDeliverableToCreator(deliverableId: ID!, creatorId: ID!): Deliverable!
}
Proposal Resolvers
File: /src/graphql/resolvers/mutations/proposal.ts (new)

Implement mutations following existing patterns (see /mutations/creator.ts and /mutations/deliverable.ts):

createProposal (agency):

Verify campaign access with Permission.INVITE_CREATOR
Get next version number
Insert with state='draft', created_by_type='agency'
Log activity
sendProposal (agency):

Get latest draft proposal
Create new version with state='sent'
Trigger notification: proposal-sent (to creator email)
Log activity
acceptProposal (creator):

Require ctx.creator (creator auth)
Verify creator owns proposal
Create new version with state='accepted', created_by_type='creator'
Update campaign_creators.status = 'accepted'
Trigger notification: proposal-accepted (to agency team)
Log activity
counterProposal (creator):

Require ctx.creator
Create new version with state='countered', updated terms
Trigger notification: proposal-countered (to agency)
Log activity
rejectProposal (creator):

Create new version with state='rejected'
Update campaign_creators.status = 'declined'
Trigger notification: proposal-rejected (to agency)
Log activity
assignDeliverableToCreator (agency):

Verify campaign access with Permission.MANAGE_CAMPAIGN
Verify creator has accepted proposal (proposal_state='accepted')
Update deliverables.creator_id
Trigger notification: deliverable-assigned (to creator)
Log activity
Novu Workflows
Create workflows in Novu dashboard (multi-tenant per agency):

creator-magic-link: System → Creator (email with magic link)
proposal-sent: Agency → Creator (proposal details + action link)
proposal-accepted: Creator → Agency team (creator accepted)
proposal-countered: Creator → Agency team (new terms)
proposal-rejected: Creator → Agency team (rejection reason)
deliverable-assigned: Agency → Creator (deliverable details + due date)
File: /src/lib/novu/workflows/creator.ts (new)

Helper functions: notifyProposalSent, notifyProposalAccepted, etc. (follow pattern from /mutations/deliverable.ts notification helpers).

Verification
Agency can create, modify, and send proposals
Creators receive email notifications
Creators can accept/reject/counter proposals
Proposal history is immutable (append-only)
Agency receives counter-offer notifications
Phase 3: Creator Deliverable Execution (Sprint 2 - Days 8-11)
Goal: Creators can upload deliverables and submit tracking URLs

Authorization Extensions
File: /src/lib/rbac/types.ts (extend)

Add permissions:


export enum Permission {
  // ... existing ...

  // Creator-specific (NEW)
  MANAGE_CREATOR_PROPOSALS = 'manage_creator_proposals',
  VIEW_CREATOR_PROPOSALS = 'view_creator_proposals',
  ACCEPT_CREATOR_PROPOSAL = 'accept_creator_proposal',
  COUNTER_CREATOR_PROPOSAL = 'counter_creator_proposal',
  UPLOAD_CREATOR_DELIVERABLE = 'upload_creator_deliverable',
  VIEW_CREATOR_DELIVERABLE = 'view_creator_deliverable',
  SUBMIT_CREATOR_TRACKING = 'submit_creator_tracking',
}
File: /src/lib/rbac/permissions.ts (extend)


export const CREATOR_PERMISSIONS: Permission[] = [
  Permission.VIEW_CREATOR_PROPOSALS,
  Permission.ACCEPT_CREATOR_PROPOSAL,
  Permission.COUNTER_CREATOR_PROPOSAL,
  Permission.UPLOAD_CREATOR_DELIVERABLE,
  Permission.VIEW_CREATOR_DELIVERABLE,
  Permission.SUBMIT_CREATOR_TRACKING,
  Permission.VIEW_CAMPAIGN, // Read-only
];
File: /src/lib/rbac/authorize.ts (extend)

Add creator authorization guards (follow existing patterns):


export function requireCreator(ctx: GraphQLContext): CreatorContext {
  if (!ctx.creator) {
    throw forbiddenError('Creator authentication required');
  }
  return ctx.creator;
}

export async function hasCreatorCampaignAccess(
  creatorId: string,
  campaignId: string
): Promise<boolean> {
  // Check campaign_creators where creator_id matches and status IN ('invited', 'accepted')
}

export async function requireCreatorCampaignAccess(
  ctx: GraphQLContext,
  campaignId: string
): Promise<CreatorContext> {
  const creator = requireCreator(ctx);
  const hasAccess = await hasCreatorCampaignAccess(creator.id, campaignId);
  if (!hasAccess) throw forbiddenError('No access to campaign');
  return creator;
}

export async function hasCreatorDeliverableAccess(
  creatorId: string,
  deliverableId: string
): Promise<boolean> {
  // Check deliverables where creator_id matches
}

export async function requireCreatorDeliverableAccess(
  ctx: GraphQLContext,
  deliverableId: string
): Promise<CreatorContext> {
  const creator = requireCreator(ctx);
  const hasAccess = await hasCreatorDeliverableAccess(creator.id, deliverableId);
  if (!hasAccess) throw forbiddenError('No access to deliverable');
  return creator;
}
Extend Deliverable Mutations
File: /src/graphql/resolvers/mutations/deliverable.ts (extend)

Extend uploadDeliverableVersion (after requireAuth):


// Check if creator or agency user
if (ctx.creator) {
  await requireCreatorDeliverableAccess(ctx, deliverableId);
  // Creator can only upload to non-approved deliverables
  if (deliverable.status === 'approved') {
    throw forbiddenError('Cannot upload to approved deliverable');
  }
} else {
  // Existing agency user check
  await requireCampaignAccess(ctx, campaignId, Permission.UPLOAD_VERSION);
}
Extend submitDeliverableForReview: Same pattern (creator or agency)

File: /src/graphql/resolvers/mutations/deliverable-tracking.ts (extend)

Extend startDeliverableTracking (after approval check):


// Allow creator or agency to submit tracking URLs
if (ctx.creator) {
  await requireCreatorDeliverableAccess(ctx, deliverableId);
} else {
  await requireCampaignAccess(ctx, campaignId, Permission.VIEW_DELIVERABLE);
}
Extend Approval Notifications
File: /src/graphql/resolvers/mutations/deliverable.ts (extend)

In approveDeliverable and rejectDeliverable, add creator notification:


// After existing notifications, check if deliverable has creator
if (deliverable.creator_id) {
  const { data: creator } = await supabaseAdmin
    .from('creators')
    .select('email, display_name, user_id')
    .eq('id', deliverable.creator_id)
    .single();

  if (creator?.email) {
    await triggerNotification({
      workflowId: isApproved ? 'deliverable-approved-creator' : 'deliverable-rejected-creator',
      subscriberId: creator.email,
      email: creator.email,
      agencyId,
      data: {
        deliverableId,
        deliverableTitle: deliverable.title,
        approverName: ctx.user!.full_name,
        comment: comment || '',
        actionUrl: `/creator/deliverables/${deliverableId}`,
      },
    });
  }
}
Add Novu workflows:

deliverable-approved-creator: Agency → Creator (deliverable approved)
deliverable-rejected-creator: Agency → Creator (rejection + comment)
Creator-Scoped Queries
File: /src/graphql/resolvers/queries/creator.ts (new)


export async function myCreatorProfile(_: unknown, __: unknown, ctx: GraphQLContext) {
  const creator = requireCreator(ctx);
  const { data } = await supabaseAdmin
    .from('creators')
    .select('*')
    .eq('id', creator.id)
    .single();
  return data;
}

export async function myCreatorCampaigns(_: unknown, __: unknown, ctx: GraphQLContext) {
  const creator = requireCreator(ctx);
  const { data } = await supabaseAdmin
    .from('campaign_creators')
    .select('*, campaigns!inner(*), creators!inner(*)')
    .eq('creator_id', creator.id)
    .in('status', ['invited', 'accepted']);
  return data;
}

export async function myCreatorDeliverables(
  _: unknown,
  { campaignId }: { campaignId?: string },
  ctx: GraphQLContext
) {
  const creator = requireCreator(ctx);
  let query = supabaseAdmin
    .from('deliverables')
    .select('*')
    .eq('creator_id', creator.id);
  if (campaignId) query = query.eq('campaign_id', campaignId);
  const { data } = await query.order('created_at', { ascending: false });
  return data;
}

export async function myCreatorProposal(
  _: unknown,
  { campaignCreatorId }: { campaignCreatorId: string },
  ctx: GraphQLContext
) {
  const creator = requireCreator(ctx);
  const { data } = await supabaseAdmin
    .from('proposal_versions')
    .select('*, campaign_creators!inner(*)')
    .eq('campaign_creator_id', campaignCreatorId)
    .order('version_number', { ascending: false })
    .limit(1)
    .single();
  // Verify creator owns this
  if (data.campaign_creators.creator_id !== creator.id) {
    throw forbiddenError('Not your proposal');
  }
  return data;
}
Add to schema:


type Query {
  myCreatorProfile: Creator!
  myCreatorCampaigns: [CampaignCreator!]!
  myCreatorDeliverables(campaignId: ID): [Deliverable!]!
  myCreatorProposal(campaignCreatorId: ID!): ProposalVersion
}
File: /src/graphql/schema/index.ts (extend)

Register new query resolvers.

Verification
Creators can upload deliverable versions
Creators can submit tracking URLs after approval
Creators receive approval/rejection notifications
Creators cannot see other creators' work
Agency approvals still work as before
Phase 4: Creator Portal UI (Sprint 2-3 - Days 12-15)
Goal: Complete creator-facing portal

Pages
File: /src/app/creator/dashboard/page.tsx (new)

Overview: pending proposals, active campaigns, deliverables awaiting upload
Use myCreatorCampaigns, myCreatorDeliverables queries
Action cards: "Respond to proposal", "Upload deliverable", "Submit tracking URL"
File: /src/app/creator/campaigns/page.tsx (new)

List all campaigns (via myCreatorCampaigns)
Show proposal status, campaign dates, deliverable counts
Filter: pending proposals, active, completed
File: /src/app/creator/campaigns/[id]/page.tsx (new)

Campaign details (scoped view: name, brief, dates)
Assigned deliverables (status, due dates)
Proposal details (if not accepted yet)
Upload section for each deliverable
File: /src/app/creator/proposals/[campaignCreatorId]/page.tsx (new)

Proposal details (rate, deliverable scopes, notes)
Proposal history (negotiation versions)
Accept/Reject/Counter actions
Counter-offer form (rate + notes)
File: /src/app/creator/deliverables/[id]/page.tsx (new)

Deliverable details (title, description, type, due date)
Upload version form (file + caption)
Version history (creator's uploads only)
Approval status
Tracking URL submission (if approved)
Components
File: /src/components/creator/ProposalCard.tsx (new)

Display proposal summary
Accept/Reject buttons
Counter offer action
File: /src/components/creator/DeliverableUploadForm.tsx (new)

File upload (reuse existing upload logic)
Caption input
Submit button
File: /src/components/creator/TrackingURLForm.tsx (new)

Multiple URL inputs (1-10)
Validation
Submit button
File: /src/components/creator/Navigation.tsx (new)

Creator-specific nav: Dashboard, Campaigns, Profile
Logout action
Styling
Use existing Tailwind classes and component patterns from agency portal
Ensure mobile responsiveness
Add creator branding (distinct from agency portal)
Verification
Creator can navigate entire portal
All workflows are intuitive
Empty states render correctly
Mobile-friendly


Critical Files to Modify
New Files (20)
Migrations:

/supabase/migrations/00022_creator_authentication.sql
/supabase/migrations/00023_proposal_system.sql
/supabase/migrations/00024_deliverable_creator_assignment.sql
/supabase/migrations/00025_creator_tracking_permissions.sql
/supabase/migrations/00026_creator_deliverable_permissions.sql
API Routes:
6. /src/app/api/creator-auth/request-magic-link/route.ts

GraphQL:
7. /src/graphql/resolvers/mutations/proposal.ts
8. /src/graphql/resolvers/queries/creator.ts

Notifications:
9. /src/lib/novu/workflows/creator.ts

Pages:
10. /src/app/creator/login/page.tsx
11. /src/app/creator/verify/page.tsx
12. /src/app/creator/dashboard/page.tsx
13. /src/app/creator/campaigns/page.tsx
14. /src/app/creator/campaigns/[id]/page.tsx
15. /src/app/creator/proposals/[campaignCreatorId]/page.tsx
16. /src/app/creator/deliverables/[id]/page.tsx

Components:
17. /src/components/creator/ProposalCard.tsx
18. /src/components/creator/DeliverableUploadForm.tsx
19. /src/components/creator/TrackingURLForm.tsx
20. /src/components/creator/Navigation.tsx

Modified Files (6)
/src/graphql/context.ts - Add CreatorContext field and resolution logic
/src/graphql/schema/typeDefs.ts - Add proposal types, extend existing types
/src/graphql/schema/index.ts - Register new resolvers
/src/lib/rbac/types.ts - Add creator permissions
/src/lib/rbac/permissions.ts - Add creator permission matrix
/src/lib/rbac/authorize.ts - Add creator authorization guards
/src/graphql/resolvers/mutations/deliverable.ts - Extend for creator access, add creator notifications
/src/graphql/resolvers/mutations/deliverable-tracking.ts - Extend for creator access
Risk Mitigation
Risk: Creator Email Uniqueness
Scenario: Multiple creators across agencies with same email

Mitigation:

No unique constraint on creators.email (agency-scoped)
Magic link works per-agency (future: add agency context to auth)
For MVP: Assume emails unique per agency
Risk: Proposal State Conflicts
Scenario: Agency and creator modify proposal simultaneously

Mitigation:

Use database transactions with row-level locks
Optimistic locking in UI (version number checks)
Clear error messages on conflict
Risk: RLS Policy Performance
Scenario: Complex RLS policies slow queries

Mitigation:

Profile with EXPLAIN ANALYZE before/after
Add indexes on all foreign keys
Monitor query performance in production
Use materialized views if needed
Risk: Magic Link Abuse
Scenario: Attackers enumerate creator emails

Mitigation:

Rate limit: 10 requests/hour per IP
Always return 200 (don't reveal existence)
Log suspicious activity
CAPTCHA in production
Success Criteria
✅ Agencies can create and send proposals to creators
✅ Creators authenticate via magic link
✅ Creators can accept/reject/counter proposals
✅ Proposal history is immutable and auditable
✅ Deliverables can be assigned to creators
✅ Creators can upload deliverable versions
✅ Creators receive approval/rejection notifications
✅ Creators can submit tracking URLs post-approval
✅ Zero cross-creator data visibility
✅ All flows integrate seamlessly with existing approval system
✅ No breaking changes to existing GraphQL API
✅ Backward compatible (existing deliverables/campaigns unaffected)

Non-Functional Requirements Met
Audit Trail: All proposal versions immutable, activity logs for all actions
Security: Server-side RLS policies, creator isolation, magic link auth
Performance: Indexed queries, pagination support, < 500ms p95 target
Backward Compatibility: Nullable columns, additive changes only
API-First: GraphQL schema complete, supports future mobile app
Campaign-Centric: Deliverables remain campaign-scoped, creators are assigned
Notification Infrastructure: Reuses Novu, multi-tenant per agency
Dependencies
Firebase Admin SDK (already installed)
Novu SDK (already installed)
Supabase (already configured)
GraphQL schema generation tools (already configured)
No new external dependencies required


Notes
Existing Code Note: The acceptCampaignInvite mutation (line 343-344 in /mutations/creator.ts) currently requires agency auth with a comment "in future, this would be creator auth" — this is exactly what we're building. The proposal system replaces the simple invite/accept flow with a richer negotiation system.

Forward Compatibility: The type system already includes 'creator' as a UserRole (line 38 in /rbac/types.ts), showing this feature was anticipated.

Pattern Consistency: All implementations follow existing patterns from client portal (magic links), deliverable mutations (auth guards), and notification system (Novu triggers).
/**
 * Proposal Mutation Resolvers
 *
 * Manages the proposal lifecycle for creator contracts:
 * - Agency creates/sends proposals
 * - Creators accept/reject/counter proposals
 * - Agency assigns deliverables to creators with accepted proposals
 */

import { GraphQLContext, CreatorContext } from '../../context';
import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  requireAuth,
  requireCampaignAccess,
  getAgencyIdForCampaign,
  Permission,
} from '@/lib/rbac';
import { validationError, notFoundError, forbiddenError, invalidStateError } from '../../errors';
import { logActivity } from '@/lib/audit';
import {
  notifyProposalSent,
  notifyProposalAccepted,
  notifyProposalCountered,
  notifyProposalRejected,
  notifyDeliverableAssigned,
} from '@/lib/novu/workflows/creator';

// Valid proposal state transitions
const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ['sent'],
  sent: ['countered', 'accepted', 'rejected'],
  countered: ['sent', 'accepted', 'rejected'],
  accepted: [], // Terminal state
  rejected: [], // Terminal state
};

/**
 * Helper: Require creator authentication
 */
function requireCreator(ctx: GraphQLContext): CreatorContext {
  if (!ctx.creator) {
    throw forbiddenError('Creator authentication required');
  }
  return ctx.creator;
}

/**
 * Helper: Verify creator owns this campaign_creator record
 */
async function verifyCreatorOwnsProposal(
  creatorId: string,
  campaignCreatorId: string
): Promise<{ campaignCreator: CampaignCreatorRow; agencyId: string }> {
  const { data: campaignCreator, error } = await supabaseAdmin
    .from('campaign_creators')
    .select(`
      *,
      campaigns!inner(id, project_id, projects!inner(client_id, clients!inner(agency_id))),
      creators!inner(id, email, display_name)
    `)
    .eq('id', campaignCreatorId)
    .single();

  if (error || !campaignCreator) {
    throw notFoundError('CampaignCreator', campaignCreatorId);
  }

  if (campaignCreator.creator_id !== creatorId) {
    throw forbiddenError('You do not have access to this proposal');
  }

  const campaigns = campaignCreator.campaigns as {
    id: string;
    project_id: string;
    projects: { client_id: string; clients: { agency_id: string } };
  };
  const agencyId = campaigns.projects.clients.agency_id;

  return { campaignCreator: campaignCreator as CampaignCreatorRow, agencyId };
}

/**
 * Helper: Get the next version number for a campaign_creator
 */
async function getNextVersionNumber(campaignCreatorId: string): Promise<number> {
  const { data } = await supabaseAdmin
    .from('proposal_versions')
    .select('version_number')
    .eq('campaign_creator_id', campaignCreatorId)
    .order('version_number', { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data?.version_number ?? 0) + 1;
}

/**
 * Helper: Get the latest proposal version for a campaign_creator
 */
async function getLatestProposal(campaignCreatorId: string): Promise<ProposalVersionRow | null> {
  const { data } = await supabaseAdmin
    .from('proposal_versions')
    .select('*')
    .eq('campaign_creator_id', campaignCreatorId)
    .order('version_number', { ascending: false })
    .limit(1)
    .maybeSingle();

  return data as ProposalVersionRow | null;
}

// Type definitions for database rows
interface CampaignCreatorRow {
  id: string;
  campaign_id: string;
  creator_id: string;
  status: string;
  proposal_state: string | null;
  current_proposal_version: number | null;
  rate_amount: number | null;
  rate_currency: string | null;
  notes: string | null;
  campaigns?: {
    id: string;
    name?: string;
    project_id: string;
    projects: { client_id: string; clients: { agency_id: string } };
  };
  creators?: {
    id: string;
    email: string | null;
    display_name: string;
  };
}

interface ProposalVersionRow {
  id: string;
  campaign_creator_id: string;
  version_number: number;
  state: string;
  rate_amount: number | null;
  rate_currency: string | null;
  deliverable_scopes: unknown;
  notes: string | null;
  created_by: string | null;
  created_by_type: string;
  created_at: string;
}

interface DeliverableScopeInput {
  deliverableType: string;
  quantity: number;
  notes?: string | null;
}

/**
 * Create a new proposal (agency action)
 * Creates a draft proposal with terms for a campaign creator
 */
export async function createProposal(
  _: unknown,
  {
    input,
  }: {
    input: {
      campaignCreatorId: string;
      rateAmount?: number;
      rateCurrency?: string;
      deliverableScopes: DeliverableScopeInput[];
      notes?: string;
    };
  },
  ctx: GraphQLContext
) {
  const { campaignCreatorId, rateAmount, rateCurrency, deliverableScopes, notes } = input;

  // Fetch campaign_creator with campaign info
  const { data: campaignCreator, error: fetchError } = await supabaseAdmin
    .from('campaign_creators')
    .select(`
      *,
      campaigns!inner(id, name, project_id, projects!inner(client_id, clients!inner(agency_id))),
      creators!inner(id, email, display_name)
    `)
    .eq('id', campaignCreatorId)
    .single();

  if (fetchError || !campaignCreator) {
    throw notFoundError('CampaignCreator', campaignCreatorId);
  }

  const campaigns = campaignCreator.campaigns as {
    id: string;
    name: string;
    project_id: string;
    projects: { client_id: string; clients: { agency_id: string } };
  };

  // Check agency access
  await requireCampaignAccess(ctx, campaigns.id, Permission.INVITE_CREATOR);

  const agencyId = campaigns.projects.clients.agency_id;

  // Validate campaign_creator status
  if (!['invited', 'accepted'].includes(campaignCreator.status)) {
    throw validationError(
      `Cannot create proposal for creator with status: ${campaignCreator.status}`
    );
  }

  // Validate deliverable scopes
  if (!deliverableScopes || deliverableScopes.length === 0) {
    throw validationError('At least one deliverable scope is required');
  }

  // Get next version number
  const versionNumber = await getNextVersionNumber(campaignCreatorId);

  // Insert proposal version
  const { data: proposal, error: insertError } = await supabaseAdmin
    .from('proposal_versions')
    .insert({
      campaign_creator_id: campaignCreatorId,
      version_number: versionNumber,
      state: 'draft',
      rate_amount: rateAmount ?? null,
      rate_currency: rateCurrency || 'USD',
      deliverable_scopes: deliverableScopes,
      notes: notes?.trim() || null,
      created_by: ctx.user!.id,
      created_by_type: 'agency',
    })
    .select()
    .single();

  if (insertError || !proposal) {
    throw new Error('Failed to create proposal');
  }

  // Log activity
  await logActivity({
    agencyId,
    entityType: 'proposal_version',
    entityId: proposal.id,
    action: 'created',
    actorId: ctx.user!.id,
    actorType: 'user',
    afterState: proposal,
    metadata: { campaignCreatorId, versionNumber },
  });

  return proposal;
}

/**
 * Send a proposal to the creator (agency action)
 * Transitions from draft/countered to sent and notifies the creator
 */
export async function sendProposal(
  _: unknown,
  { campaignCreatorId }: { campaignCreatorId: string },
  ctx: GraphQLContext
) {
  // Fetch campaign_creator with campaign info
  const { data: campaignCreator, error: fetchError } = await supabaseAdmin
    .from('campaign_creators')
    .select(`
      *,
      campaigns!inner(id, name, project_id, projects!inner(client_id, clients!inner(agency_id))),
      creators!inner(id, email, display_name)
    `)
    .eq('id', campaignCreatorId)
    .single();

  if (fetchError || !campaignCreator) {
    throw notFoundError('CampaignCreator', campaignCreatorId);
  }

  const campaigns = campaignCreator.campaigns as {
    id: string;
    name: string;
    project_id: string;
    projects: { client_id: string; clients: { agency_id: string } };
  };
  const creators = campaignCreator.creators as {
    id: string;
    email: string | null;
    display_name: string;
  };

  // Check agency access
  await requireCampaignAccess(ctx, campaigns.id, Permission.INVITE_CREATOR);

  const agencyId = campaigns.projects.clients.agency_id;

  // Get latest proposal
  const latestProposal = await getLatestProposal(campaignCreatorId);
  if (!latestProposal) {
    throw validationError('No proposal exists to send. Create a proposal first.');
  }

  // Validate state transition
  const currentState = latestProposal.state;
  if (!VALID_TRANSITIONS[currentState]?.includes('sent')) {
    throw invalidStateError(
      `Cannot send proposal from state: ${currentState}`,
      currentState,
      'sent'
    );
  }

  // Get next version number
  const versionNumber = await getNextVersionNumber(campaignCreatorId);

  // Insert new version with sent state (copy terms from previous version)
  const { data: proposal, error: insertError } = await supabaseAdmin
    .from('proposal_versions')
    .insert({
      campaign_creator_id: campaignCreatorId,
      version_number: versionNumber,
      state: 'sent',
      rate_amount: latestProposal.rate_amount,
      rate_currency: latestProposal.rate_currency,
      deliverable_scopes: latestProposal.deliverable_scopes,
      notes: latestProposal.notes,
      created_by: ctx.user!.id,
      created_by_type: 'agency',
    })
    .select()
    .single();

  if (insertError || !proposal) {
    throw new Error('Failed to send proposal');
  }

  // Log activity
  await logActivity({
    agencyId,
    entityType: 'proposal_version',
    entityId: proposal.id,
    action: 'sent',
    actorId: ctx.user!.id,
    actorType: 'user',
    beforeState: latestProposal as unknown as Record<string, unknown>,
    afterState: proposal as unknown as Record<string, unknown>,
    metadata: { campaignCreatorId, fromState: currentState },
  });

  // Send notification to creator
  if (creators.email) {
    try {
      await notifyProposalSent({
        agencyId,
        creatorEmail: creators.email,
        creatorName: creators.display_name,
        campaignName: campaigns.name,
        campaignCreatorId,
        rateAmount: latestProposal.rate_amount ?? undefined,
        rateCurrency: latestProposal.rate_currency ?? undefined,
      });
    } catch (err) {
      console.error('[Proposal] Failed to send notification:', err);
      // Don't fail the mutation
    }
  }

  return proposal;
}

/**
 * Accept a proposal (creator action)
 * Creator accepts the current proposal terms
 */
export async function acceptProposal(
  _: unknown,
  { campaignCreatorId }: { campaignCreatorId: string },
  ctx: GraphQLContext
) {
  const creator = requireCreator(ctx);
  const { campaignCreator, agencyId } = await verifyCreatorOwnsProposal(
    creator.id,
    campaignCreatorId
  );

  // Get latest proposal
  const latestProposal = await getLatestProposal(campaignCreatorId);
  if (!latestProposal) {
    throw validationError('No proposal exists to accept');
  }

  // Validate state transition
  const currentState = latestProposal.state;
  if (!VALID_TRANSITIONS[currentState]?.includes('accepted')) {
    throw invalidStateError(
      `Cannot accept proposal from state: ${currentState}`,
      currentState,
      'accepted'
    );
  }

  // Get next version number
  const versionNumber = await getNextVersionNumber(campaignCreatorId);

  // Insert accepted version
  const { data: proposal, error: insertError } = await supabaseAdmin
    .from('proposal_versions')
    .insert({
      campaign_creator_id: campaignCreatorId,
      version_number: versionNumber,
      state: 'accepted',
      rate_amount: latestProposal.rate_amount,
      rate_currency: latestProposal.rate_currency,
      deliverable_scopes: latestProposal.deliverable_scopes,
      notes: latestProposal.notes,
      created_by: ctx.user!.id,
      created_by_type: 'creator',
    })
    .select()
    .single();

  if (insertError || !proposal) {
    throw new Error('Failed to accept proposal');
  }

  // Update campaign_creator status to accepted
  await supabaseAdmin
    .from('campaign_creators')
    .update({ status: 'accepted' })
    .eq('id', campaignCreatorId);

  // Log activity
  await logActivity({
    agencyId,
    entityType: 'proposal_version',
    entityId: proposal.id,
    action: 'accepted',
    actorId: ctx.user!.id,
    actorType: 'user',
    beforeState: latestProposal as unknown as Record<string, unknown>,
    afterState: proposal as unknown as Record<string, unknown>,
    metadata: { campaignCreatorId, creatorId: creator.id },
  });

  // Notify agency team
  try {
    const campaigns = campaignCreator.campaigns as { id: string; name?: string };
    const creators = campaignCreator.creators as { display_name: string };
    await notifyProposalAccepted({
      agencyId,
      campaignId: campaigns.id,
      campaignName: campaigns.name ?? 'Campaign',
      creatorName: creators.display_name,
      campaignCreatorId,
    });
  } catch (err) {
    console.error('[Proposal] Failed to send notification:', err);
  }

  return proposal;
}

/**
 * Counter a proposal (creator action)
 * Creator proposes different terms
 */
export async function counterProposal(
  _: unknown,
  {
    input,
  }: {
    input: {
      campaignCreatorId: string;
      rateAmount?: number;
      rateCurrency?: string;
      deliverableScopes: DeliverableScopeInput[];
      notes?: string;
    };
  },
  ctx: GraphQLContext
) {
  const { campaignCreatorId, rateAmount, rateCurrency, deliverableScopes, notes } = input;

  const creator = requireCreator(ctx);
  const { campaignCreator, agencyId } = await verifyCreatorOwnsProposal(
    creator.id,
    campaignCreatorId
  );

  // Get latest proposal
  const latestProposal = await getLatestProposal(campaignCreatorId);
  if (!latestProposal) {
    throw validationError('No proposal exists to counter');
  }

  // Validate state transition
  const currentState = latestProposal.state;
  if (!VALID_TRANSITIONS[currentState]?.includes('countered')) {
    throw invalidStateError(
      `Cannot counter proposal from state: ${currentState}`,
      currentState,
      'countered'
    );
  }

  // Validate deliverable scopes
  if (!deliverableScopes || deliverableScopes.length === 0) {
    throw validationError('At least one deliverable scope is required');
  }

  // Get next version number
  const versionNumber = await getNextVersionNumber(campaignCreatorId);

  // Insert countered version
  const { data: proposal, error: insertError } = await supabaseAdmin
    .from('proposal_versions')
    .insert({
      campaign_creator_id: campaignCreatorId,
      version_number: versionNumber,
      state: 'countered',
      rate_amount: rateAmount ?? null,
      rate_currency: rateCurrency || latestProposal.rate_currency || 'USD',
      deliverable_scopes: deliverableScopes,
      notes: notes?.trim() || null,
      created_by: ctx.user!.id,
      created_by_type: 'creator',
    })
    .select()
    .single();

  if (insertError || !proposal) {
    throw new Error('Failed to counter proposal');
  }

  // Log activity
  await logActivity({
    agencyId,
    entityType: 'proposal_version',
    entityId: proposal.id,
    action: 'countered',
    actorId: ctx.user!.id,
    actorType: 'user',
    beforeState: latestProposal as unknown as Record<string, unknown>,
    afterState: proposal as unknown as Record<string, unknown>,
    metadata: { campaignCreatorId, creatorId: creator.id },
  });

  // Notify agency team
  try {
    const campaigns = campaignCreator.campaigns as { id: string; name?: string };
    const creators = campaignCreator.creators as { display_name: string };
    await notifyProposalCountered({
      agencyId,
      campaignId: campaigns.id,
      campaignName: campaigns.name ?? 'Campaign',
      creatorName: creators.display_name,
      campaignCreatorId,
      rateAmount: rateAmount ?? undefined,
      rateCurrency: rateCurrency ?? undefined,
    });
  } catch (err) {
    console.error('[Proposal] Failed to send notification:', err);
  }

  return proposal;
}

/**
 * Reject a proposal (creator action)
 * Creator declines the proposal
 */
export async function rejectProposal(
  _: unknown,
  { campaignCreatorId, reason }: { campaignCreatorId: string; reason?: string },
  ctx: GraphQLContext
) {
  const creator = requireCreator(ctx);
  const { campaignCreator, agencyId } = await verifyCreatorOwnsProposal(
    creator.id,
    campaignCreatorId
  );

  // Get latest proposal
  const latestProposal = await getLatestProposal(campaignCreatorId);
  if (!latestProposal) {
    throw validationError('No proposal exists to reject');
  }

  // Validate state transition
  const currentState = latestProposal.state;
  if (!VALID_TRANSITIONS[currentState]?.includes('rejected')) {
    throw invalidStateError(
      `Cannot reject proposal from state: ${currentState}`,
      currentState,
      'rejected'
    );
  }

  // Get next version number
  const versionNumber = await getNextVersionNumber(campaignCreatorId);

  // Insert rejected version
  const { data: proposal, error: insertError } = await supabaseAdmin
    .from('proposal_versions')
    .insert({
      campaign_creator_id: campaignCreatorId,
      version_number: versionNumber,
      state: 'rejected',
      rate_amount: latestProposal.rate_amount,
      rate_currency: latestProposal.rate_currency,
      deliverable_scopes: latestProposal.deliverable_scopes,
      notes: reason?.trim() || latestProposal.notes,
      created_by: ctx.user!.id,
      created_by_type: 'creator',
    })
    .select()
    .single();

  if (insertError || !proposal) {
    throw new Error('Failed to reject proposal');
  }

  // Update campaign_creator status to declined
  await supabaseAdmin
    .from('campaign_creators')
    .update({ status: 'declined' })
    .eq('id', campaignCreatorId);

  // Log activity
  await logActivity({
    agencyId,
    entityType: 'proposal_version',
    entityId: proposal.id,
    action: 'rejected',
    actorId: ctx.user!.id,
    actorType: 'user',
    beforeState: latestProposal as unknown as Record<string, unknown>,
    afterState: proposal as unknown as Record<string, unknown>,
    metadata: { campaignCreatorId, creatorId: creator.id, reason },
  });

  // Notify agency team
  try {
    const campaigns = campaignCreator.campaigns as { id: string; name?: string };
    const creators = campaignCreator.creators as { display_name: string };
    await notifyProposalRejected({
      agencyId,
      campaignId: campaigns.id,
      campaignName: campaigns.name ?? 'Campaign',
      creatorName: creators.display_name,
      campaignCreatorId,
      reason: reason ?? undefined,
    });
  } catch (err) {
    console.error('[Proposal] Failed to send notification:', err);
  }

  return proposal;
}

/**
 * Assign a deliverable to a creator (agency action)
 * Links a deliverable to a creator who has an accepted proposal
 */
export async function assignDeliverableToCreator(
  _: unknown,
  { deliverableId, creatorId }: { deliverableId: string; creatorId: string },
  ctx: GraphQLContext
) {
  // Fetch deliverable with campaign info
  const { data: deliverable, error: deliverableError } = await supabaseAdmin
    .from('deliverables')
    .select(`
      *,
      campaigns!inner(id, name, project_id, projects!inner(client_id, clients!inner(agency_id)))
    `)
    .eq('id', deliverableId)
    .single();

  if (deliverableError || !deliverable) {
    throw notFoundError('Deliverable', deliverableId);
  }

  const campaigns = deliverable.campaigns as {
    id: string;
    name: string;
    project_id: string;
    projects: { client_id: string; clients: { agency_id: string } };
  };

  // Check agency access
  await requireCampaignAccess(ctx, campaigns.id, Permission.MANAGE_CAMPAIGN);

  const agencyId = campaigns.projects.clients.agency_id;

  // Verify creator exists and has accepted proposal for this campaign
  const { data: campaignCreator, error: ccError } = await supabaseAdmin
    .from('campaign_creators')
    .select('id, proposal_state, creators!inner(id, email, display_name)')
    .eq('campaign_id', campaigns.id)
    .eq('creator_id', creatorId)
    .single();

  if (ccError || !campaignCreator) {
    throw validationError('Creator is not assigned to this campaign');
  }

  if (campaignCreator.proposal_state !== 'accepted') {
    throw validationError(
      `Cannot assign deliverable: creator proposal is ${campaignCreator.proposal_state || 'not sent'}, must be accepted`
    );
  }

  const creators = campaignCreator.creators as {
    id: string;
    email: string | null;
    display_name: string;
  };

  // Update deliverable
  const { data: updated, error: updateError } = await supabaseAdmin
    .from('deliverables')
    .update({
      creator_id: creatorId,
    })
    .eq('id', deliverableId)
    .select()
    .single();

  if (updateError || !updated) {
    throw new Error('Failed to assign deliverable');
  }

  // Log activity
  await logActivity({
    agencyId,
    entityType: 'deliverable',
    entityId: deliverableId,
    action: 'assigned_to_creator',
    actorId: ctx.user!.id,
    actorType: 'user',
    beforeState: deliverable,
    afterState: updated,
    metadata: { creatorId, campaignCreatorId: campaignCreator.id },
  });

  // Notify creator
  if (creators.email) {
    try {
      await notifyDeliverableAssigned({
        agencyId,
        creatorEmail: creators.email,
        creatorName: creators.display_name,
        deliverableId,
        deliverableTitle: deliverable.title,
        campaignName: campaigns.name,
        dueDate: deliverable.due_date ?? undefined,
      });
    } catch (err) {
      console.error('[Proposal] Failed to send notification:', err);
    }
  }

  return updated;
}

/**
 * Resend Notification Mutation Resolver
 *
 * Re-triggers notifications with fresh data from the database.
 * Supports: proposal sent, approval requested, deliverable assigned, deliverable reminder.
 */

import { GraphQLContext } from '../../context';
import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  requireAuth,
  requireCampaignAccess,
  getAgencyIdForCampaign,
  Permission,
} from '@/lib/rbac';
import { validationError, notFoundError } from '../../errors';
import { logActivity } from '@/lib/audit';
import { triggerNotification } from '@/lib/novu/trigger';
import { ensureSubscriber } from '@/lib/novu/subscriber';
import {
  notifyProposalSent,
  notifyDeliverableAssigned,
} from '@/lib/novu/workflows/creator';
import {
  getCampaignApproverUserIds,
  notifyApprovalRequested,
  getBaseUrl,
} from './deliverable';

export async function resendNotification(
  _: unknown,
  { type, entityId }: { type: string; entityId: string },
  ctx: GraphQLContext
): Promise<boolean> {
  requireAuth(ctx);

  switch (type) {
    case 'PROPOSAL_SENT':
      return resendProposalSent(entityId, ctx);
    case 'APPROVAL_REQUESTED':
      return resendApprovalRequested(entityId, ctx);
    case 'DELIVERABLE_ASSIGNED':
      return resendDeliverableAssigned(entityId, ctx);
    case 'DELIVERABLE_REMINDER':
      return resendDeliverableReminder(entityId, ctx);
    default:
      throw validationError(`Unknown notification type: ${type}`);
  }
}

/**
 * Re-send proposal notification to creator with fresh data.
 * entityId = campaign_creator ID
 */
async function resendProposalSent(campaignCreatorId: string, ctx: GraphQLContext): Promise<boolean> {
  // Fetch fresh campaign_creator + creator + campaign data
  const { data: cc, error } = await supabaseAdmin
    .from('campaign_creators')
    .select('id, creator_id, campaign_id, proposal_state, creators!inner(id, email, display_name), campaigns!inner(id, name)')
    .eq('id', campaignCreatorId)
    .single();

  if (error || !cc) {
    throw notFoundError('CampaignCreator', campaignCreatorId);
  }

  const creator = cc.creators as unknown as { id: string; email: string | null; display_name: string };
  const campaign = cc.campaigns as unknown as { id: string; name: string };

  // Validate resendable state
  if (!['sent', 'countered'].includes(cc.proposal_state || '')) {
    throw validationError('Proposal is not in a resendable state (must be sent or countered)');
  }

  if (!creator.email) {
    throw validationError('Creator has no email address');
  }

  await requireCampaignAccess(ctx, campaign.id, Permission.INVITE_CREATOR);
  const agencyId = await getAgencyIdForCampaign(campaign.id);

  // Get latest proposal version for rate info
  const { data: latestVersion } = await supabaseAdmin
    .from('proposal_versions')
    .select('rate_amount, rate_currency')
    .eq('campaign_creator_id', campaignCreatorId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (agencyId) {
    try {
      await notifyProposalSent({
        agencyId,
        creatorEmail: creator.email,
        creatorName: creator.display_name,
        campaignName: campaign.name,
        campaignCreatorId,
        rateAmount: latestVersion?.rate_amount ?? undefined,
        rateCurrency: latestVersion?.rate_currency ?? undefined,
      });
    } catch (err) {
      console.error('[Novu] Failed to resend proposal notification:', err);
    }

    await logActivity({
      agencyId,
      entityType: 'campaign_creator',
      entityId: campaignCreatorId,
      action: 'notification_resent',
      actorId: ctx.user!.id,
      actorType: 'user',
      metadata: { notificationType: 'PROPOSAL_SENT' },
    });
  }

  return true;
}

/**
 * Re-send approval request notification to current-level approvers with fresh data.
 * entityId = deliverable ID
 */
async function resendApprovalRequested(deliverableId: string, ctx: GraphQLContext): Promise<boolean> {
  const { data: deliverable, error } = await supabaseAdmin
    .from('deliverables')
    .select('*, campaigns!inner(id, name, project_id)')
    .eq('id', deliverableId)
    .single();

  if (error || !deliverable) {
    throw notFoundError('Deliverable', deliverableId);
  }

  const campaign = deliverable.campaigns as { id: string; name: string; project_id: string };
  const status = (deliverable.status as string).toLowerCase();

  // Validate resendable state
  if (!['internal_review', 'pending_project_approval', 'client_review'].includes(status)) {
    throw validationError('Deliverable is not in a review state');
  }

  await requireCampaignAccess(ctx, campaign.id, Permission.MANAGE_CAMPAIGN);
  const agencyId = await getAgencyIdForCampaign(campaign.id);

  if (!agencyId) return true;

  if (status === 'internal_review') {
    const approverIds = await getCampaignApproverUserIds(campaign.id);
    if (approverIds.length > 0) {
      try {
        await notifyApprovalRequested({
          agencyId,
          deliverableId,
          deliverableTitle: deliverable.title,
          campaignId: campaign.id,
          approvalLevel: 'internal',
          recipientUserIds: approverIds,
        });
      } catch (err) {
        console.error('[Novu] Failed to resend internal approval notification:', err);
      }
    }
  } else if (status === 'pending_project_approval') {
    const { data: projectApprovers } = await supabaseAdmin
      .from('project_approvers')
      .select('user_id')
      .eq('project_id', campaign.project_id);
    const approverIds = (projectApprovers || []).map((r: { user_id: string }) => r.user_id);
    if (approverIds.length > 0) {
      try {
        await notifyApprovalRequested({
          agencyId,
          deliverableId,
          deliverableTitle: deliverable.title,
          campaignId: campaign.id,
          approvalLevel: 'project',
          recipientUserIds: approverIds,
        });
      } catch (err) {
        console.error('[Novu] Failed to resend project approval notification:', err);
      }
    }
  } else if (status === 'client_review') {
    // Client approvers are contacts, not users — use direct trigger pattern
    const { data: projectRow } = await supabaseAdmin
      .from('projects')
      .select('client_id')
      .eq('id', campaign.project_id)
      .single();

    if (projectRow?.client_id) {
      const { data: contacts } = await supabaseAdmin
        .from('contacts')
        .select('id, user_id, email, first_name, last_name')
        .eq('client_id', projectRow.client_id)
        .eq('is_client_approver', true);

      const baseUrl = getBaseUrl();
      for (const c of contacts || []) {
        const subscriberId = c.user_id ?? c.id;
        const email = c.email ?? undefined;
        try {
          await ensureSubscriber({
            subscriberId,
            email,
            firstName: c.first_name,
            lastName: c.last_name,
            tenantId: agencyId,
          });
          await triggerNotification({
            workflowId: 'approval-requested',
            subscriberId,
            email,
            agencyId,
            data: {
              deliverableId,
              deliverableTitle: deliverable.title,
              campaignId: campaign.id,
              approvalLevel: 'client',
              baseUrl,
              actionUrl: `/dashboard/deliverables/${deliverableId}`,
            },
          });
        } catch (err) {
          console.error('[Novu] Failed to resend client approval notification:', err);
        }
      }
    }
  }

  await logActivity({
    agencyId,
    entityType: 'deliverable',
    entityId: deliverableId,
    action: 'notification_resent',
    actorId: ctx.user!.id,
    actorType: 'user',
    metadata: { notificationType: 'APPROVAL_REQUESTED', approvalLevel: status },
  });

  return true;
}

/**
 * Re-send deliverable assignment notification to creator with fresh data.
 * entityId = deliverable ID
 */
async function resendDeliverableAssigned(deliverableId: string, ctx: GraphQLContext): Promise<boolean> {
  const { data: deliverable, error } = await supabaseAdmin
    .from('deliverables')
    .select('*, campaigns!inner(id, name)')
    .eq('id', deliverableId)
    .single();

  if (error || !deliverable) {
    throw notFoundError('Deliverable', deliverableId);
  }

  const campaign = deliverable.campaigns as { id: string; name: string };

  if (!deliverable.creator_id) {
    throw validationError('No creator assigned to this deliverable');
  }

  await requireCampaignAccess(ctx, campaign.id, Permission.MANAGE_CAMPAIGN);
  const agencyId = await getAgencyIdForCampaign(campaign.id);

  // Fetch fresh creator data
  const { data: creator } = await supabaseAdmin
    .from('creators')
    .select('email, display_name')
    .eq('id', deliverable.creator_id)
    .single();

  if (!creator?.email) {
    throw validationError('Creator has no email address');
  }

  if (agencyId) {
    try {
      await notifyDeliverableAssigned({
        agencyId,
        creatorEmail: creator.email,
        creatorName: creator.display_name,
        deliverableId,
        deliverableTitle: deliverable.title,
        campaignName: campaign.name,
        dueDate: deliverable.due_date ?? undefined,
      });
    } catch (err) {
      console.error('[Novu] Failed to resend deliverable assignment notification:', err);
    }

    await logActivity({
      agencyId,
      entityType: 'deliverable',
      entityId: deliverableId,
      action: 'notification_resent',
      actorId: ctx.user!.id,
      actorType: 'user',
      metadata: { notificationType: 'DELIVERABLE_ASSIGNED', creatorId: deliverable.creator_id },
    });
  }

  return true;
}

/**
 * Re-send deliverable reminder to creator with fresh data.
 * entityId = deliverable ID
 */
async function resendDeliverableReminder(deliverableId: string, ctx: GraphQLContext): Promise<boolean> {
  const { data: deliverable, error } = await supabaseAdmin
    .from('deliverables')
    .select('*, campaigns!inner(id, name)')
    .eq('id', deliverableId)
    .single();

  if (error || !deliverable) {
    throw notFoundError('Deliverable', deliverableId);
  }

  const campaign = deliverable.campaigns as { id: string; name: string };
  await requireCampaignAccess(ctx, campaign.id, Permission.MANAGE_CAMPAIGN);

  if (!deliverable.creator_id) {
    throw validationError('No creator assigned to this deliverable');
  }

  const agencyId = await getAgencyIdForCampaign(campaign.id);

  const { data: creator } = await supabaseAdmin
    .from('creators')
    .select('email, display_name')
    .eq('id', deliverable.creator_id)
    .single();

  if (creator?.email && agencyId) {
    try {
      const creatorSubscriberId = deliverable.creator_id;
      await ensureSubscriber({
        subscriberId: creatorSubscriberId,
        email: creator.email,
        firstName: creator.display_name?.split(' ')[0] ?? null,
        lastName: creator.display_name?.split(' ').slice(1).join(' ') || null,
        tenantId: agencyId,
      });
      const baseUrl = getBaseUrl();
      await triggerNotification({
        workflowId: 'deliverable-reminder',
        subscriberId: creatorSubscriberId,
        email: creator.email,
        agencyId,
        data: {
          deliverableId,
          deliverableTitle: deliverable.title,
          campaignName: campaign.name,
          baseUrl,
          actionUrl: `/creator/deliverables/${deliverableId}`,
        },
      });
    } catch (err) {
      console.error('[Novu] Failed to resend deliverable reminder:', err);
    }

    await logActivity({
      agencyId,
      entityType: 'deliverable',
      entityId: deliverableId,
      action: 'notification_resent',
      actorId: ctx.user!.id,
      actorType: 'user',
      metadata: { notificationType: 'DELIVERABLE_REMINDER', creatorId: deliverable.creator_id },
    });
  }

  return true;
}

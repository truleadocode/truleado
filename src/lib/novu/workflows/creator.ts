/**
 * Creator Notification Workflow Helpers
 *
 * Helper functions to trigger Novu workflows for creator-related notifications.
 * Follows the pattern from deliverable notifications.
 */

import { triggerNotification } from '@/lib/novu/trigger';
import { ensureSubscriber } from '@/lib/novu/subscriber';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { formatCurrency } from '@/lib/currency';

/**
 * Get the base URL for action links
 * Uses NEXT_PUBLIC_APP_URL (same as magic link routes) with fallbacks
 */
function getBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL?.trim()
    || process.env.NEXT_PUBLIC_URL?.trim()
    || process.env.VERCEL_URL?.trim()
    || 'http://localhost:3000';

  const fullUrl = url.startsWith('http') ? url : `https://${url}`;
  return fullUrl.replace(/\/$/, ''); // Remove trailing slash
}

/**
 * Format currency amount for display
 * Amounts are stored in smallest unit (paise/cents), convert to main unit
 */
function formatCurrencyAmount(amount: number | undefined, currency: string): string {
  if (amount === undefined || amount === null) return '';
  return formatCurrency(amount, currency);
}

/**
 * Notify creator that a proposal has been sent to them
 */
export async function notifyProposalSent(params: {
  agencyId: string;
  creatorEmail: string;
  creatorName: string;
  campaignName: string;
  campaignCreatorId: string;
  rateAmount?: number;
  rateCurrency?: string;
}): Promise<void> {
  const {
    agencyId,
    creatorEmail,
    creatorName,
    campaignName,
    campaignCreatorId,
    rateAmount,
    rateCurrency = 'INR',
  } = params;

  // Ensure subscriber exists in Novu with tenant association
  await ensureSubscriber({
    subscriberId: creatorEmail,
    email: creatorEmail,
    firstName: creatorName,
    tenantId: agencyId,
  });

  // Format rate for display
  const formattedRate = formatCurrencyAmount(rateAmount, rateCurrency);
  const baseUrl = getBaseUrl();

  await triggerNotification({
    workflowId: 'proposal-sent',
    subscriberId: creatorEmail,
    email: creatorEmail,
    agencyId,
    data: {
      creatorName,
      campaignName,
      rateAmount: formattedRate, // Formatted string like "₹500" or "$500"
      rateCurrency,
      actionUrl: `${baseUrl}/creator/proposals/${campaignCreatorId}`,
    },
  });
}

/**
 * Notify agency team that a creator has accepted a proposal
 */
export async function notifyProposalAccepted(params: {
  agencyId: string;
  campaignId: string;
  campaignName: string;
  creatorName: string;
  campaignCreatorId: string;
}): Promise<void> {
  const { agencyId, campaignId, campaignName, creatorName, campaignCreatorId } = params;

  // Get agency team members to notify (agency admins and account managers)
  const { data: agencyUsers } = await supabaseAdmin
    .from('agency_users')
    .select('user_id, users!inner(id, email, full_name)')
    .eq('agency_id', agencyId)
    .eq('is_active', true)
    .in('role', ['agency_admin', 'account_manager']);

  if (!agencyUsers || agencyUsers.length === 0) {
    console.warn('[Novu] No agency users to notify for proposal acceptance');
    return;
  }

  // Notify each user
  for (const agencyUser of agencyUsers) {
    const user = agencyUser.users as { id: string; email: string; full_name: string };
    if (!user?.email) continue;

    try {
      await ensureSubscriber({
        subscriberId: user.id,
        email: user.email,
        firstName: user.full_name,
        tenantId: agencyId,
      });

      const baseUrl = getBaseUrl();

      await triggerNotification({
        workflowId: 'proposal-accepted',
        subscriberId: user.id,
        email: user.email,
        agencyId,
        data: {
          creatorName,
          campaignName,
          baseUrl,
          actionUrl: `/dashboard/campaigns/${campaignId}`,
        },
      });
    } catch (err) {
      console.error('[Novu] Failed to notify user of proposal acceptance:', user.id, err);
    }
  }
}

/**
 * Notify agency team that a creator has countered a proposal
 */
export async function notifyProposalCountered(params: {
  agencyId: string;
  campaignId: string;
  campaignName: string;
  creatorName: string;
  campaignCreatorId: string;
  rateAmount?: number;
  rateCurrency?: string;
}): Promise<void> {
  const {
    agencyId,
    campaignId,
    campaignName,
    creatorName,
    campaignCreatorId,
    rateAmount,
    rateCurrency,
  } = params;

  // Get agency team members to notify
  const { data: agencyUsers } = await supabaseAdmin
    .from('agency_users')
    .select('user_id, users!inner(id, email, full_name)')
    .eq('agency_id', agencyId)
    .eq('is_active', true)
    .in('role', ['agency_admin', 'account_manager']);

  if (!agencyUsers || agencyUsers.length === 0) {
    console.warn('[Novu] No agency users to notify for proposal counter');
    return;
  }

  for (const agencyUser of agencyUsers) {
    const user = agencyUser.users as { id: string; email: string; full_name: string };
    if (!user?.email) continue;

    try {
      await ensureSubscriber({
        subscriberId: user.id,
        email: user.email,
        firstName: user.full_name,
        tenantId: agencyId,
      });

      const baseUrl = getBaseUrl();

      await triggerNotification({
        workflowId: 'proposal-countered',
        subscriberId: user.id,
        email: user.email,
        agencyId,
        data: {
          creatorName,
          campaignName,
          rateAmount,
          rateCurrency,
          baseUrl,
          actionUrl: `/dashboard/campaigns/${campaignId}`,
        },
      });
    } catch (err) {
      console.error('[Novu] Failed to notify user of proposal counter:', user.id, err);
    }
  }
}

/**
 * Notify agency team that a creator has rejected a proposal
 */
export async function notifyProposalRejected(params: {
  agencyId: string;
  campaignId: string;
  campaignName: string;
  creatorName: string;
  campaignCreatorId: string;
  reason?: string;
}): Promise<void> {
  const { agencyId, campaignId, campaignName, creatorName, campaignCreatorId, reason } = params;

  // Get agency team members to notify
  const { data: agencyUsers } = await supabaseAdmin
    .from('agency_users')
    .select('user_id, users!inner(id, email, full_name)')
    .eq('agency_id', agencyId)
    .eq('is_active', true)
    .in('role', ['agency_admin', 'account_manager']);

  if (!agencyUsers || agencyUsers.length === 0) {
    console.warn('[Novu] No agency users to notify for proposal rejection');
    return;
  }

  for (const agencyUser of agencyUsers) {
    const user = agencyUser.users as { id: string; email: string; full_name: string };
    if (!user?.email) continue;

    try {
      await ensureSubscriber({
        subscriberId: user.id,
        email: user.email,
        firstName: user.full_name,
        tenantId: agencyId,
      });

      const baseUrl = getBaseUrl();

      await triggerNotification({
        workflowId: 'proposal-rejected',
        subscriberId: user.id,
        email: user.email,
        agencyId,
        data: {
          creatorName,
          campaignName,
          reason: reason ?? 'No reason provided',
          baseUrl,
          actionUrl: `/dashboard/campaigns/${campaignId}`,
        },
      });
    } catch (err) {
      console.error('[Novu] Failed to notify user of proposal rejection:', user.id, err);
    }
  }
}

/**
 * Notify creator that a deliverable has been assigned to them
 */
export async function notifyDeliverableAssigned(params: {
  agencyId: string;
  creatorEmail: string;
  creatorName: string;
  deliverableId: string;
  deliverableTitle: string;
  campaignName: string;
  dueDate?: string;
}): Promise<void> {
  const {
    agencyId,
    creatorEmail,
    creatorName,
    deliverableId,
    deliverableTitle,
    campaignName,
    dueDate,
  } = params;

  await ensureSubscriber({
    subscriberId: creatorEmail,
    email: creatorEmail,
    firstName: creatorName,
    tenantId: agencyId,
  });

  const baseUrl = getBaseUrl();

  await triggerNotification({
    workflowId: 'deliverable-assigned',
    subscriberId: creatorEmail,
    email: creatorEmail,
    agencyId,
    data: {
      creatorName,
      deliverableTitle,
      campaignName,
      dueDate,
      baseUrl,
      actionUrl: `/creator/deliverables/${deliverableId}`,
    },
  });
}

/**
 * Notify creator that their deliverable has been approved
 */
export async function notifyCreatorDeliverableApproved(params: {
  agencyId: string;
  creatorEmail: string;
  creatorName: string;
  deliverableId: string;
  deliverableTitle: string;
  approverName: string;
  comment?: string;
}): Promise<void> {
  const {
    agencyId,
    creatorEmail,
    creatorName,
    deliverableId,
    deliverableTitle,
    approverName,
    comment,
  } = params;

  await ensureSubscriber({
    subscriberId: creatorEmail,
    email: creatorEmail,
    firstName: creatorName,
    tenantId: agencyId,
  });

  const baseUrl = getBaseUrl();

  await triggerNotification({
    workflowId: 'deliverable-approved-creator',
    subscriberId: creatorEmail,
    email: creatorEmail,
    agencyId,
    data: {
      creatorName,
      deliverableTitle,
      approverName,
      comment: comment ?? '',
      baseUrl,
      actionUrl: `/creator/deliverables/${deliverableId}`,
    },
  });
}

/**
 * Notify creator that their deliverable has been rejected
 */
export async function notifyCreatorDeliverableRejected(params: {
  agencyId: string;
  creatorEmail: string;
  creatorName: string;
  deliverableId: string;
  deliverableTitle: string;
  approverName: string;
  comment: string;
}): Promise<void> {
  const {
    agencyId,
    creatorEmail,
    creatorName,
    deliverableId,
    deliverableTitle,
    approverName,
    comment,
  } = params;

  await ensureSubscriber({
    subscriberId: creatorEmail,
    email: creatorEmail,
    firstName: creatorName,
    tenantId: agencyId,
  });

  const baseUrl = getBaseUrl();

  await triggerNotification({
    workflowId: 'deliverable-rejected-creator',
    subscriberId: creatorEmail,
    email: creatorEmail,
    agencyId,
    data: {
      creatorName,
      deliverableTitle,
      approverName,
      comment,
      baseUrl,
      actionUrl: `/creator/deliverables/${deliverableId}`,
    },
  });
}

/**
 * Notify when a new comment is added to a deliverable
 * - If agency comments: notify the creator
 * - If creator comments: notify agency team (admins, account managers, operators)
 */
export async function notifyDeliverableComment(params: {
  agencyId: string;
  deliverableId: string;
  deliverableTitle: string;
  campaignId: string;
  campaignName: string;
  commentByType: 'agency' | 'creator';
  commentByName: string;
  message: string;
  creatorInfo: { id: string; email: string | null; display_name: string; user_id: string | null } | null;
}): Promise<void> {
  const {
    agencyId,
    deliverableId,
    deliverableTitle,
    campaignId,
    campaignName,
    commentByType,
    commentByName,
    message,
    creatorInfo,
  } = params;

  const baseUrl = getBaseUrl();

  if (commentByType === 'agency' && creatorInfo?.email) {
    // Agency commented - notify the creator
    await ensureSubscriber({
      subscriberId: creatorInfo.email,
      email: creatorInfo.email,
      firstName: creatorInfo.display_name,
      tenantId: agencyId,
    });

    await triggerNotification({
      workflowId: 'deliverable-comment',
      subscriberId: creatorInfo.email,
      email: creatorInfo.email,
      agencyId,
      data: {
        recipientName: creatorInfo.display_name,
        deliverableTitle,
        campaignName,
        commentByName,
        message,
        actionUrl: `${baseUrl}/creator/deliverables/${deliverableId}`,
      },
    });
  } else if (commentByType === 'creator') {
    // Creator commented - notify agency team (admins, account managers, operators)
    const { data: agencyUsers } = await supabaseAdmin
      .from('agency_users')
      .select('user_id, users!inner(id, email, full_name)')
      .eq('agency_id', agencyId)
      .eq('is_active', true)
      .in('role', ['agency_admin', 'account_manager', 'operator']);

    if (!agencyUsers || agencyUsers.length === 0) {
      console.warn('[Novu] No agency users to notify for deliverable comment');
      return;
    }

    for (const agencyUser of agencyUsers) {
      const user = agencyUser.users as { id: string; email: string; full_name: string };
      if (!user?.email) continue;

      try {
        await ensureSubscriber({
          subscriberId: user.id,
          email: user.email,
          firstName: user.full_name,
          tenantId: agencyId,
        });

        await triggerNotification({
          workflowId: 'deliverable-comment',
          subscriberId: user.id,
          email: user.email,
          agencyId,
          data: {
            recipientName: user.full_name,
            deliverableTitle,
            campaignName,
            commentByName: creatorInfo?.display_name || 'Creator',
            message,
            actionUrl: `${baseUrl}/dashboard/deliverables/${deliverableId}`,
          },
        });
      } catch (err) {
        console.error('[Novu] Failed to notify user of deliverable comment:', user.id, err);
      }
    }
  }
}

/**
 * Notify agency team when a creator uploads a new version
 */
export async function notifyVersionUploaded(params: {
  agencyId: string;
  deliverableId: string;
  deliverableTitle: string;
  campaignId: string;
  campaignName: string;
  versionNumber: number;
  creatorName: string;
}): Promise<void> {
  const {
    agencyId,
    deliverableId,
    deliverableTitle,
    campaignId,
    campaignName,
    versionNumber,
    creatorName,
  } = params;

  const baseUrl = getBaseUrl();

  // Get agency team members to notify (admins, account managers, operators)
  const { data: agencyUsers } = await supabaseAdmin
    .from('agency_users')
    .select('user_id, users!inner(id, email, full_name)')
    .eq('agency_id', agencyId)
    .eq('is_active', true)
    .in('role', ['agency_admin', 'account_manager', 'operator']);

  if (!agencyUsers || agencyUsers.length === 0) {
    console.warn('[Novu] No agency users to notify for version upload');
    return;
  }

  for (const agencyUser of agencyUsers) {
    const user = agencyUser.users as { id: string; email: string; full_name: string };
    if (!user?.email) continue;

    try {
      await ensureSubscriber({
        subscriberId: user.id,
        email: user.email,
        firstName: user.full_name,
        tenantId: agencyId,
      });

      await triggerNotification({
        workflowId: 'version-uploaded',
        subscriberId: user.id,
        email: user.email,
        agencyId,
        data: {
          recipientName: user.full_name,
          deliverableTitle,
          campaignName,
          creatorName,
          versionNumber,
          baseUrl,
          actionUrl: `/dashboard/deliverables/${deliverableId}`,
        },
      });
    } catch (err) {
      console.error('[Novu] Failed to notify user of version upload:', user.id, err);
    }
  }
}

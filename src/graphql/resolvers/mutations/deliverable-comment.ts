/**
 * Deliverable Comment Mutation Resolvers
 */

import { GraphQLContext } from '../../context';
import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  requireAuth,
  requireCampaignAccess,
  requireCreatorDeliverableAccess,
  Permission,
} from '@/lib/rbac';
import { validationError, notFoundError } from '../../errors';
import { logActivity } from '@/lib/audit';
import { notifyDeliverableComment } from '@/lib/novu/workflows/creator';

/**
 * Add a comment to the deliverable timeline
 * Both agency and creator can add comments
 */
export async function addDeliverableComment(
  _: unknown,
  { deliverableId, message }: { deliverableId: string; message: string },
  ctx: GraphQLContext
) {
  let createdByType: 'agency' | 'creator';
  let createdBy: string;
  let agencyId: string;

  // Get deliverable with campaign info and creator info
  const { data: deliverable, error: fetchError } = await supabaseAdmin
    .from('deliverables')
    .select(`
      *,
      campaigns!inner(id, name, project_id, projects!inner(client_id, clients!inner(agency_id))),
      creators(id, email, display_name, user_id)
    `)
    .eq('id', deliverableId)
    .single();

  if (fetchError || !deliverable) {
    throw notFoundError('Deliverable', deliverableId);
  }

  const campaigns = deliverable.campaigns as {
    id: string;
    name: string;
    project_id: string;
    projects: { client_id: string; clients: { agency_id: string } };
  };
  agencyId = campaigns.projects.clients.agency_id;

  if (ctx.creator) {
    // Creator adding a comment - must own the deliverable
    await requireCreatorDeliverableAccess(ctx, deliverableId);
    createdByType = 'creator';
    createdBy = ctx.user?.id || ctx.creator.id;
  } else {
    // Agency user adding a comment
    requireAuth(ctx);
    await requireCampaignAccess(ctx, campaigns.id, Permission.UPLOAD_VERSION);
    createdByType = 'agency';
    createdBy = ctx.user!.id;
  }

  // Validate message
  const trimmedMessage = message.trim();
  if (!trimmedMessage) {
    throw validationError('Message cannot be empty');
  }

  // Insert the comment
  const { data: comment, error: insertError } = await supabaseAdmin
    .from('deliverable_comments')
    .insert({
      deliverable_id: deliverableId,
      message: trimmedMessage,
      created_by: createdBy,
      created_by_type: createdByType,
    })
    .select()
    .single();

  if (insertError || !comment) {
    console.error('[Deliverable] Failed to add comment:', insertError);
    throw new Error('Failed to add comment');
  }

  // Log activity
  await logActivity({
    agencyId,
    entityType: 'deliverable_comment',
    entityId: comment.id,
    action: 'comment_added',
    actorId: createdBy,
    actorType: 'user',
    afterState: comment as unknown as Record<string, unknown>,
    metadata: { deliverableId },
  });

  // Send notifications
  try {
    // Get commenter's name
    const { data: commenterUser } = await supabaseAdmin
      .from('users')
      .select('full_name')
      .eq('id', createdBy)
      .single();

    await notifyDeliverableComment({
      agencyId,
      deliverableId,
      deliverableTitle: deliverable.title,
      campaignId: campaigns.id,
      campaignName: campaigns.name,
      commentByType: createdByType,
      commentByName: commenterUser?.full_name || 'Someone',
      message: trimmedMessage,
      creatorInfo: deliverable.creators as { id: string; email: string | null; display_name: string; user_id: string | null } | null,
    });
  } catch (err) {
    console.error('[Deliverable] Failed to send comment notification:', err);
    // Don't fail the mutation; comment was already added
  }

  return comment;
}

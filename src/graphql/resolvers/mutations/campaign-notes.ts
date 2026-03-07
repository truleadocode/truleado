/**
 * Campaign Notes Mutation Resolvers
 */

import { GraphQLContext } from '../../context';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAuth, requireCampaignAccess, getAgencyIdForCampaign } from '@/lib/rbac';
import { validationError, notFoundError } from '../../errors';

/**
 * Create a campaign note
 */
export async function createCampaignNote(
  _: unknown,
  { campaignId, message, noteType }: { campaignId: string; message: string; noteType?: string },
  ctx: GraphQLContext
) {
  const user = requireAuth(ctx);
  await requireCampaignAccess(ctx, campaignId);

  const agencyId = await getAgencyIdForCampaign(campaignId);
  if (!agencyId) throw notFoundError('Campaign', campaignId);

  if (!message?.trim()) throw validationError('Message is required', 'message');

  const { data: note, error } = await supabaseAdmin
    .from('campaign_notes')
    .insert({
      campaign_id: campaignId,
      agency_id: agencyId,
      message: message.trim(),
      note_type: noteType || 'general',
      created_by: user.id,
    })
    .select()
    .single();

  if (error || !note) throw new Error('Failed to create campaign note');
  return note;
}

/**
 * Update a campaign note (message, noteType, and/or pin status)
 */
export async function updateCampaignNote(
  _: unknown,
  { id, message, noteType, isPinned }: { id: string; message?: string | null; noteType?: string | null; isPinned?: boolean | null },
  ctx: GraphQLContext
) {
  requireAuth(ctx);

  const { data: existing } = await supabaseAdmin
    .from('campaign_notes')
    .select('campaign_id')
    .eq('id', id)
    .single();
  if (!existing) throw notFoundError('CampaignNote', id);
  await requireCampaignAccess(ctx, existing.campaign_id);

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (message !== undefined && message !== null) updates.message = message.trim();
  if (noteType !== undefined && noteType !== null) updates.note_type = noteType;
  if (isPinned !== undefined && isPinned !== null) updates.is_pinned = isPinned;

  const { data: note, error } = await supabaseAdmin
    .from('campaign_notes')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error || !note) throw new Error('Failed to update campaign note');
  return note;
}

/**
 * Delete a campaign note
 */
export async function deleteCampaignNote(
  _: unknown,
  { id }: { id: string },
  ctx: GraphQLContext
) {
  requireAuth(ctx);

  const { data: existing } = await supabaseAdmin
    .from('campaign_notes')
    .select('campaign_id')
    .eq('id', id)
    .single();
  if (!existing) throw notFoundError('CampaignNote', id);
  await requireCampaignAccess(ctx, existing.campaign_id);

  const { error } = await supabaseAdmin
    .from('campaign_notes')
    .delete()
    .eq('id', id);

  if (error) throw new Error('Failed to delete campaign note');
  return true;
}

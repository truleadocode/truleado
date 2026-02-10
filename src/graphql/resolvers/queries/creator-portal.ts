/**
 * Creator Portal Query Resolvers
 *
 * Queries for the creator portal, scoped to the authenticated creator.
 */

import { GraphQLContext } from '../../context';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireCreator } from '@/lib/rbac';
import { forbiddenError } from '../../errors';

/**
 * Get the authenticated creator's profile
 */
export async function myCreatorProfile(
  _: unknown,
  __: unknown,
  ctx: GraphQLContext
) {
  const creator = requireCreator(ctx);

  const { data, error } = await supabaseAdmin
    .from('creators')
    .select('*')
    .eq('id', creator.id)
    .single();

  if (error || !data) {
    throw new Error('Failed to load creator profile');
  }

  return data;
}

/**
 * Get the creator's campaign assignments (invited or accepted)
 */
export async function myCreatorCampaigns(
  _: unknown,
  __: unknown,
  ctx: GraphQLContext
) {
  const creator = requireCreator(ctx);

  const { data, error } = await supabaseAdmin
    .from('campaign_creators')
    .select('*')
    .eq('creator_id', creator.id)
    .in('status', ['invited', 'accepted'])
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error('Failed to load campaigns');
  }

  return data || [];
}

/**
 * Get the creator's assigned deliverables
 * Optionally filtered by campaign ID
 */
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

  if (campaignId) {
    query = query.eq('campaign_id', campaignId);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    throw new Error('Failed to load deliverables');
  }

  return data || [];
}

/**
 * Get proposal details for a specific campaign assignment
 * Returns the latest proposal version
 */
export async function myCreatorProposal(
  _: unknown,
  { campaignCreatorId }: { campaignCreatorId: string },
  ctx: GraphQLContext
) {
  const creator = requireCreator(ctx);

  // Verify creator owns this campaign_creator record
  const { data: campaignCreator, error: ccError } = await supabaseAdmin
    .from('campaign_creators')
    .select('creator_id')
    .eq('id', campaignCreatorId)
    .single();

  if (ccError || !campaignCreator) {
    return null;
  }

  if (campaignCreator.creator_id !== creator.id) {
    throw forbiddenError('You do not have access to this proposal');
  }

  // Get the latest proposal version
  const { data, error } = await supabaseAdmin
    .from('proposal_versions')
    .select('*')
    .eq('campaign_creator_id', campaignCreatorId)
    .order('version_number', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error('Failed to load proposal');
  }

  return data ?? null;
}

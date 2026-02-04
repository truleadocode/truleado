/**
 * Deliverable Tracking Mutation Resolver
 *
 * Starts tracking for an approved deliverable by storing immutable URLs.
 */

import { GraphQLContext } from '../../context';
import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  requireAuth,
  requireCampaignAccess,
  getAgencyIdForCampaign,
  Permission,
} from '@/lib/rbac';
import { invalidStateError, notFoundError, validationError } from '../../errors';
import { logActivity } from '@/lib/audit';

const MAX_TRACKING_URLS = 10;

function validateTrackingUrl(url: string): string | null {
  if (!url.trim()) return 'URL is required';
  try {
    const urlObj = new URL(url);
    if (!urlObj.protocol.startsWith('http')) {
      return 'URL must start with http:// or https://';
    }
    return null;
  } catch {
    return 'Invalid URL format';
  }
}

export async function startDeliverableTracking(
  _: unknown,
  { deliverableId, urls }: { deliverableId: string; urls: string[] },
  ctx: GraphQLContext
) {
  const user = requireAuth(ctx);

  if (!Array.isArray(urls) || urls.length === 0) {
    throw validationError('At least one URL is required', 'urls');
  }

  if (urls.length > MAX_TRACKING_URLS) {
    throw validationError(`You can add up to ${MAX_TRACKING_URLS} URLs`, 'urls');
  }

  const normalizedUrls = urls.map((url) => (url ?? '').trim());
  for (let i = 0; i < normalizedUrls.length; i += 1) {
    const error = validateTrackingUrl(normalizedUrls[i]);
    if (error) {
      throw validationError(error, 'urls', { index: i });
    }
  }

  const { data: deliverable, error } = await supabaseAdmin
    .from('deliverables')
    .select(`
      id,
      title,
      status,
      campaign_id,
      campaigns!inner(
        id,
        project_id,
        projects!inner(
          id,
          client_id
        )
      )
    `)
    .eq('id', deliverableId)
    .single();

  if (error || !deliverable) {
    throw notFoundError('Deliverable', deliverableId);
  }

  await requireCampaignAccess(ctx, deliverable.campaign_id, Permission.VIEW_DELIVERABLE);

  if (deliverable.status !== 'approved') {
    throw invalidStateError(
      'Deliverable must be approved before tracking can start',
      deliverable.status,
      'tracking_started'
    );
  }

  const { data: existing } = await supabaseAdmin
    .from('deliverable_tracking_records')
    .select('id')
    .eq('deliverable_id', deliverableId)
    .maybeSingle();

  if (existing) {
    throw invalidStateError('Tracking already started for this deliverable', 'tracking_started');
  }

  const campaign = deliverable.campaigns as {
    id: string;
    project_id: string;
    projects: { id: string; client_id: string };
  };
  const projectId = campaign.project_id;
  const clientId = campaign.projects?.client_id;

  if (!clientId) {
    throw new Error('Failed to resolve client for deliverable tracking');
  }

  const { data: trackingRecord, error: insertError } = await supabaseAdmin
    .from('deliverable_tracking_records')
    .insert({
      deliverable_id: deliverableId,
      campaign_id: deliverable.campaign_id,
      project_id: projectId,
      client_id: clientId,
      deliverable_name: deliverable.title,
      started_by: user.id,
    })
    .select()
    .single();

  if (insertError || !trackingRecord) {
    if (insertError?.code === '23505') {
      throw invalidStateError('Tracking already started for this deliverable', 'tracking_started');
    }
    throw new Error('Failed to start deliverable tracking');
  }

  const urlRows = normalizedUrls.map((url, index) => ({
    tracking_record_id: trackingRecord.id,
    url,
    display_order: index + 1,
  }));

  const { error: urlError } = await supabaseAdmin
    .from('deliverable_tracking_urls')
    .insert(urlRows);

  if (urlError) {
    await supabaseAdmin.from('deliverable_tracking_records').delete().eq('id', trackingRecord.id);
    throw new Error('Failed to save tracking URLs');
  }

  const agencyId = await getAgencyIdForCampaign(deliverable.campaign_id);
  if (agencyId) {
    await logActivity({
      agencyId,
      entityType: 'deliverable_tracking_record',
      entityId: trackingRecord.id,
      action: 'tracking_started',
      actorId: user.id,
      actorType: 'user',
      afterState: trackingRecord,
      metadata: {
        deliverableId,
        urlCount: normalizedUrls.length,
      },
    });
  }

  return trackingRecord;
}

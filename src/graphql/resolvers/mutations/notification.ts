/**
 * Notification Mutation Resolvers
 */

import { GraphQLContext } from '../../context';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAuth, requireAgencyMembership } from '@/lib/rbac';
import { notFoundError, forbiddenError } from '../../errors';

/**
 * Mark a notification as read
 */
export async function markNotificationRead(
  _: unknown,
  { notificationId }: { notificationId: string },
  ctx: GraphQLContext
) {
  const user = requireAuth(ctx);
  
  // Get the notification
  const { data: notification, error: fetchError } = await supabaseAdmin
    .from('notifications')
    .select('*')
    .eq('id', notificationId)
    .single();
  
  if (fetchError || !notification) {
    throw notFoundError('Notification', notificationId);
  }
  
  // Users can only mark their own notifications as read
  if (notification.user_id !== user.id) {
    throw forbiddenError('You can only mark your own notifications as read');
  }
  
  if (notification.is_read) {
    return notification; // Already read, no-op
  }
  
  const { data: updated, error } = await supabaseAdmin
    .from('notifications')
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq('id', notificationId)
    .select()
    .single();
  
  if (error || !updated) {
    throw new Error('Failed to mark notification as read');
  }
  
  return updated;
}

/**
 * Mark all notifications as read for an agency
 */
export async function markAllNotificationsRead(
  _: unknown,
  { agencyId }: { agencyId: string },
  ctx: GraphQLContext
) {
  const user = requireAgencyMembership(ctx, agencyId);
  
  const { error } = await supabaseAdmin
    .from('notifications')
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq('user_id', user.id)
    .eq('agency_id', agencyId)
    .eq('is_read', false);
  
  if (error) {
    throw new Error('Failed to mark notifications as read');
  }
  
  return true;
}

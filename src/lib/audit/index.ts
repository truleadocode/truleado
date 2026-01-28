/**
 * Audit Logging Service
 * 
 * All actions log:
 * - actor
 * - action
 * - entity
 * - before/after state
 * - timestamp
 * 
 * Audit logs are IMMUTABLE - no updates or deletes allowed.
 */

import { supabaseAdmin } from '@/lib/supabase/admin';

export interface ActivityLogEntry {
  agencyId: string;
  entityType: string;
  entityId: string;
  action: string;
  actorId?: string;
  actorType: 'user' | 'system';
  beforeState?: Record<string, unknown>;
  afterState?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Log an activity to the audit trail
 * 
 * This function is fire-and-forget - it won't block the request.
 * Errors are logged but not thrown.
 */
export async function logActivity(entry: ActivityLogEntry): Promise<void> {
  try {
    await supabaseAdmin.from('activity_logs').insert({
      agency_id: entry.agencyId,
      entity_type: entry.entityType,
      entity_id: entry.entityId,
      action: entry.action,
      actor_id: entry.actorId,
      actor_type: entry.actorType,
      before_state: entry.beforeState || null,
      after_state: entry.afterState || null,
      metadata: entry.metadata || null,
      ip_address: entry.ipAddress || null,
      user_agent: entry.userAgent || null,
    });
  } catch (error) {
    // Log error but don't throw - audit logging should not fail the request
    console.error('Failed to write audit log:', error);
  }
}

/**
 * Log a system-generated activity (no user actor)
 */
export async function logSystemActivity(
  agencyId: string,
  entityType: string,
  entityId: string,
  action: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await logActivity({
    agencyId,
    entityType,
    entityId,
    action,
    actorType: 'system',
    metadata,
  });
}

/**
 * Get activity logs for an entity
 */
export async function getActivityLogs(
  entityType: string,
  entityId: string,
  limit = 50
) {
  const { data, error } = await supabaseAdmin
    .from('activity_logs')
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (error) {
    console.error('Failed to fetch activity logs:', error);
    return [];
  }
  
  return data || [];
}

/**
 * Get activity logs for an agency
 */
export async function getAgencyActivityLogs(agencyId: string, limit = 100) {
  const { data, error } = await supabaseAdmin
    .from('activity_logs')
    .select('*')
    .eq('agency_id', agencyId)
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (error) {
    console.error('Failed to fetch agency activity logs:', error);
    return [];
  }
  
  return data || [];
}

/**
 * Team Invitation Mutation Resolvers
 */

import { GraphQLContext } from '../../context';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAuth, requireAgencyRole, AgencyRole } from '@/lib/rbac';
import { validationError } from '../../errors';
import { logActivity } from '@/lib/audit';
import { triggerNotification } from '@/lib/novu/trigger';
import { ensureSubscriber } from '@/lib/novu/subscriber';

function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://127.0.0.1:3000';
}

/**
 * Invite team members by email (batch).
 * Agency Admin or Account Manager only.
 */
export async function inviteTeamMembers(
  _: unknown,
  { agencyId, invites }: { agencyId: string; invites: Array<{ email: string; role: string }> },
  ctx: GraphQLContext
) {
  const user = requireAgencyRole(ctx, agencyId, [AgencyRole.AGENCY_ADMIN, AgencyRole.ACCOUNT_MANAGER]);

  if (!invites.length || invites.length > 20) {
    throw validationError('Provide between 1 and 20 invitations');
  }

  const validRoles = ['agency_admin', 'account_manager', 'operator', 'internal_approver'];
  const results = [];

  // Get agency name for email
  const { data: agency } = await supabaseAdmin
    .from('agencies')
    .select('name')
    .eq('id', agencyId)
    .single();

  const agencyName = agency?.name || 'Your Agency';

  for (const invite of invites) {
    const email = invite.email.trim().toLowerCase();
    const role = invite.role.toLowerCase();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      continue; // Skip invalid emails
    }

    if (!validRoles.includes(role)) {
      continue; // Skip invalid roles
    }

    // Check if user already in agency
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existingUser) {
      const { data: existingMembership } = await supabaseAdmin
        .from('agency_users')
        .select('id')
        .eq('agency_id', agencyId)
        .eq('user_id', existingUser.id)
        .maybeSingle();

      if (existingMembership) {
        continue; // Already a member, skip
      }
    }

    // Check for existing pending invitation (partial unique index can't be used with upsert)
    const { data: existingInvite } = await supabaseAdmin
      .from('agency_invitations')
      .select('id')
      .eq('agency_id', agencyId)
      .eq('email', email)
      .eq('status', 'pending')
      .maybeSingle();

    if (existingInvite) {
      // Update existing pending invite (refresh expiry, update role)
      const { data: invitation, error } = await supabaseAdmin
        .from('agency_invitations')
        .update({
          role,
          invited_by: user.id,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .eq('id', existingInvite.id)
        .select('*')
        .single();

      if (error || !invitation) {
        console.warn('[Invitation] Failed to update for', email, error?.message);
        continue;
      }
      results.push(invitation);
    } else {
      const { data: invitation, error } = await supabaseAdmin
        .from('agency_invitations')
        .insert({
          agency_id: agencyId,
          email,
          role,
          invited_by: user.id,
          status: 'pending',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .select('*')
        .single();

      if (error || !invitation) {
        console.warn('[Invitation] Failed to create for', email, error?.message);
        continue;
      }
      results.push(invitation);
    }

    const invitation = results[results.length - 1];

    // Send invitation email via Novu (fire-and-forget)
    const signupUrl = `${getBaseUrl()}/signup?invite=${invitation.token}`;
    try {
      const subscriberId = `invite-${invitation.id}`;
      await ensureSubscriber({ subscriberId, email, firstName: email });
      await triggerNotification({
        workflowId: 'team-invite',
        subscriberId,
        email,
        agencyId,
        data: {
          agencyName,
          inviterName: ctx.user?.fullName || ctx.user?.email || 'A team member',
          role: role.replace(/_/g, ' '),
          signupUrl,
        },
      });
    } catch (err) {
      console.warn('[Invitation] Email send failed for', email, err);
      // Don't fail the invitation creation if email fails
    }
  }

  await logActivity({
    agencyId,
    entityType: 'agency',
    entityId: agencyId,
    action: 'invited_team_members',
    actorId: user.id,
    actorType: 'user',
    metadata: {
      invitedEmails: results.map((r: { email: string }) => r.email),
      count: results.length,
    },
  });

  return results;
}

/**
 * Revoke a pending invitation. Agency Admin only.
 */
export async function revokeInvitation(
  _: unknown,
  { id }: { id: string },
  ctx: GraphQLContext
) {
  // Get the invitation to find the agency
  const { data: invitation } = await supabaseAdmin
    .from('agency_invitations')
    .select('agency_id, email, status')
    .eq('id', id)
    .single();

  if (!invitation) {
    throw validationError('Invitation not found');
  }

  requireAgencyRole(ctx, invitation.agency_id, [AgencyRole.AGENCY_ADMIN]);

  if (invitation.status !== 'pending') {
    throw validationError('Can only revoke pending invitations');
  }

  const { error } = await supabaseAdmin
    .from('agency_invitations')
    .update({ status: 'revoked' })
    .eq('id', id);

  if (error) {
    throw new Error('Failed to revoke invitation');
  }

  return true;
}

/**
 * Accept an invitation by token. Authenticated users only.
 * Adds the user to the agency with the specified role.
 */
export async function acceptInvitation(
  _: unknown,
  { token }: { token: string },
  ctx: GraphQLContext
) {
  const user = requireAuth(ctx);

  const { data: invitation } = await supabaseAdmin
    .from('agency_invitations')
    .select('*')
    .eq('token', token)
    .eq('status', 'pending')
    .single();

  if (!invitation) {
    throw validationError('Invalid or expired invitation');
  }

  // Check if expired
  if (new Date(invitation.expires_at) < new Date()) {
    await supabaseAdmin
      .from('agency_invitations')
      .update({ status: 'expired' })
      .eq('id', invitation.id);
    throw validationError('This invitation has expired');
  }

  // Check if already a member
  const { data: existingMembership } = await supabaseAdmin
    .from('agency_users')
    .select('id')
    .eq('agency_id', invitation.agency_id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existingMembership) {
    // Already a member, just mark invitation as accepted
    await supabaseAdmin
      .from('agency_invitations')
      .update({ status: 'accepted', accepted_at: new Date().toISOString() })
      .eq('id', invitation.id);
  } else {
    // Add user to agency
    const { error: memberError } = await supabaseAdmin
      .from('agency_users')
      .insert({
        agency_id: invitation.agency_id,
        user_id: user.id,
        role: invitation.role,
        is_active: true,
      });

    if (memberError) {
      console.error('[Invitation] Failed to add user to agency:', memberError);
      throw new Error('Failed to join agency');
    }

    // Mark invitation as accepted
    await supabaseAdmin
      .from('agency_invitations')
      .update({ status: 'accepted', accepted_at: new Date().toISOString() })
      .eq('id', invitation.id);

    await logActivity({
      agencyId: invitation.agency_id,
      entityType: 'agency',
      entityId: invitation.agency_id,
      action: 'member_joined_via_invite',
      actorId: user.id,
      actorType: 'user',
      metadata: { email: invitation.email, role: invitation.role },
    });
  }

  // Return the agency
  const { data: agency } = await supabaseAdmin
    .from('agencies')
    .select('*')
    .eq('id', invitation.agency_id)
    .single();

  return agency;
}

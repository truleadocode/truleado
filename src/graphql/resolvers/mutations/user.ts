/**
 * User mutation resolvers
 * createUser: register the current Firebase user in our DB (signup flow).
 */

import { GraphQLContext } from '../../context';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { unauthenticatedError, validationError } from '../../errors';

const PROVIDER = 'firebase_email';

/**
 * Create user in our database and link to Firebase UID.
 * Requires a valid Firebase token (Bearer). If the user already exists (auth_identity
 * for this UID), returns the existing user (idempotent).
 */
export async function createUser(
  _: unknown,
  { input }: { input: { email: string; name?: string | null } },
  ctx: GraphQLContext
) {
  if (!ctx.decodedToken) {
    throw unauthenticatedError('Valid Firebase token required');
  }

  const email = input?.email?.trim();
  if (!email) {
    throw validationError('Email is required', 'email');
  }

  const fullName = (input?.name?.trim() || email.split('@')[0] || 'User').slice(0, 255);
  const firebaseUid = ctx.decodedToken.uid;

  // If user already linked (e.g. already completed signup), return existing user
  const { data: existingIdentity } = await supabaseAdmin
    .from('auth_identities')
    .select('user_id')
    .eq('provider_uid', firebaseUid)
    .eq('provider', PROVIDER)
    .maybeSingle();

  if (existingIdentity?.user_id) {
    const { data: existingUser, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', existingIdentity.user_id)
      .single();
    if (!error && existingUser) {
      return existingUser;
    }
  }

  const { data: newUser, error: userError } = await supabaseAdmin
    .from('users')
    .insert({
      email,
      full_name: fullName,
      is_active: true,
    })
    .select()
    .single();

  if (userError || !newUser) {
    throw new Error('Failed to create user');
  }

  const { error: identityError } = await supabaseAdmin
    .from('auth_identities')
    .insert({
      user_id: newUser.id,
      provider: PROVIDER,
      provider_uid: firebaseUid,
      email,
      email_verified: false,
    });

  if (identityError) {
    await supabaseAdmin.from('users').delete().eq('id', newUser.id);
    throw new Error('Failed to link identity');
  }

  return newUser;
}

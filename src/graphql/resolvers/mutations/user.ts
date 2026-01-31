/**
 * User mutation resolvers
 * createUser: register the current Firebase user in our DB (signup flow).
 * ensureClientUser: client portal magic-link flow — create user, link to contact. Idempotent.
 */

import { GraphQLContext } from '../../context';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { unauthenticatedError, validationError } from '../../errors';

const PROVIDER = 'firebase_email';
const PROVIDER_CLIENT_LINK = 'firebase_email_link';

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

/**
 * Client portal: create user from magic-link auth and link to contact.
 * Requires valid Firebase token (from signInWithEmailLink). Idempotent.
 */
export async function ensureClientUser(
  _: unknown,
  __: unknown,
  ctx: GraphQLContext
) {
  if (!ctx.decodedToken) {
    throw unauthenticatedError('Valid Firebase token required');
  }

  const email = (ctx.decodedToken.email ?? '').trim().toLowerCase();
  if (!email) {
    throw validationError('Email is required for client sign-in');
  }

  const firebaseUid = ctx.decodedToken.uid;

  const { data: existingIdentity } = await supabaseAdmin
    .from('auth_identities')
    .select('user_id')
    .eq('provider', PROVIDER_CLIENT_LINK)
    .eq('provider_uid', firebaseUid)
    .maybeSingle();

  if (existingIdentity?.user_id) {
    const { data: u, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', existingIdentity.user_id)
      .single();
    if (!error && u) return u;
  }

  const { data: rows, error: contactError } = await supabaseAdmin
    .from('contacts')
    .select('id, first_name, last_name, email')
    .eq('is_client_approver', true)
    .ilike('email', email)
    .limit(1);

  const contact = Array.isArray(rows) ? rows[0] : rows;
  if (contactError || !contact) {
    throw validationError('No client account found for this email');
  }

  const fullName = [contact.first_name, contact.last_name]
    .filter(Boolean)
    .join(' ')
    .trim()
    .slice(0, 255) || email.split('@')[0] || 'Client';

  const { data: newUser, error: userError } = await supabaseAdmin
    .from('users')
    .insert({
      email: contact.email ?? email,
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
      provider: PROVIDER_CLIENT_LINK,
      provider_uid: firebaseUid,
      email: contact.email ?? email,
      email_verified: !!ctx.decodedToken.email_verified,
    });

  if (identityError) {
    await supabaseAdmin.from('users').delete().eq('id', newUser.id);
    throw new Error('Failed to link identity');
  }

  const { error: linkError } = await supabaseAdmin
    .from('contacts')
    .update({ user_id: newUser.id, updated_at: new Date().toISOString() })
    .eq('id', contact.id);

  if (linkError) {
    await supabaseAdmin.from('auth_identities').delete().eq('user_id', newUser.id);
    await supabaseAdmin.from('users').delete().eq('id', newUser.id);
    throw new Error('Failed to link contact');
  }

  return newUser;
}

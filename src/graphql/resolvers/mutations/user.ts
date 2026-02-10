/**
 * User mutation resolvers
 * createUser: register the current Firebase user in our DB (signup flow).
 * ensureClientUser: client portal magic-link flow — create user, link to contact. Idempotent.
 * ensureCreatorUser: creator portal magic-link flow — create user, link to creator. Idempotent.
 */

import { GraphQLContext } from '../../context';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { unauthenticatedError, validationError } from '../../errors';

const PROVIDER = 'firebase_email';
const PROVIDER_CLIENT_LINK = 'firebase_email_link';
const PROVIDER_CREATOR_LINK = 'firebase_creator_link';

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

/**
 * Creator portal: create user from magic-link auth and link to creator.
 * Requires valid Firebase token (from signInWithEmailLink). Idempotent.
 *
 * This function handles multiple scenarios:
 * 1. Creator already has user_id linked - return that user
 * 2. Firebase UID already linked via auth_identity - return that user
 * 3. New sign-in - create user, auth_identity, and link to creator
 */
export async function ensureCreatorUser(
  _: unknown,
  __: unknown,
  ctx: GraphQLContext
) {
  if (!ctx.decodedToken) {
    throw unauthenticatedError('Valid Firebase token required');
  }

  const email = (ctx.decodedToken.email ?? '').trim().toLowerCase();
  if (!email) {
    throw validationError('Email is required for creator sign-in');
  }

  const firebaseUid = ctx.decodedToken.uid;

  // Find the creator by email first (we need this for all paths)
  const { data: creators, error: creatorError } = await supabaseAdmin
    .from('creators')
    .select('id, display_name, email, agency_id, user_id')
    .eq('is_active', true)
    .ilike('email', email)
    .limit(1);

  const creator = Array.isArray(creators) ? creators[0] : creators;
  if (creatorError || !creator) {
    throw validationError('No creator account found for this email');
  }

  // Case 1: Creator already has a user linked
  if (creator.user_id) {
    const { data: existingUser, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', creator.user_id)
      .single();

    if (!userError && existingUser) {
      // Make sure there's an auth_identity for this Firebase UID
      const { data: existingIdentity } = await supabaseAdmin
        .from('auth_identities')
        .select('id')
        .eq('provider_uid', firebaseUid)
        .eq('user_id', creator.user_id)
        .maybeSingle();

      if (!existingIdentity) {
        // Link this Firebase UID to the existing user
        await supabaseAdmin.from('auth_identities').insert({
          user_id: creator.user_id,
          provider: PROVIDER_CREATOR_LINK,
          provider_uid: firebaseUid,
          email: creator.email ?? email,
          email_verified: !!ctx.decodedToken.email_verified,
        });
      }

      return existingUser;
    }
  }

  // Case 2: Check if Firebase UID is already linked to ANY user
  const { data: existingIdentity } = await supabaseAdmin
    .from('auth_identities')
    .select('user_id')
    .eq('provider_uid', firebaseUid)
    .maybeSingle();

  if (existingIdentity?.user_id) {
    const { data: existingUser, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', existingIdentity.user_id)
      .single();

    if (!userError && existingUser) {
      // Link the creator to this existing user if not already linked
      if (!creator.user_id) {
        await supabaseAdmin
          .from('creators')
          .update({ user_id: existingUser.id, updated_at: new Date().toISOString() })
          .eq('id', creator.id);
      }
      return existingUser;
    }
  }

  // Case 3: New sign-in - create user and link everything
  const fullName = (creator.display_name ?? email.split('@')[0] ?? 'Creator').slice(0, 255);

  // First, clean up any orphaned auth_identities for this Firebase UID
  await supabaseAdmin
    .from('auth_identities')
    .delete()
    .eq('provider_uid', firebaseUid);

  // Create user record
  const { data: newUser, error: userError } = await supabaseAdmin
    .from('users')
    .insert({
      email: creator.email ?? email,
      full_name: fullName,
      is_active: true,
    })
    .select()
    .single();

  if (userError || !newUser) {
    console.error('Failed to create user:', userError);
    throw new Error('Failed to create user');
  }

  // Create auth identity
  const { error: identityError } = await supabaseAdmin
    .from('auth_identities')
    .insert({
      user_id: newUser.id,
      provider: PROVIDER_CREATOR_LINK,
      provider_uid: firebaseUid,
      email: creator.email ?? email,
      email_verified: !!ctx.decodedToken.email_verified,
    });

  if (identityError) {
    console.error('Failed to create auth_identity:', identityError);
    await supabaseAdmin.from('users').delete().eq('id', newUser.id);
    throw new Error('Failed to link identity: ' + identityError.message);
  }

  // Link the creator to the user
  const { error: linkError } = await supabaseAdmin
    .from('creators')
    .update({ user_id: newUser.id, updated_at: new Date().toISOString() })
    .eq('id', creator.id);

  if (linkError) {
    console.error('Failed to link creator:', linkError);
    await supabaseAdmin.from('auth_identities').delete().eq('user_id', newUser.id);
    await supabaseAdmin.from('users').delete().eq('id', newUser.id);
    throw new Error('Failed to link creator');
  }

  return newUser;
}

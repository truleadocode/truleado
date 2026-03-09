/**
 * Onboarding Dummy Data Mutations
 *
 * seedDummyData  — populates sample clients, contacts, projects, campaigns,
 *                  creators, and deliverables for a new agency.
 * deleteDummyData — removes all entities flagged is_dummy = true.
 */

import { GraphQLContext } from '../../context';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAgencyRole, AgencyRole } from '@/lib/rbac';
import { notFoundError } from '../../errors';
import { logActivity } from '@/lib/audit';

interface IdName { id: string; name: string }

const DUMMY_CLIENT_NAMES = ['Luminara Beauty', 'FreshBite Foods'];
const DUMMY_CREATOR_EMAILS = [
  'aisha@example.com', 'rohan@example.com', 'meera@example.com',
  'karan@example.com', 'divya@example.com', 'amit@example.com',
];

/** Shared cleanup: removes all dummy entities for an agency (idempotent).
 *  Matches by is_dummy=true OR by known dummy names/emails to handle
 *  orphaned rows from partial seeds before migration was applied. */
async function cleanupDummyData(agencyId: string) {
  // Find dummy clients by flag OR by known names
  const { data: byFlag } = await supabaseAdmin
    .from('clients')
    .select('id')
    .eq('agency_id', agencyId)
    .eq('is_dummy', true);

  const { data: byName } = await supabaseAdmin
    .from('clients')
    .select('id')
    .eq('agency_id', agencyId)
    .in('name', DUMMY_CLIENT_NAMES);

  const allClientIds = [
    ...(byFlag || []).map((c: { id: string }) => c.id),
    ...(byName || []).map((c: { id: string }) => c.id),
  ];
  const clientIds = [...new Set(allClientIds)];

  if (clientIds.length > 0) {
    // Find projects under dummy clients
    const { data: dummyProjects } = await supabaseAdmin
      .from('projects')
      .select('id')
      .in('client_id', clientIds);

    const projectIds = (dummyProjects || []).map((p: { id: string }) => p.id);

    if (projectIds.length > 0) {
      const { data: dummyCampaigns } = await supabaseAdmin
        .from('campaigns')
        .select('id')
        .in('project_id', projectIds);

      const campaignIds = (dummyCampaigns || []).map((c: { id: string }) => c.id);

      if (campaignIds.length > 0) {
        await supabaseAdmin.from('deliverables').delete().in('campaign_id', campaignIds);
        await supabaseAdmin.from('campaign_users').delete().in('campaign_id', campaignIds);
        await supabaseAdmin.from('campaign_creators').delete().in('campaign_id', campaignIds);
        await supabaseAdmin.from('campaigns').delete().in('id', campaignIds);
      }

      await supabaseAdmin.from('projects').delete().in('id', projectIds);
    }

    await supabaseAdmin.from('contacts').delete().in('client_id', clientIds);
    await supabaseAdmin.from('clients').delete().in('id', clientIds);
  }

  // Delete dummy creators by flag OR known emails
  await supabaseAdmin.from('creators').delete().eq('agency_id', agencyId).eq('is_dummy', true);
  await supabaseAdmin.from('creators').delete().eq('agency_id', agencyId).in('email', DUMMY_CREATOR_EMAILS);

  // Clear flag
  try {
    await supabaseAdmin.from('agencies').update({ has_dummy_data: false }).eq('id', agencyId);
  } catch {
    // Column may not exist yet
  }
}

export async function seedDummyData(
  _: unknown,
  { agencyId }: { agencyId: string },
  ctx: GraphQLContext
) {
  const user = requireAgencyRole(ctx, agencyId, [AgencyRole.AGENCY_ADMIN]);

  // Verify agency exists
  const { data: agency, error: agencyErr } = await supabaseAdmin
    .from('agencies')
    .select('id')
    .eq('id', agencyId)
    .single();

  if (agencyErr || !agency) throw notFoundError('Agency', agencyId);

  // Clean up any orphaned dummy data from previous failed attempts before seeding
  await cleanupDummyData(agencyId);

  // --- Clients (2) ---
  const { data: clients, error: clientErr } = await supabaseAdmin
    .from('clients')
    .insert([
      {
        agency_id: agencyId,
        name: 'Luminara Beauty',
        account_manager_id: user.id,
        is_active: true,
        is_dummy: true,
        industry: 'Beauty & Cosmetics',
        country: 'India',
        client_status: 'active',
      },
      {
        agency_id: agencyId,
        name: 'FreshBite Foods',
        account_manager_id: user.id,
        is_active: true,
        is_dummy: true,
        industry: 'Food & Beverage',
        country: 'India',
        client_status: 'active',
      },
    ])
    .select('id, name');

  if (clientErr || !clients || clients.length !== 2)
    throw new Error(`Failed to seed clients: ${clientErr?.message || 'unexpected result'}`);

  const luminara = clients.find((c: IdName) => c.name === 'Luminara Beauty')!;
  const freshbite = clients.find((c: IdName) => c.name === 'FreshBite Foods')!;

  // --- Contacts (6) ---
  const { error: contactErr } = await supabaseAdmin.from('contacts').insert([
    { client_id: luminara.id, first_name: 'Priya', last_name: 'Sharma', email: 'priya@luminara.example', job_title: 'Marketing Director', is_dummy: true, is_primary_contact: true, contact_status: 'active' },
    { client_id: luminara.id, first_name: 'Rahul', last_name: 'Menon', email: 'rahul@luminara.example', job_title: 'Brand Manager', is_dummy: true, contact_status: 'active' },
    { client_id: luminara.id, first_name: 'Anita', last_name: 'Desai', email: 'anita@luminara.example', job_title: 'Social Media Lead', is_dummy: true, contact_status: 'active' },
    { client_id: freshbite.id, first_name: 'Vikram', last_name: 'Patel', email: 'vikram@freshbite.example', job_title: 'CMO', is_dummy: true, is_primary_contact: true, contact_status: 'active' },
    { client_id: freshbite.id, first_name: 'Neha', last_name: 'Gupta', email: 'neha@freshbite.example', job_title: 'Marketing Manager', is_dummy: true, contact_status: 'active' },
    { client_id: freshbite.id, first_name: 'Arjun', last_name: 'Reddy', email: 'arjun@freshbite.example', job_title: 'Digital Lead', is_dummy: true, contact_status: 'active' },
  ]);
  if (contactErr) throw new Error(`Failed to seed contacts: ${contactErr.message}`);

  // --- Projects (3) ---
  const { data: projects, error: projErr } = await supabaseAdmin
    .from('projects')
    .insert([
      { client_id: luminara.id, name: 'Luminara Summer Glow Campaign', description: 'Summer skincare product launch campaign', is_archived: false, is_dummy: true },
      { client_id: freshbite.id, name: 'FreshBite Health Series', description: 'Health-focused content series for organic snacks', is_archived: false, is_dummy: true },
      { client_id: freshbite.id, name: 'FreshBite Festival Special', description: 'Festive season promotional campaign', is_archived: false, is_dummy: true },
    ])
    .select('id, name');

  if (projErr || !projects) throw new Error(`Failed to seed projects: ${projErr?.message || 'no data returned'}`);

  const proj1 = projects.find((p: IdName) => p.name === 'Luminara Summer Glow Campaign')!;
  const proj2 = projects.find((p: IdName) => p.name === 'FreshBite Health Series')!;
  const proj3 = projects.find((p: IdName) => p.name === 'FreshBite Festival Special')!;

  // --- Campaigns (5) ---
  const { data: campaigns, error: campErr } = await supabaseAdmin
    .from('campaigns')
    .insert([
      { project_id: proj1.id, name: 'Summer Skincare Reels', campaign_type: 'influencer', status: 'draft', created_by: user.id, is_dummy: true, platforms: ['instagram'] },
      { project_id: proj1.id, name: 'Luminara YouTube Reviews', campaign_type: 'influencer', status: 'draft', created_by: user.id, is_dummy: true, platforms: ['youtube'] },
      { project_id: proj2.id, name: 'Healthy Snack Challenge', campaign_type: 'influencer', status: 'draft', created_by: user.id, is_dummy: true, platforms: ['instagram', 'tiktok'] },
      { project_id: proj2.id, name: 'FreshBite Recipe Creators', campaign_type: 'social', status: 'draft', created_by: user.id, is_dummy: true, platforms: ['youtube'] },
      { project_id: proj3.id, name: 'Diwali Feast Campaign', campaign_type: 'influencer', status: 'draft', created_by: user.id, is_dummy: true, platforms: ['instagram', 'youtube'] },
    ])
    .select('id, name');

  if (campErr || !campaigns) throw new Error(`Failed to seed campaigns: ${campErr?.message || 'no data returned'}`);

  // Assign current user as approver for all campaigns
  const { error: cuErr } = await supabaseAdmin.from('campaign_users').insert(
    campaigns.map((c: IdName) => ({
      campaign_id: c.id,
      user_id: user.id,
      role: 'approver',
    }))
  );
  if (cuErr) throw new Error(`Failed to assign campaign approvers: ${cuErr.message}`);

  // --- Creators (6) ---
  const { error: creatorErr } = await supabaseAdmin.from('creators').insert([
    { agency_id: agencyId, display_name: 'Aisha Khan', email: 'aisha@example.com', instagram_handle: 'aisha.styles', youtube_handle: 'AishaStylesVlog', is_active: true, is_dummy: true, notes: 'Fashion & Beauty niche' },
    { agency_id: agencyId, display_name: 'Rohan Verma', email: 'rohan@example.com', instagram_handle: 'rohan.eats', tiktok_handle: 'rohan.eats', is_active: true, is_dummy: true, notes: 'Food & Lifestyle niche' },
    { agency_id: agencyId, display_name: 'Meera Nair', email: 'meera@example.com', instagram_handle: 'meerainframes', youtube_handle: 'MeeraInFrames', is_active: true, is_dummy: true, notes: 'Photography & Travel niche' },
    { agency_id: agencyId, display_name: 'Karan Singh', email: 'karan@example.com', instagram_handle: 'karan.fitness', tiktok_handle: 'karanfitlife', is_active: true, is_dummy: true, notes: 'Fitness & Wellness niche' },
    { agency_id: agencyId, display_name: 'Divya Joshi', email: 'divya@example.com', instagram_handle: 'divya.creates', youtube_handle: 'DivyaCreates', is_active: true, is_dummy: true, notes: 'DIY & Crafts niche' },
    { agency_id: agencyId, display_name: 'Amit Tiwari', email: 'amit@example.com', instagram_handle: 'amit.techreview', youtube_handle: 'AmitTechReview', is_active: true, is_dummy: true, notes: 'Tech Reviews niche' },
  ]);
  if (creatorErr) throw new Error(`Failed to seed creators: ${creatorErr.message}`);

  // --- Deliverables (7) ---
  const camp1 = campaigns.find((c: IdName) => c.name === 'Summer Skincare Reels')!;
  const camp2 = campaigns.find((c: IdName) => c.name === 'Luminara YouTube Reviews')!;
  const camp3 = campaigns.find((c: IdName) => c.name === 'Healthy Snack Challenge')!;
  const camp4 = campaigns.find((c: IdName) => c.name === 'FreshBite Recipe Creators')!;
  const camp5 = campaigns.find((c: IdName) => c.name === 'Diwali Feast Campaign')!;

  const { error: delErr } = await supabaseAdmin.from('deliverables').insert([
    { campaign_id: camp1.id, title: 'Summer Glow IG Reel #1', deliverable_type: 'instagram_reel', status: 'pending', is_dummy: true, description: 'Short-form reel showcasing summer skincare routine' },
    { campaign_id: camp1.id, title: 'Summer Glow IG Story Set', deliverable_type: 'instagram_story', status: 'pending', is_dummy: true, description: 'Set of 5 stories for product unboxing' },
    { campaign_id: camp2.id, title: 'Luminara Product Review Video', deliverable_type: 'youtube_video', status: 'pending', is_dummy: true, description: 'In-depth product review (8-12 min)' },
    { campaign_id: camp3.id, title: 'Healthy Snack IG Reel', deliverable_type: 'instagram_reel', status: 'pending', is_dummy: true, description: 'Quick recipe reel with FreshBite products' },
    { campaign_id: camp3.id, title: 'Snack Challenge TikTok', deliverable_type: 'tiktok_video', status: 'pending', is_dummy: true, description: 'Trending challenge format with branded snacks' },
    { campaign_id: camp4.id, title: 'FreshBite Recipe Tutorial', deliverable_type: 'youtube_video', status: 'pending', is_dummy: true, description: 'Full recipe tutorial using FreshBite ingredients' },
    { campaign_id: camp5.id, title: 'Diwali Feast IG Carousel', deliverable_type: 'instagram_carousel', status: 'pending', is_dummy: true, description: '10-slide carousel of festive food spread' },
  ]);
  if (delErr) throw new Error(`Failed to seed deliverables: ${delErr.message}`);

  // Mark agency
  await supabaseAdmin.from('agencies').update({ has_dummy_data: true }).eq('id', agencyId);

  logActivity({
    agencyId,
    entityType: 'agency',
    entityId: agencyId,
    action: 'dummy_data_seeded',
    actorId: user.id,
    actorType: 'user',
  });

  return true;
}

export async function deleteDummyData(
  _: unknown,
  { agencyId }: { agencyId: string },
  ctx: GraphQLContext
) {
  const user = requireAgencyRole(ctx, agencyId, [AgencyRole.AGENCY_ADMIN]);

  await cleanupDummyData(agencyId);

  logActivity({
    agencyId,
    entityType: 'agency',
    entityId: agencyId,
    action: 'dummy_data_deleted',
    actorId: user.id,
    actorType: 'user',
  });

  return true;
}

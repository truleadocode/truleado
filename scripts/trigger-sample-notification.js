/**
 * Trigger a sample Novu notification to user@test.com (campaign approver).
 * Run from project root: node scripts/trigger-sample-notification.js
 * Requires .env.local with NOVU_SECRET_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { Novu } = require('@novu/node');

const RECIPIENT_EMAIL = 'user@test.com';
const WORKFLOW_ID = 'approval-requested';

async function main() {
  const novuKey = process.env.NOVU_SECRET_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!novuKey) {
    console.error('Missing NOVU_SECRET_KEY in .env.local');
    process.exit(1);
  }
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Get user id for user@test.com (campaign approver / recipient)
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, full_name')
    .eq('email', RECIPIENT_EMAIL)
    .maybeSingle();

  if (userError) {
    console.error('Supabase error:', userError.message);
    process.exit(1);
  }
  if (!user) {
    console.error('No user found with email', RECIPIENT_EMAIL, '- create the user in your app first.');
    process.exit(1);
  }

  console.log('Recipient:', RECIPIENT_EMAIL, 'userId:', user.id);

  const novu = new Novu(novuKey);

  // Ensure subscriber exists in Novu
  await novu.subscribers.identify(user.id, {
    email: RECIPIENT_EMAIL,
    firstName: user.full_name?.split(' ')[0] ?? undefined,
    lastName: user.full_name?.split(' ').slice(1).join(' ') || undefined,
  });
  console.log('Subscriber identified in Novu');

  // Trigger approval-requested workflow
  const payload = {
    deliverableTitle: 'Sample deliverable for testing',
    deliverableId: '00000000-0000-0000-0000-000000000001',
    campaignId: '00000000-0000-0000-0000-000000000002',
    approvalLevel: 'internal',
    actionUrl: '/dashboard/deliverables/00000000-0000-0000-0000-000000000001',
  };

  await novu.trigger(WORKFLOW_ID, {
    to: {
      subscriberId: user.id,
      email: RECIPIENT_EMAIL,
    },
    payload,
  });

  console.log('Triggered', WORKFLOW_ID, 'to', RECIPIENT_EMAIL);
  console.log('Check Novu dashboard (Activity/Events) and the Inbox when logged in as user@test.com');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

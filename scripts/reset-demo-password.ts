/**
 * One-off helper: resets a demo user's password to a known value so you can
 * actually log in.
 *
 * Usage:
 *   npx tsx scripts/reset-demo-password.ts                 # defaults to demo_1
 *   npx tsx scripts/reset-demo-password.ts demo_5          # specific demo user
 *   npx tsx scripts/reset-demo-password.ts demo_1 MyPwd!1  # specific password
 */
import 'dotenv/config';
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

const usernameArg = process.argv[2] ?? 'demo_1';
const newPassword = process.argv[3] ?? 'DemoPass123!';
const email = `${usernameArg}@demo.movielib.local`;

async function main() {
  console.log(`🔍 Looking up ${email}…`);

  let userId: string | null = null;
  let page = 1;
  while (!userId) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) {
      console.error('Failed to list users:', error.message);
      process.exit(1);
    }
    if (!data.users || data.users.length === 0) break;
    const found = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (found) {
      userId = found.id;
      break;
    }
    if (data.users.length < 200) break;
    page += 1;
  }

  if (!userId) {
    console.error(`User ${email} not found. Have you run \`npm run db:seed\` yet?`);
    process.exit(1);
  }

  const { error: updateErr } = await supabase.auth.admin.updateUserById(userId, {
    password: newPassword,
    email_confirm: true,
  });
  if (updateErr) {
    console.error('Failed to update password:', updateErr.message);
    process.exit(1);
  }

  console.log('\n✅ Password reset.');
  console.log('   Email:    ' + email);
  console.log('   Password: ' + newPassword);
  console.log('\nLog in at /login.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

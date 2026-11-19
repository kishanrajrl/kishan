import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = process.env.ADMIN_INITIAL_PASSWORD;
if (!url || !serviceKey || !password) {
  console.error('Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or ADMIN_INITIAL_PASSWORD in your local .env.local file.');
  process.exit(1);
}
if (password.length < 8) {
  console.error('Use a password of at least 8 characters.');
  process.exit(1);
}
const supabase = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
const admins = [
  { email: 'admin577528@gmail.com', full_name: 'Lab Administrator 1' },
  { email: 'harshritesh6360@gmail.com', full_name: 'Lab Administrator 2' }
];

for (const admin of admins) {
  const { data: list, error: listError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listError) throw listError;
  let user = list.users.find(u => u.email?.toLowerCase() === admin.email);
  if (user) {
    const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
      password, email_confirm: true, user_metadata: { full_name: admin.full_name }
    });
    if (error) throw error;
    user = data.user;
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email: admin.email, password, email_confirm: true, user_metadata: { full_name: admin.full_name }
    });
    if (error) throw error;
    user = data.user;
  }
  const { error: profileError } = await supabase.from('profiles').upsert({
    id: user.id, email: admin.email, full_name: admin.full_name,
    role: 'admin', status: 'approved'
  }, { onConflict: 'id' });
  if (profileError) throw profileError;
  console.log(`Admin provisioned: ${admin.email}`);
}
console.log('Both LabSync admin accounts are ready. Change the initial password after first login.');

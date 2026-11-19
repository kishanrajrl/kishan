import { createClient } from '@supabase/supabase-js';

const ADMIN_EMAILS = ['admin577528@gmail.com', 'harshritesh6360@gmail.com'];

export async function handleStudentRegistration(body, env = process.env) {
  const { email, password, full_name, usn, department, semester } = body || {};

  if (!email || !password || !full_name || !usn || !department || !semester) {
    return {
      status: 400,
      body: { error: 'All fields (full name, student USN, college email, department, semester, and password) are required.' }
    };
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const cleanName = String(full_name).trim();
  const cleanUsn = String(usn).trim().toUpperCase();
  const cleanDept = String(department).trim();
  const cleanSem = String(semester).trim();

  // Basic format validations
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return { status: 400, body: { error: 'Please enter a valid email address.' } };
  }

  if (ADMIN_EMAILS.includes(cleanEmail)) {
    return {
      status: 403,
      body: { error: 'Cannot register with an administrator email address. Please sign in via the Lab admin tab.' }
    };
  }

  if (String(password).length < 8) {
    return { status: 400, body: { error: 'Password must be at least 8 characters long.' } };
  }

  const rawUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL || '';
  const supabaseUrl = rawUrl.trim().replace(/\/rest\/v1\/?$/i, '').replace(/\/auth\/v1\/?$/i, '').replace(/\/+$/, '');
  const serviceKey = (env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

  if (!supabaseUrl || !serviceKey) {
    return { status: 500, body: { error: 'Server authentication configuration is missing.' } };
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  // Check if email already registered
  const { data: existingUser } = await supabaseAdmin
    .from('profiles')
    .select('id, email, status, role')
    .eq('email', cleanEmail)
    .maybeSingle();

  if (existingUser) {
    if (existingUser.status === 'pending') {
      return {
        status: 409,
        body: { error: 'An account with this email is already registered and is currently awaiting administrator verification.' }
      };
    }
    if (existingUser.status === 'rejected') {
      return {
        status: 403,
        body: { error: 'A student registration with this email was previously declined. Please contact the laboratory administrator.' }
      };
    }
    return {
      status: 409,
      body: { error: 'An account with this email address already exists. Please sign in.' }
    };
  }

  // Create user in Supabase Auth with email_confirm: true so NO confirmation email is sent
  // This eliminates the email confirmation dependency completely for student registration.
  const { data: newAuthData, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email: cleanEmail,
    password: String(password),
    email_confirm: true, // Pre-confirms email so Supabase Auth suppresses confirmation emails
    user_metadata: {
      full_name: cleanName,
      usn: cleanUsn,
      department: cleanDept,
      semester: cleanSem
    }
  });

  if (createError) {
    if (createError.message && createError.message.toLowerCase().includes('already')) {
      return {
        status: 409,
        body: { error: 'An account with this email address already exists. Please sign in.' }
      };
    }
    return {
      status: 400,
      body: { error: createError.message || 'Registration could not be completed.' }
    };
  }

  const userId = newAuthData?.user?.id;
  if (!userId) {
    return { status: 500, body: { error: 'User account creation did not return a valid user identity.' } };
  }

  // Ensure profile is explicitly set to status 'pending' and role 'student'
  // (In addition to the database trigger on_auth_user_created)
  const { error: profileUpsertError } = await supabaseAdmin
    .from('profiles')
    .upsert({
      id: userId,
      email: cleanEmail,
      full_name: cleanName,
      usn: cleanUsn,
      department: cleanDept,
      semester: cleanSem,
      role: 'student',
      status: 'pending' // Mandatory: newly registered students start in pending status
    }, { onConflict: 'id' });

  if (profileUpsertError) {
    console.error('Failed to set pending status on profile:', profileUpsertError);
  }

  // Log registration activity in audit log
  try {
    await supabaseAdmin.from('activity_log').insert({
      actor_id: userId,
      description: `New student registration submitted for ${cleanName} (${cleanUsn}, ${cleanDept}) - Status: Pending Approval`
    });
  } catch {}

  return {
    status: 201,
    body: {
      success: true,
      message: 'Registration submitted successfully! Your account is pending administrator approval before you can log in.'
    }
  };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  let body = req.body || {};
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch {}
  }

  const result = await handleStudentRegistration(body);
  return res.status(result.status).json(result.body);
}

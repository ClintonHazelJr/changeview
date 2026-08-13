import { createClient } from '@supabase/supabase-js';

export function adminClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

/** Verify Bearer token and return the caller’s users row (must be account owner). */
export async function requireAccountOwner(admin, req) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) return { error: { status: 401, message: 'Missing auth token' } };

  const { data: authData, error: authErr } = await admin.auth.getUser(token);
  if (authErr || !authData?.user) {
    return { error: { status: 401, message: 'Invalid session' } };
  }

  const { data: caller, error: callerErr } = await admin
    .from('users')
    .select('id, account_id, role, email, full_name, is_active')
    .eq('id', authData.user.id)
    .single();

  if (callerErr || !caller) {
    return { error: { status: 403, message: 'Profile not found' } };
  }
  if (caller.is_active === false) {
    return { error: { status: 403, message: 'Your account is deactivated' } };
  }
  if (caller.role !== 'owner') {
    return { error: { status: 403, message: 'Only account owners can manage users' } };
  }

  return { caller };
}

/** ~100 years — Auth only accepts hour (h) units, not years. */
export const LONG_BAN = '876000h';

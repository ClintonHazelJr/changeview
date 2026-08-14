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

/**
 * Ban a Supabase Auth user (service role).
 * The Admin API returns { data, error } — it does not throw on Auth failures.
 */
export async function banAuthUser(admin, userId) {
  if (!userId) {
    return { error: { message: 'userId is required to ban' } };
  }

  const { data, error } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: LONG_BAN,
  });

  if (error) {
    console.error('[banAuthUser] updateUserById failed', {
      userId,
      message: error.message,
      status: error.status,
      name: error.name,
    });
    return { error };
  }

  // Confirm the ban stuck — do not trust a quiet { error: null } alone.
  const { data: verified, error: verifyErr } = await admin.auth.admin.getUserById(userId);
  if (verifyErr) {
    console.error('[banAuthUser] getUserById after ban failed', {
      userId,
      message: verifyErr.message,
    });
    return { error: verifyErr };
  }

  const bannedUntil = verified?.user?.banned_until || data?.user?.banned_until;
  if (!bannedUntil) {
    const message = `Auth ban did not set banned_until for user ${userId}`;
    console.error('[banAuthUser]', message, {
      userId,
      updateUser: data?.user || null,
      fetchedUser: verified?.user || null,
    });
    return { error: { message } };
  }

  // Optional: revoke refresh tokens. Failure must not undo a successful ban.
  const { error: signOutErr } = await admin.auth.admin.signOut(userId, 'global');
  if (signOutErr) {
    console.warn('[banAuthUser] signOut after ban failed (ban still applied)', {
      userId,
      message: signOutErr.message,
    });
  }

  return { data: verified || data, bannedUntil };
}

export async function unbanAuthUser(admin, userId) {
  const { data, error } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: 'none',
  });
  if (error) {
    console.error('[unbanAuthUser] failed', { userId, message: error.message });
  }
  return { data, error };
}

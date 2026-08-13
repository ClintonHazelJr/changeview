import { adminClient, setCors, requireAccountOwner, LONG_BAN } from './_adminAuth.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const admin = adminClient();
  if (!admin) {
    return res.status(500).json({ error: 'Service not configured (SUPABASE_SERVICE_ROLE_KEY)' });
  }

  const { caller, error: authError } = await requireAccountOwner(admin, req);
  if (authError) return res.status(authError.status).json({ error: authError.message });

  const userId = String(req.body?.userId || '').trim();
  if (!userId) return res.status(400).json({ error: 'userId is required' });
  if (userId === caller.id) {
    return res.status(400).json({ error: 'You cannot deactivate your own account' });
  }

  const { data: target, error: targetErr } = await admin
    .from('users')
    .select('id, account_id, role, email, is_active')
    .eq('id', userId)
    .single();

  if (targetErr || !target) return res.status(404).json({ error: 'User not found' });
  if (target.account_id !== caller.account_id) {
    return res.status(403).json({ error: 'User is not on your account' });
  }
  if (target.is_active === false) {
    return res.status(200).json({ ok: true, alreadyInactive: true });
  }

  // 1) Ban Auth login (blocks new sessions / refresh once ban is applied).
  const { error: banErr } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: LONG_BAN,
  });
  if (banErr) {
    return res.status(500).json({ error: banErr.message || 'Failed to ban auth user' });
  }

  try {
    await admin.auth.admin.signOut(userId, 'global');
  } catch {
    // Optional — ban is enough if signOut is unavailable.
  }

  // 2) Soft-deactivate (DB may reject if this is the only owner).
  const { error: updateErr } = await admin
    .from('users')
    .update({ is_active: false })
    .eq('id', userId)
    .eq('account_id', caller.account_id);

  if (updateErr) {
    // Roll back ban so they are not stuck banned while still "active" in app data.
    await admin.auth.admin.updateUserById(userId, { ban_duration: 'none' });
    return res.status(400).json({ error: updateErr.message || 'Could not deactivate user' });
  }

  return res.status(200).json({ ok: true, userId, email: target.email });
}

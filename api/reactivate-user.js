import { adminClient, setCors, requireAccountOwner } from './_adminAuth.js';

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

  const { data: target, error: targetErr } = await admin
    .from('users')
    .select('id, account_id, role, email, is_active')
    .eq('id', userId)
    .single();

  if (targetErr || !target) return res.status(404).json({ error: 'User not found' });
  if (target.account_id !== caller.account_id) {
    return res.status(403).json({ error: 'User is not on your account' });
  }
  if (target.is_active !== false) {
    return res.status(200).json({ ok: true, alreadyActive: true });
  }

  // Seat limit / only-owner rules live in DB triggers — surface their messages cleanly.
  const { error: updateErr } = await admin
    .from('users')
    .update({ is_active: true })
    .eq('id', userId)
    .eq('account_id', caller.account_id);

  if (updateErr) {
    return res.status(400).json({ error: updateErr.message || 'Could not reactivate user' });
  }

  const { error: unbanErr } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: 'none',
  });
  if (unbanErr) {
    // Row is active again; report Auth failure so the owner can retry.
    return res.status(500).json({
      error: `User reactivated in the database, but Auth unban failed: ${unbanErr.message}`,
    });
  }

  return res.status(200).json({ ok: true, userId, email: target.email });
}

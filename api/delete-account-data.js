import { adminClient, setCors, requireAccountOwner } from './_adminAuth.js';
import { wipeAccountWorkspaces } from './_accountWipe.js';

/**
 * Owner-only: wipe all Workspaces (and cascaded content) but keep login + subscription.
 * Body: { confirm: 'DELETE' }
 */
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

  const confirm = String(req.body?.confirm || '').trim();

  const { data: account } = await admin
    .from('accounts')
    .select('id, name, deleted_at')
    .eq('id', caller.account_id)
    .maybeSingle();
  if (!account) return res.status(404).json({ error: 'Account not found' });
  if (account.deleted_at) {
    return res.status(403).json({ error: 'This account has been deleted' });
  }
  if (confirm !== 'DELETE' && confirm !== account.name) {
    return res.status(400).json({ error: 'Type DELETE (or your exact account name) to confirm' });
  }

  try {
    await wipeAccountWorkspaces(admin, caller.account_id);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to delete data' });
  }

  return res.status(200).json({ ok: true });
}

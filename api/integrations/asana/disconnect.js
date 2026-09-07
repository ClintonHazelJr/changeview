import { adminClient, setCors, requireAccountOwner } from '../../_adminAuth.js';

/** Disconnect Asana for one ChangeView workspace (no Asana revoke call in v1). */
export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const admin = adminClient();
  if (!admin) return res.status(500).json({ error: 'Service not configured' });

  const { caller, error: authError } = await requireAccountOwner(admin, req);
  if (authError) return res.status(authError.status).json({ error: authError.message });

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const workspaceId = body.workspaceId;
  if (!workspaceId) return res.status(400).json({ error: 'workspaceId is required' });

  const { data: integration } = await admin
    .from('integrations')
    .select('id')
    .eq('account_id', caller.account_id)
    .eq('workspace_id', workspaceId)
    .eq('provider', 'asana')
    .maybeSingle();

  if (!integration) {
    return res.status(200).json({ ok: true, status: 'disconnected' });
  }

  const { error } = await admin
    .from('integrations')
    .update({
      status: 'disconnected',
      access_token_encrypted: null,
      refresh_token_encrypted: null,
      token_expires_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', integration.id);

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ ok: true, status: 'disconnected', workspaceId });
}

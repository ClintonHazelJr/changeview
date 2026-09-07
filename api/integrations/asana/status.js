import { adminClient, setCors, requireAccountOwner } from '../../_adminAuth.js';

/** Connection + parent-link summary for the active ChangeView workspace. */
export default async function handler(req, res) {
  setCors(res);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const admin = adminClient();
  if (!admin) return res.status(500).json({ error: 'Service not configured' });

  const { caller, error: authError } = await requireAccountOwner(admin, req);
  if (authError) return res.status(authError.status).json({ error: authError.message });

  const host = req.headers.host || 'localhost';
  const url = new URL(req.url, `http://${host}`);
  const workspaceId = url.searchParams.get('workspaceId');
  if (!workspaceId) {
    return res.status(400).json({ error: 'workspaceId query param is required' });
  }

  const { data: integration, error } = await admin
    .from('integrations')
    .select('id, provider, status, workspace_id, external_workspace_id, external_user_id, external_user_name, updated_at, metadata')
    .eq('account_id', caller.account_id)
    .eq('workspace_id', workspaceId)
    .eq('provider', 'asana')
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });

  let parentLinks = [];
  if (integration?.id) {
    const { data: links, error: linkErr } = await admin
      .from('integration_parent_links')
      .select('id, workspace_id, initiative_id, external_id, external_name, external_url, last_synced_at, last_sync_direction, webhook_gid, created_at')
      .eq('integration_id', integration.id)
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });
    if (linkErr) return res.status(500).json({ error: linkErr.message });
    parentLinks = links || [];
  }

  return res.status(200).json({
    integration: integration || null,
    connected: integration?.status === 'connected',
    workspaceId,
    parentLinks,
  });
}

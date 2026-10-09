import { adminClient, setCors, requireAccountOwner } from '../../_adminAuth.js';
import { asanaFetch, getValidAsanaAccess } from '../../_asanaClient.js';

/** Remove Initiative ↔ Asana parent link (keeps ChangeView tasks; optional Asana webhook delete). */
export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const admin = adminClient();
  if (!admin) return res.status(500).json({ error: 'Service not configured' });

  const { caller, error: authError } = await requireAccountOwner(admin, req);
  if (authError) return res.status(authError.status).json({ error: authError.message });

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const parentLinkId = body.parentLinkId;
  if (!parentLinkId) return res.status(400).json({ error: 'parentLinkId is required' });

  const { data: link, error } = await admin
    .from('integration_parent_links')
    .select('*')
    .eq('id', parentLinkId)
    .eq('account_id', caller.account_id)
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  if (!link) return res.status(404).json({ error: 'Parent link not found' });

  if (link.webhook_gid) {
    try {
      const { accessToken } = await getValidAsanaAccess(admin, {
        accountId: caller.account_id,
        workspaceId: link.workspace_id,
      });
      await asanaFetch(accessToken, `/webhooks/${link.webhook_gid}`, { method: 'DELETE' });
    } catch (err) {
      console.warn('[asana/unlink-parent] webhook delete failed', err.message);
    }
  }

  // Task links cascade via FK on parent_link_id.
  const { error: delErr } = await admin
    .from('integration_parent_links')
    .delete()
    .eq('id', link.id);

  if (delErr) return res.status(500).json({ error: delErr.message });
  return res.status(200).json({ ok: true });
}

import { adminClient, setCors, requireAccountOwner } from '../../_adminAuth.js';
import {
  asanaFetch,
  getValidAsanaAccess,
  parseAsanaTaskGid,
} from '../../_asanaClient.js';

/**
 * Link one Asana parent ticket to a ChangeView Initiative and register a webhook.
 * Does not import the whole project — only this ticket (subtasks imported separately).
 */
export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const admin = adminClient();
  if (!admin) return res.status(500).json({ error: 'Service not configured' });

  const { caller, error: authError } = await requireAccountOwner(admin, req);
  if (authError) return res.status(authError.status).json({ error: authError.message });

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const initiativeId = body.initiativeId;
  const workspaceId = body.workspaceId;
  const externalId = parseAsanaTaskGid(body.externalId || body.taskGid || body.url || '');

  if (!initiativeId || !workspaceId || !externalId) {
    return res.status(400).json({ error: 'initiativeId, workspaceId, and Asana task id/URL are required' });
  }

  try {
    const { data: initiative, error: initErr } = await admin
      .from('initiatives')
      .select('id, name, account_id, workspace_id')
      .eq('id', initiativeId)
      .eq('account_id', caller.account_id)
      .eq('workspace_id', workspaceId)
      .single();
    if (initErr || !initiative) {
      return res.status(404).json({ error: 'Initiative not found in this workspace' });
    }

    const { integration, accessToken } = await getValidAsanaAccess(admin, caller.account_id);

    const taskRes = await asanaFetch(
      accessToken,
      `/tasks/${externalId}?opt_fields=gid,name,permalink_url,completed`,
    );
    const asanaTask = taskRes.data;
    const now = new Date().toISOString();

    const { data: link, error: linkErr } = await admin
      .from('integration_parent_links')
      .upsert({
        account_id: caller.account_id,
        workspace_id: workspaceId,
        integration_id: integration.id,
        initiative_id: initiativeId,
        external_id: asanaTask.gid,
        external_url: asanaTask.permalink_url || null,
        external_name: asanaTask.name || null,
        updated_at: now,
      }, { onConflict: 'integration_id,initiative_id' })
      .select('*')
      .single();

    if (linkErr) return res.status(500).json({ error: linkErr.message });

    const origin = req.headers.origin
      || (typeof req.headers.referer === 'string' ? new URL(req.headers.referer).origin : null)
      || process.env.APP_ORIGIN
      || 'http://localhost:5173';
    const webhookTarget = `${String(origin).replace(/\/$/, '')}/api/integrations/asana/webhook?parentLinkId=${link.id}`;

    let webhookGid = null;
    let webhookNote = 'Parent linked.';
    try {
      const hook = await asanaFetch(accessToken, '/webhooks', {
        method: 'POST',
        body: {
          data: {
            resource: externalId,
            target: webhookTarget,
            filters: [
              { resource_type: 'task', action: 'changed' },
              { resource_type: 'task', action: 'added' },
              { resource_type: 'task', action: 'deleted' },
              { resource_type: 'task', action: 'removed' },
            ],
          },
        },
      });
      webhookGid = hook.data?.gid || null;
      if (webhookGid) {
        await admin
          .from('integration_parent_links')
          .update({ webhook_gid: webhookGid, updated_at: new Date().toISOString() })
          .eq('id', link.id);
        webhookNote = 'Parent linked and Asana webhook registered.';
      }
    } catch (hookErr) {
      console.warn('[asana/link-parent] webhook registration failed', hookErr.message);
      webhookNote = 'Parent linked. Webhook registration failed — inbound sync needs a public HTTPS URL (production or tunnel).';
    }

    const { data: refreshed } = await admin
      .from('integration_parent_links')
      .select('*')
      .eq('id', link.id)
      .single();

    return res.status(200).json({
      parentLink: refreshed || link,
      webhookRegistered: Boolean(webhookGid),
      webhookTarget,
      note: webhookNote,
    });
  } catch (err) {
    console.error('[asana/link-parent]', err);
    return res.status(err.status || 500).json({ error: err.message || 'Link failed' });
  }
}

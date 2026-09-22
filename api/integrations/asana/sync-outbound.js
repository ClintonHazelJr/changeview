import { adminClient, setCors, requireAccountOwner } from '../../_adminAuth.js';
import {
  asanaFetch,
  cvStatusToAsanaCompleted,
  getValidAsanaAccess,
} from '../../_asanaClient.js';

/**
 * Outbound sync: push a ChangeView Task to Asana as a subtask under the linked parent.
 * Application-layer only (not a DB trigger).
 */
export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const admin = adminClient();
  if (!admin) return res.status(500).json({ error: 'Service not configured' });

  const { caller, error: authError } = await requireAccountOwner(admin, req);
  // Allow any authenticated workspace member to trigger outbound after editing a task:
  // fall back to soft auth if not owner.
  let accountId = caller?.account_id;
  if (authError) {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!token) return res.status(401).json({ error: 'Missing auth token' });
    const { data: authData, error: aErr } = await admin.auth.getUser(token);
    if (aErr || !authData?.user) return res.status(401).json({ error: 'Invalid session' });
    const { data: user } = await admin
      .from('users')
      .select('id, account_id, is_active')
      .eq('id', authData.user.id)
      .single();
    if (!user || user.is_active === false) return res.status(403).json({ error: 'Profile not found' });
    accountId = user.account_id;
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const taskId = body.taskId;
  if (!taskId) return res.status(400).json({ error: 'taskId is required' });

  try {
    const { data: task, error: taskErr } = await admin
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .eq('account_id', accountId)
      .single();
    if (taskErr || !task) return res.status(404).json({ error: 'Task not found' });

    const { data: parentLink } = await admin
      .from('integration_parent_links')
      .select('*')
      .eq('account_id', accountId)
      .eq('workspace_id', task.workspace_id)
      .eq('initiative_id', task.initiative_id)
      .maybeSingle();

    if (!parentLink) {
      return res.status(200).json({ ok: true, skipped: true, reason: 'Initiative has no Asana parent link' });
    }

    const { integration, accessToken } = await getValidAsanaAccess(admin, {
      accountId,
      workspaceId: task.workspace_id,
    });
    if (parentLink.integration_id !== integration.id) {
      return res.status(200).json({ ok: true, skipped: true, reason: 'Asana not connected for this link' });
    }

    const { data: existingLink } = await admin
      .from('integration_task_links')
      .select('*')
      .eq('integration_id', integration.id)
      .eq('task_id', task.id)
      .maybeSingle();

    const now = new Date().toISOString();
    const completed = cvStatusToAsanaCompleted(task.status);

    if (existingLink) {
      await asanaFetch(accessToken, `/tasks/${existingLink.external_id}`, {
        method: 'PUT',
        body: {
          data: {
            name: task.name,
            notes: task.description || '',
            completed,
          },
        },
      });
      await admin
        .from('integration_task_links')
        .update({
          last_synced_at: now,
          last_sync_direction: 'outbound',
          last_outbound_at: now,
          updated_at: now,
        })
        .eq('id', existingLink.id);

      return res.status(200).json({ ok: true, action: 'updated', externalId: existingLink.external_id });
    }

    // Create nested under the linked parent — never a top-level project task.
    const created = await asanaFetch(accessToken, `/tasks/${parentLink.external_id}/subtasks`, {
      method: 'POST',
      body: {
        data: {
          name: task.name,
          notes: task.description || '',
          completed,
        },
      },
    });

    const asanaTask = created.data;
    await admin.from('integration_task_links').insert({
      account_id: accountId,
      workspace_id: task.workspace_id,
      integration_id: integration.id,
      parent_link_id: parentLink.id,
      task_id: task.id,
      external_id: asanaTask.gid,
      external_url: asanaTask.permalink_url || null,
      last_synced_at: now,
      last_sync_direction: 'outbound',
      last_outbound_at: now,
    });

    await admin
      .from('integration_parent_links')
      .update({
        last_synced_at: now,
        last_sync_direction: 'outbound',
        updated_at: now,
      })
      .eq('id', parentLink.id);

    return res.status(200).json({ ok: true, action: 'created', externalId: asanaTask.gid });
  } catch (err) {
    console.error('[asana/sync-outbound]', err);
    return res.status(err.status || 500).json({ error: err.message || 'Outbound sync failed' });
  }
}

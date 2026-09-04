import { adminClient, setCors, requireAccountOwner } from '../../_adminAuth.js';
import {
  asanaFetch,
  asanaCompletedToCvStatus,
  getValidAsanaAccess,
} from '../../_asanaClient.js';

/**
 * Manual import: pull subtasks under the linked parent ticket into ChangeView Tasks.
 * Does not import any other tasks from the Asana project.
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
  const parentLinkId = body.parentLinkId;
  if (!parentLinkId) return res.status(400).json({ error: 'parentLinkId is required' });

  try {
    const { data: parentLink, error: plErr } = await admin
      .from('integration_parent_links')
      .select('*')
      .eq('id', parentLinkId)
      .eq('account_id', caller.account_id)
      .single();
    if (plErr || !parentLink) return res.status(404).json({ error: 'Parent link not found' });

    const { integration, accessToken } = await getValidAsanaAccess(admin, caller.account_id);
    if (parentLink.integration_id !== integration.id) {
      return res.status(400).json({ error: 'Parent link does not belong to this Asana connection' });
    }

    const subtasksRes = await asanaFetch(
      accessToken,
      `/tasks/${parentLink.external_id}/subtasks?opt_fields=gid,name,notes,completed,permalink_url,modified_at&limit=100`,
    );
    const subtasks = subtasksRes.data || [];

    const { data: existingLinks } = await admin
      .from('integration_task_links')
      .select('external_id, task_id')
      .eq('parent_link_id', parentLink.id);
    const byExternal = new Map((existingLinks || []).map((r) => [r.external_id, r.task_id]));

    const now = new Date().toISOString();
    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const st of subtasks) {
      const status = asanaCompletedToCvStatus(st.completed);
      const existingTaskId = byExternal.get(st.gid);

      if (existingTaskId) {
        const { error: upErr } = await admin
          .from('tasks')
          .update({
            name: st.name || 'Untitled',
            description: st.notes || null,
            status,
            updated_at: now,
          })
          .eq('id', existingTaskId)
          .eq('account_id', caller.account_id);
        if (upErr) throw new Error(upErr.message);
        await admin
          .from('integration_task_links')
          .update({
            last_synced_at: now,
            last_sync_direction: 'import',
            external_url: st.permalink_url || null,
            updated_at: now,
          })
          .eq('parent_link_id', parentLink.id)
          .eq('external_id', st.gid);
        updated += 1;
        continue;
      }

      const { data: task, error: taskErr } = await admin
        .from('tasks')
        .insert({
          account_id: caller.account_id,
          workspace_id: parentLink.workspace_id,
          initiative_id: parentLink.initiative_id,
          name: st.name || 'Untitled',
          description: st.notes || null,
          status,
          updated_at: now,
        })
        .select('id')
        .single();
      if (taskErr) throw new Error(taskErr.message);

      const { error: linkErr } = await admin.from('integration_task_links').insert({
        account_id: caller.account_id,
        workspace_id: parentLink.workspace_id,
        integration_id: integration.id,
        parent_link_id: parentLink.id,
        task_id: task.id,
        external_id: st.gid,
        external_url: st.permalink_url || null,
        last_synced_at: now,
        last_sync_direction: 'import',
      });
      if (linkErr) throw new Error(linkErr.message);
      created += 1;
    }

    await admin
      .from('integration_parent_links')
      .update({
        last_synced_at: now,
        last_sync_direction: 'import',
        updated_at: now,
      })
      .eq('id', parentLink.id);

    return res.status(200).json({
      ok: true,
      imported: created,
      updated,
      skipped,
      totalSubtasks: subtasks.length,
      mapping: 'Asana completed→done; incomplete→in_progress',
    });
  } catch (err) {
    console.error('[asana/import]', err);
    return res.status(err.status || 500).json({ error: err.message || 'Import failed' });
  }
}

import crypto from 'crypto';
import { adminClient } from '../../_adminAuth.js';
import {
  asanaFetch,
  asanaCompletedToCvStatus,
  getValidAsanaAccess,
  isEchoOfOutbound,
  lastWriteWins,
} from '../../_asanaClient.js';

/**
 * Asana webhook target.
 *
 * Handshake: respond with X-Hook-Secret.
 * Events: update linked Tasks by external_id; create Tasks for new subtasks under the parent.
 *
 * Loop prevention: if last_outbound_at is within ECHO_WINDOW_MS, skip (echo of our own push).
 * Conflicts (independent edits): last-write-wins by timestamp (Asana modified_at vs tasks.updated_at).
 */
export default async function handler(req, res) {
  const hookSecretHeader = req.headers['x-hook-secret'];
  if (hookSecretHeader) {
    // Handshake — must echo the secret.
    const parentLinkId = extractParentLinkId(req);
    res.setHeader('X-Hook-Secret', hookSecretHeader);
    if (parentLinkId) {
      const admin = adminClient();
      if (admin) {
        await admin
          .from('integration_parent_links')
          .update({ webhook_secret: String(hookSecretHeader), updated_at: new Date().toISOString() })
          .eq('id', parentLinkId);
      }
    }
    return res.status(200).end();
  }

  if (req.method !== 'POST') return res.status(405).end();

  const admin = adminClient();
  if (!admin) return res.status(500).json({ error: 'Service not configured' });

  const parentLinkId = extractParentLinkId(req);
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const events = body.events || [];

  let parentLink = null;
  if (parentLinkId) {
    const { data } = await admin
      .from('integration_parent_links')
      .select('*')
      .eq('id', parentLinkId)
      .maybeSingle();
    parentLink = data;
  }

  // Signature check when we have a stored secret.
  if (parentLink?.webhook_secret) {
    const signature = req.headers['x-hook-signature'];
    const raw = typeof req.body === 'string' ? req.body : JSON.stringify(body);
    const expected = crypto
      .createHmac('sha256', parentLink.webhook_secret)
      .update(raw)
      .digest('hex');
    if (signature && signature !== expected) {
      console.warn('[asana/webhook] signature mismatch');
      return res.status(401).json({ error: 'Invalid signature' });
    }
  }

  // Always 200 quickly so Asana does not disable the webhook; process inline for v1.
  try {
    if (!parentLink) {
      // Fallback: resolve by parent external_id from events
      const resourceGid = events[0]?.resource?.gid;
      if (resourceGid) {
        const { data } = await admin
          .from('integration_parent_links')
          .select('*')
          .or(`external_id.eq.${resourceGid}`)
          .maybeSingle();
        parentLink = data;
      }
    }

    if (!parentLink) {
      console.warn('[asana/webhook] no parent link for events');
      return res.status(200).json({ ok: true, skipped: true });
    }

    const { accessToken } = await getValidAsanaAccess(admin, {
      accountId: parentLink.account_id,
      workspaceId: parentLink.workspace_id,
    });
    const seen = new Set();

    for (const event of events) {
      const gid = event?.resource?.gid;
      if (!gid || seen.has(gid)) continue;
      seen.add(gid);
      await processEvent(admin, accessToken, parentLink, event);
    }

    return res.status(200).json({ ok: true, processed: seen.size });
  } catch (err) {
    console.error('[asana/webhook]', err);
    // Still 200 to avoid webhook deletion storms; log for ops.
    return res.status(200).json({ ok: false, error: err.message });
  }
}

function extractParentLinkId(req) {
  try {
    const host = req.headers.host || 'localhost';
    const url = new URL(req.url, `http://${host}`);
    return url.searchParams.get('parentLinkId') || null;
  } catch {
    return null;
  }
}

async function processEvent(admin, accessToken, parentLink, event) {
  const gid = event.resource?.gid;
  const action = event.action;
  const now = new Date().toISOString();

  if (action === 'deleted' || action === 'removed') {
    const { data: link } = await admin
      .from('integration_task_links')
      .select('*')
      .eq('parent_link_id', parentLink.id)
      .eq('external_id', gid)
      .maybeSingle();
    if (!link) return;
    if (isEchoOfOutbound(link.last_outbound_at)) return;
    // Soft approach: mark CV task done rather than delete (safer for consultants).
    await admin
      .from('tasks')
      .update({ status: 'done', updated_at: now })
      .eq('id', link.task_id);
    await admin
      .from('integration_task_links')
      .update({ last_synced_at: now, last_sync_direction: 'inbound', updated_at: now })
      .eq('id', link.id);
    return;
  }

  // Parent ticket itself changed — ignore name/status on parent (we sync subtasks only).
  if (gid === parentLink.external_id) {
    // Refresh subtask membership: if action added with parent, handled below via resource fetch.
    if (action === 'changed') return;
  }

  let asanaTask;
  try {
    const res = await asanaFetch(
      accessToken,
      `/tasks/${gid}?opt_fields=gid,name,notes,completed,permalink_url,modified_at,parent.gid`,
    );
    asanaTask = res.data;
  } catch (err) {
    if (err.status === 404) return;
    throw err;
  }

  // Only sync the linked parent’s direct subtasks.
  const isParent = asanaTask.gid === parentLink.external_id;
  const isSubtask = asanaTask.parent?.gid === parentLink.external_id;
  if (isParent || !isSubtask) return;

  const { data: taskLink } = await admin
    .from('integration_task_links')
    .select('*, tasks(id, name, status, updated_at, description)')
    .eq('parent_link_id', parentLink.id)
    .eq('external_id', asanaTask.gid)
    .maybeSingle();

  if (taskLink && isEchoOfOutbound(taskLink.last_outbound_at)) {
    console.log('[asana/webhook] skip echo', { externalId: asanaTask.gid });
    return;
  }

  const status = asanaCompletedToCvStatus(asanaTask.completed);

  if (!taskLink) {
    const { data: task, error } = await admin
      .from('tasks')
      .insert({
        account_id: parentLink.account_id,
        workspace_id: parentLink.workspace_id,
        initiative_id: parentLink.initiative_id,
        name: asanaTask.name || 'Untitled',
        description: asanaTask.notes || null,
        status,
        updated_at: now,
      })
      .select('id')
      .single();
    if (error) throw new Error(error.message);

    await admin.from('integration_task_links').insert({
      account_id: parentLink.account_id,
      workspace_id: parentLink.workspace_id,
      integration_id: parentLink.integration_id,
      parent_link_id: parentLink.id,
      task_id: task.id,
      external_id: asanaTask.gid,
      external_url: asanaTask.permalink_url || null,
      last_synced_at: now,
      last_sync_direction: 'inbound',
    });
    await admin
      .from('integration_parent_links')
      .update({ last_synced_at: now, last_sync_direction: 'inbound', updated_at: now })
      .eq('id', parentLink.id);
    return;
  }

  const local = taskLink.tasks;
  const winner = lastWriteWins({
    remoteModifiedAt: asanaTask.modified_at,
    localUpdatedAt: local?.updated_at,
  });
  // Conflict policy: last-write-wins — only apply inbound when remote is newer or equal.
  if (winner === 'local') {
    console.log('[asana/webhook] skip older remote', { externalId: asanaTask.gid });
    return;
  }

  await admin
    .from('tasks')
    .update({
      name: asanaTask.name || local?.name || 'Untitled',
      description: asanaTask.notes ?? local?.description ?? null,
      status,
      updated_at: now,
    })
    .eq('id', taskLink.task_id);

  await admin
    .from('integration_task_links')
    .update({
      last_synced_at: now,
      last_sync_direction: 'inbound',
      external_url: asanaTask.permalink_url || taskLink.external_url,
      updated_at: now,
    })
    .eq('id', taskLink.id);

  await admin
    .from('integration_parent_links')
    .update({ last_synced_at: now, last_sync_direction: 'inbound', updated_at: now })
    .eq('id', parentLink.id);
}

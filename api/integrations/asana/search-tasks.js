import { adminClient, setCors, requireAccountOwner } from '../../_adminAuth.js';
import { asanaFetch, getValidAsanaAccess, parseAsanaTaskGid } from '../../_asanaClient.js';

/** Search Asana tasks by name, or resolve a pasted task URL/GID. */
export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const admin = adminClient();
  if (!admin) return res.status(500).json({ error: 'Service not configured' });

  const { caller, error: authError } = await requireAccountOwner(admin, req);
  if (authError) return res.status(authError.status).json({ error: authError.message });

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const query = String(body.query || '').trim();
  const workspaceId = body.workspaceId;
  if (!query) return res.status(400).json({ error: 'query is required' });
  if (!workspaceId) return res.status(400).json({ error: 'workspaceId is required' });

  try {
    const { integration, accessToken } = await getValidAsanaAccess(admin, {
      accountId: caller.account_id,
      workspaceId,
    });
    const gid = parseAsanaTaskGid(query);

    if (gid && (/^\d+$/.test(query) || query.includes('asana.com') || query.includes('/task/'))) {
      const task = await asanaFetch(
        accessToken,
        `/tasks/${gid}?opt_fields=gid,name,permalink_url,completed,parent.gid,parent.name,projects.name`,
      );
      return res.status(200).json({
        tasks: [{
          gid: task.data.gid,
          name: task.data.name,
          permalink_url: task.data.permalink_url,
          completed: task.data.completed,
          parent: task.data.parent || null,
          projects: task.data.projects || [],
        }],
      });
    }

    const workspaceGid = integration.external_workspace_id;
    if (!workspaceGid) {
      return res.status(400).json({ error: 'No Asana workspace on this connection — reconnect Asana' });
    }

    const typeahead = await asanaFetch(
      accessToken,
      `/workspaces/${workspaceGid}/typeahead?resource_type=task&query=${encodeURIComponent(query)}&count=15&opt_fields=gid,name,resource_type`,
    );

    const compact = typeahead.data || [];
    const detailed = [];
    for (const item of compact.slice(0, 10)) {
      try {
        const task = await asanaFetch(
          accessToken,
          `/tasks/${item.gid}?opt_fields=gid,name,permalink_url,completed,parent.gid,parent.name`,
        );
        detailed.push({
          gid: task.data.gid,
          name: task.data.name,
          permalink_url: task.data.permalink_url,
          completed: task.data.completed,
          parent: task.data.parent || null,
        });
      } catch {
        detailed.push({ gid: item.gid, name: item.name, permalink_url: null, completed: false, parent: null });
      }
    }

    return res.status(200).json({ tasks: detailed });
  } catch (err) {
    console.error('[asana/search-tasks]', err);
    return res.status(err.status || 500).json({ error: err.message || 'Search failed' });
  }
}

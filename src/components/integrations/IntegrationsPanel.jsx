import { useCallback, useEffect, useState } from 'react';
import { Link2, Unplug, Download, Search, Plug, AlertCircle } from 'lucide-react';
import { C, HEAD, BODY, tint, inputClass, inputStyle } from '../../lib/constants';
import { useAuth } from '../../contexts/AuthContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { supabase } from '../../lib/supabase';
import {
  startAsanaConnect,
  fetchAsanaStatus,
  disconnectAsana,
  searchAsanaTasks,
  linkAsanaParent,
  unlinkAsanaParent,
  importAsanaSubtasks,
} from '../../lib/asanaIntegration';

export default function IntegrationsPanel() {
  const { profile, session } = useAuth();
  const { activeWorkspaceId, workspaces } = useWorkspace();
  const isOwner = profile?.role === 'owner';
  const token = session?.access_token;

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [connected, setConnected] = useState(false);
  const [integration, setIntegration] = useState(null);
  const [parentLinks, setParentLinks] = useState([]);
  const [initiatives, setInitiatives] = useState([]);

  const [initiativeId, setInitiativeId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);

  const reload = useCallback(async () => {
    if (!token || !isOwner) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await fetchAsanaStatus(token);
      setConnected(Boolean(data.connected));
      setIntegration(data.integration || null);
      setParentLinks(data.parentLinks || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, isOwner]);

  useEffect(() => { reload(); }, [reload]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!activeWorkspaceId) {
        setInitiatives([]);
        return;
      }
      const { data } = await supabase
        .from('initiatives')
        .select('id, name')
        .eq('workspace_id', activeWorkspaceId)
        .order('name');
      if (!cancelled) setInitiatives(data || []);
    })();
    return () => { cancelled = true; };
  }, [activeWorkspaceId]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('integrations') === 'asana') {
      if (params.get('connected') === '1') setNotice('Asana connected.');
      if (params.get('error')) setError(params.get('error'));
      params.delete('integrations');
      params.delete('connected');
      params.delete('error');
      const next = `${window.location.pathname}${params.toString() ? `?${params}` : ''}${window.location.hash}`;
      window.history.replaceState({}, '', next);
    }
  }, []);

  const onConnect = async () => {
    setBusy('connect');
    setError('');
    try {
      await startAsanaConnect(token);
    } catch (err) {
      setError(err.message);
      setBusy('');
    }
  };

  const onDisconnect = async () => {
    if (!window.confirm('Disconnect Asana? Existing parent links stay until you remove them.')) return;
    setBusy('disconnect');
    setError('');
    try {
      await disconnectAsana(token);
      setNotice('Asana disconnected.');
      await reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  };

  const onSearch = async (e) => {
    e?.preventDefault?.();
    if (!searchQuery.trim()) return;
    setBusy('search');
    setError('');
    setSelectedTask(null);
    try {
      const data = await searchAsanaTasks(token, searchQuery.trim());
      setSearchResults(data.tasks || []);
      if (!(data.tasks || []).length) setNotice('No Asana tasks matched.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  };

  const onLink = async () => {
    if (!selectedTask || !initiativeId || !activeWorkspaceId) {
      setError('Pick an Initiative and an Asana parent ticket.');
      return;
    }
    setBusy('link');
    setError('');
    try {
      const data = await linkAsanaParent(token, {
        initiativeId,
        workspaceId: activeWorkspaceId,
        externalId: selectedTask.gid,
      });
      setNotice(data.note || 'Parent linked.');
      setSearchResults([]);
      setSelectedTask(null);
      setSearchQuery('');
      await reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  };

  const onImport = async (parentLinkId) => {
    setBusy(`import:${parentLinkId}`);
    setError('');
    try {
      const data = await importAsanaSubtasks(token, parentLinkId);
      setNotice(`Import done — ${data.imported} created, ${data.updated} updated (${data.totalSubtasks} subtasks). Mapping: ${data.mapping}`);
      await reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  };

  const onUnlink = async (parentLinkId) => {
    if (!window.confirm('Unlink this Asana parent? ChangeView tasks stay; sync stops.')) return;
    setBusy(`unlink:${parentLinkId}`);
    setError('');
    try {
      await unlinkAsanaParent(token, parentLinkId);
      setNotice('Parent unlinked.');
      await reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  };

  const initiativeName = (id) => initiatives.find((i) => i.id === id)?.name
    || parentLinks.find((l) => l.initiative_id === id)?.external_name
    || id;

  if (!isOwner) {
    return (
      <div className="flex-1 p-8 max-w-2xl w-full mx-auto" style={BODY}>
        <h2 className="text-xl font-extrabold mb-2" style={{ ...HEAD, color: C.ink }}>Integrations</h2>
        <p className="text-sm" style={{ color: C.sub }}>Only the account owner can connect external tools.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 p-8 max-w-3xl w-full mx-auto overflow-y-auto" style={BODY}>
      <h2 className="text-xl font-extrabold mb-1" style={{ ...HEAD, color: C.ink }}>Integrations</h2>
      <p className="text-sm mb-6" style={{ color: C.sub }}>
        Connect a single parent ticket in Asana to a ChangeView Initiative. Only that ticket’s
        subtasks sync — nothing else in the project.
      </p>

      {error && (
        <div className="mb-4 text-sm rounded-2xl border px-4 py-3 flex gap-2" style={{ borderColor: tint(C.coral, '50'), background: tint(C.coral, '12'), color: C.ink }}>
          <AlertCircle size={16} className="shrink-0 mt-0.5" style={{ color: C.coral }} />
          <span>{error}</span>
        </div>
      )}
      {notice && (
        <div className="mb-4 text-sm rounded-2xl border px-4 py-3" style={{ borderColor: tint(C.green, '50'), background: tint(C.green, '12'), color: C.ink }}>
          {notice}
          <button type="button" className="ml-3 underline text-xs" onClick={() => setNotice('')}>Dismiss</button>
        </div>
      )}

      {/* Asana card */}
      <div className="bg-white rounded-3xl border shadow-sm p-5 mb-4" style={{ borderColor: C.border }}>
        <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
          <div>
            <h3 className="text-sm font-extrabold" style={{ ...HEAD, color: C.ink }}>Asana</h3>
            <p className="text-xs mt-1" style={{ color: C.sub }}>
              {loading
                ? 'Loading…'
                : connected
                  ? `Connected as ${integration?.external_user_name || 'Asana user'}`
                  : 'Not connected'}
            </p>
          </div>
          {connected ? (
            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={onDisconnect}
              className="inline-flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-full border disabled:opacity-50"
              style={{ borderColor: C.border, color: C.coral }}
            >
              <Unplug size={15} />
              {busy === 'disconnect' ? 'Disconnecting…' : 'Disconnect'}
            </button>
          ) : (
            <button
              type="button"
              disabled={Boolean(busy) || loading}
              onClick={onConnect}
              className="inline-flex items-center gap-2 text-sm font-bold text-white px-4 py-2.5 rounded-full disabled:opacity-50"
              style={{ background: C.purple }}
            >
              <Plug size={15} />
              {busy === 'connect' ? 'Opening Asana…' : 'Connect Asana'}
            </button>
          )}
        </div>

        {connected && (
          <>
            <div className="border-t pt-4 mt-2" style={{ borderColor: C.border }}>
              <h4 className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: C.sub }}>
                Link a parent ticket
              </h4>
              <p className="text-xs mb-3" style={{ color: C.sub }}>
                Point at one existing Asana ticket (e.g. “Change Management”). Its subtasks import as
                ChangeView Tasks; new Tasks under that Initiative push back as nested subtasks.
              </p>

              <label className="block text-xs font-semibold mb-1" style={{ color: C.sub }}>Initiative</label>
              <select
                className={`${inputClass} mb-3`}
                style={inputStyle}
                value={initiativeId}
                onChange={(e) => setInitiativeId(e.target.value)}
              >
                <option value="">Select initiative…</option>
                {initiatives.map((i) => (
                  <option key={i.id} value={i.id}>{i.name}</option>
                ))}
              </select>

              <form onSubmit={onSearch} className="flex flex-wrap gap-2 mb-3">
                <input
                  className={`${inputClass} flex-1 min-w-[200px]`}
                  style={inputStyle}
                  placeholder="Search by name or paste Asana task URL"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button
                  type="submit"
                  disabled={Boolean(busy)}
                  className="inline-flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-full border disabled:opacity-50"
                  style={{ borderColor: C.purple, color: C.purple }}
                >
                  <Search size={14} />
                  {busy === 'search' ? 'Searching…' : 'Search'}
                </button>
              </form>

              {searchResults.length > 0 && (
                <ul className="mb-3 rounded-2xl border overflow-hidden" style={{ borderColor: C.border }}>
                  {searchResults.map((t) => (
                    <li key={t.gid}>
                      <button
                        type="button"
                        onClick={() => setSelectedTask(t)}
                        className="w-full text-left px-3 py-2.5 text-sm border-b last:border-b-0"
                        style={{
                          borderColor: C.border,
                          background: selectedTask?.gid === t.gid ? tint(C.purple, '12') : '#fff',
                          color: C.ink,
                        }}
                      >
                        <span className="font-semibold">{t.name}</span>
                        {t.parent?.name && (
                          <span className="text-xs ml-2" style={{ color: C.sub }}>under {t.parent.name}</span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <button
                type="button"
                disabled={!selectedTask || !initiativeId || Boolean(busy)}
                onClick={onLink}
                className="inline-flex items-center gap-2 text-sm font-bold text-white px-4 py-2.5 rounded-full disabled:opacity-50"
                style={{ background: C.purple }}
              >
                <Link2 size={15} />
                {busy === 'link' ? 'Linking…' : 'Link parent ticket'}
              </button>
            </div>

            <div className="border-t pt-4 mt-4" style={{ borderColor: C.border }}>
              <h4 className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: C.sub }}>
                Linked parents
              </h4>
              {!parentLinks.length ? (
                <p className="text-sm" style={{ color: C.sub }}>No parent tickets linked yet.</p>
              ) : (
                <ul className="space-y-3">
                  {parentLinks.map((link) => (
                    <li
                      key={link.id}
                      className="rounded-2xl border p-4"
                      style={{ borderColor: C.border }}
                    >
                      <div className="text-sm font-bold mb-0.5" style={{ color: C.ink }}>
                        {link.external_name || link.external_id}
                      </div>
                      <div className="text-xs mb-3" style={{ color: C.sub }}>
                        Initiative: {initiativeName(link.initiative_id)}
                        {link.last_synced_at
                          ? ` · Last sync ${new Date(link.last_synced_at).toLocaleString()} (${link.last_sync_direction || '—'})`
                          : ' · Not imported yet'}
                        {link.webhook_gid ? ' · Webhook on' : ' · Webhook off'}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={Boolean(busy)}
                          onClick={() => onImport(link.id)}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-white px-3 py-1.5 rounded-full disabled:opacity-50"
                          style={{ background: C.teal }}
                        >
                          <Download size={13} />
                          {busy === `import:${link.id}` ? 'Importing…' : 'Import subtasks'}
                        </button>
                        {link.external_url && (
                          <a
                            href={link.external_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-semibold px-3 py-1.5 rounded-full border no-underline"
                            style={{ borderColor: C.border, color: C.purple }}
                          >
                            Open in Asana
                          </a>
                        )}
                        <button
                          type="button"
                          disabled={Boolean(busy)}
                          onClick={() => onUnlink(link.id)}
                          className="text-xs font-semibold px-3 py-1.5 rounded-full disabled:opacity-50"
                          style={{ color: C.coral }}
                        >
                          Unlink
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>

      {/* Coming soon */}
      <div className="bg-white rounded-3xl border shadow-sm p-5 mb-4 opacity-70" style={{ borderColor: C.border }}>
        <h3 className="text-sm font-extrabold" style={{ ...HEAD, color: C.ink }}>Jira</h3>
        <p className="text-xs mt-1" style={{ color: C.sub }}>Coming next — same parent-ticket sync model once Asana is proven.</p>
      </div>
      <div className="bg-white rounded-3xl border shadow-sm p-5 opacity-70" style={{ borderColor: C.border }}>
        <h3 className="text-sm font-extrabold" style={{ ...HEAD, color: C.ink }}>Monday.com</h3>
        <p className="text-xs mt-1" style={{ color: C.sub }}>Coming after Jira — same generic tables and phases.</p>
      </div>

      {!activeWorkspaceId && connected && (
        <p className="text-xs mt-4" style={{ color: C.amber }}>
          Select a workspace to link Initiatives ({workspaces?.length || 0} available).
        </p>
      )}
    </div>
  );
}

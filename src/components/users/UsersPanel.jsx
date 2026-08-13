import { useCallback, useEffect, useState } from 'react';
import { UserPlus } from 'lucide-react';
import { C, HEAD, BODY, inputClass, inputStyle, tint, initials } from '../../lib/constants';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { Field, SaveRow } from '../ui/shared';
import Modal from '../ui/Modal';

export default function UsersPanel() {
  const { profile, session } = useAuth();
  const { workspaces } = useWorkspace();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [email, setEmail] = useState('');
  const [selectedWs, setSelectedWs] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!profile?.account_id) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const [{ data: users }, { data: members }] = await Promise.all([
      supabase
        .from('users')
        .select('id, email, full_name, role')
        .eq('account_id', profile.account_id)
        .order('created_at'),
      supabase
        .from('workspace_members')
        .select('user_id, workspace_id, workspaces(id, name)')
        .eq('account_id', profile.account_id),
    ]);

    const byUser = {};
    (members || []).forEach((m) => {
      if (!byUser[m.user_id]) byUser[m.user_id] = [];
      if (m.workspaces) byUser[m.user_id].push(m.workspaces.name);
    });

    setRows((users || []).map((u) => ({
      ...u,
      workspaceNames: u.role === 'owner'
        ? ['All workspaces']
        : (byUser[u.id] || []).sort(),
    })));
    setLoading(false);
  }, [profile?.account_id]);

  useEffect(() => { load(); }, [load]);

  const toggleWs = (id) => {
    setSelectedWs((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const invite = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const token = session?.access_token;
      if (!token) throw new Error('Not signed in');
      const res = await fetch('/api/invite-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email, workspaceIds: selectedWs }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invite failed');
      setModal(false);
      setEmail('');
      setSelectedWs([]);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 p-8 max-w-4xl w-full mx-auto overflow-y-auto" style={BODY}>
      <div className="flex items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-xl font-extrabold mb-1" style={{ ...HEAD, color: C.ink }}>Users</h2>
          <p className="text-sm" style={{ color: C.sub }}>
            People on your account and the workspaces they can access.
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setModal(true); setError(''); setSelectedWs(workspaces[0] ? [workspaces[0].id] : []); }}
          className="flex items-center gap-2 text-sm font-bold text-white px-4 py-2.5 rounded-full"
          style={{ background: C.purple }}
        >
          <UserPlus size={15} /> Invite user
        </button>
      </div>

      {loading ? (
        <p className="text-sm" style={{ color: C.sub }}>Loading…</p>
      ) : (
        <div className="bg-white rounded-3xl border shadow-sm overflow-hidden" style={{ borderColor: C.border }}>
          <div className="grid grid-cols-[1fr_120px_1.2fr] gap-3 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide border-b" style={{ color: C.sub, borderColor: C.border, background: C.bg }}>
            <div>User</div>
            <div>Role</div>
            <div>Workspaces</div>
          </div>
          {rows.map((u) => (
            <div
              key={u.id}
              className="grid grid-cols-[1fr_120px_1.2fr] gap-3 px-4 py-3 border-b items-center"
              style={{ borderColor: C.border }}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0" style={{ background: C.purple }}>
                  {initials(u.full_name || u.email)}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate" style={{ color: C.ink }}>{u.full_name || '—'}</div>
                  <div className="text-xs truncate" style={{ color: C.sub }}>{u.email}</div>
                </div>
              </div>
              <div>
                <span
                  className="text-[11px] font-bold px-2 py-1 rounded-full capitalize"
                  style={{ background: tint(u.role === 'owner' ? C.purple : C.teal, '18'), color: u.role === 'owner' ? C.purple : C.teal }}
                >
                  {u.role}
                </span>
              </div>
              <div className="text-xs" style={{ color: C.ink }}>
                {(u.workspaceNames || []).join(', ') || '—'}
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <Modal title="Invite user" onClose={() => setModal(false)}>
          <form onSubmit={invite}>
            <Field label="Email">
              <input
                type="email"
                required
                className={inputClass}
                style={inputStyle}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="colleague@company.com"
                autoFocus
              />
            </Field>
            <Field label="Workspace access">
              {workspaces.length === 0 ? (
                <p className="text-xs" style={{ color: C.sub }}>No workspaces available.</p>
              ) : (
                <div className="space-y-2">
                  {workspaces.map((w) => (
                    <label key={w.id} className="flex items-center gap-2 text-sm" style={{ color: C.ink }}>
                      <input
                        type="checkbox"
                        checked={selectedWs.includes(w.id)}
                        onChange={() => toggleWs(w.id)}
                      />
                      {w.name}
                    </label>
                  ))}
                </div>
              )}
            </Field>
            {error && <p className="text-xs mb-2" style={{ color: C.coral }}>{error}</p>}
            <SaveRow label={saving ? 'Sending invite…' : 'Invite'} disabled={saving} />
          </form>
        </Modal>
      )}
    </div>
  );
}

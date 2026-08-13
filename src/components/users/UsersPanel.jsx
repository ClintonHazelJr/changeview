import { useCallback, useEffect, useState } from 'react';
import { UserPlus, Mail } from 'lucide-react';
import { C, HEAD, BODY, inputClass, inputStyle, tint, initials } from '../../lib/constants';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { Field, SaveRow } from '../ui/shared';
import Modal from '../ui/Modal';

const ROLE_COLOR = { owner: C.purple, member: C.teal };

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
          className="flex items-center gap-2 text-sm font-bold text-white px-4 py-2.5 rounded-full shadow-sm"
          style={{ background: C.purple }}
        >
          <UserPlus size={15} /> Invite user
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-7">
        <div className="rounded-3xl p-4 text-white" style={{ background: C.purple }}>
          <div className="text-2xl font-extrabold" style={HEAD}>{rows.length}</div>
          <div className="text-xs font-medium opacity-90">Total users</div>
        </div>
        <div className="rounded-3xl p-4 text-white" style={{ background: C.teal }}>
          <div className="text-2xl font-extrabold" style={HEAD}>{rows.filter((u) => u.role === 'member').length}</div>
          <div className="text-xs font-medium opacity-90">Members</div>
        </div>
      </div>

      {loading ? (
        <p className="text-sm" style={{ color: C.sub }}>Loading…</p>
      ) : rows.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-3xl border border-dashed" style={{ borderColor: C.border }}>
          <div className="text-sm" style={{ color: C.sub }}>No users yet.</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {rows.map((u) => {
            const roleColor = ROLE_COLOR[u.role] || C.sub;
            return (
              <div
                key={u.id}
                className="bg-white rounded-2xl p-4 shadow-sm border flex items-start gap-3"
                style={{ borderColor: C.border }}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                  style={{ background: roleColor }}
                >
                  {initials(u.full_name || u.email)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <div className="text-sm font-bold truncate" style={{ color: C.ink }}>{u.full_name || '—'}</div>
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize shrink-0"
                      style={{ background: tint(roleColor, '20'), color: roleColor }}
                    >
                      {u.role}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs truncate mb-1.5" style={{ color: C.sub }}>
                    <Mail size={11} />{u.email}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(u.workspaceNames || []).map((name) => (
                      <span
                        key={name}
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: tint(C.teal, '16'), color: C.teal }}
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
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

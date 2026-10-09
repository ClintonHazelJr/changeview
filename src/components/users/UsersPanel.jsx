import { useCallback, useEffect, useMemo, useState } from 'react';
import { UserPlus, Mail, UserX, UserCheck, X } from 'lucide-react';
import { C, HEAD, BODY, inputClass, inputStyle, tint, initials } from '../../lib/constants';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { Field, SaveRow } from '../ui/shared';
import Modal from '../ui/Modal';
import ViewToggle from '../ui/ViewToggle';
import ListTable from '../ui/ListTable';
import StatusPill from '../ui/StatusPill';
import ShowInactiveToggle from '../ui/ShowInactiveToggle';

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
  const [actionError, setActionError] = useState('');
  const [saving, setSaving] = useState(false);
  const [busyUserId, setBusyUserId] = useState(null);
  const [viewMode, setViewMode] = useState('tiles');
  const [showInactive, setShowInactive] = useState(false);

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
        .select('id, email, full_name, role, is_active')
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
      if (m.workspaces) {
        byUser[m.user_id].push({
          id: m.workspace_id,
          name: m.workspaces.name,
        });
      }
    });

    setRows((users || []).map((u) => ({
      ...u,
      is_active: u.is_active !== false,
      workspaces: u.role === 'owner'
        ? [{ id: '__all', name: 'All workspaces' }]
        : (byUser[u.id] || []).sort((a, b) => a.name.localeCompare(b.name)),
    })));
    setLoading(false);
  }, [profile?.account_id]);

  useEffect(() => { load(); }, [load]);

  const toggleWs = (id) => {
    setSelectedWs((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const authHeaders = () => {
    const token = session?.access_token;
    if (!token) throw new Error('Not signed in');
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
  };

  const invite = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const res = await fetch('/api/invite-user', {
        method: 'POST',
        headers: authHeaders(),
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

  const setActive = async (userId, activate) => {
    setActionError('');
    setBusyUserId(userId);
    try {
      const res = await fetch(activate ? '/api/reactivate-user' : '/api/deactivate-user', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || (activate ? 'Reactivate failed' : 'Deactivate failed'));
      await load();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusyUserId(null);
    }
  };

  const removeFromWorkspace = async (userId, workspaceId, workspaceName) => {
    if (!window.confirm(`Remove this person from “${workspaceName}”? They keep access to any other workspaces.`)) {
      return;
    }
    setActionError('');
    setBusyUserId(userId);
    try {
      const { error: delErr } = await supabase
        .from('workspace_members')
        .delete()
        .eq('user_id', userId)
        .eq('workspace_id', workspaceId)
        .eq('account_id', profile.account_id);
      if (delErr) throw new Error(delErr.message);
      await load();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusyUserId(null);
    }
  };

  const activeCount = rows.filter((u) => u.is_active).length;
  const inactiveCount = rows.filter((u) => !u.is_active).length;
  const visibleRows = useMemo(
    () => (showInactive ? rows : rows.filter((u) => u.is_active)),
    [rows, showInactive],
  );

  const userColumns = [
    {
      key: 'full_name',
      label: 'Name',
      sortable: true,
      sortValue: (u) => u.full_name || u.email,
      render: (u) => (
        <span className="font-semibold">
          {u.full_name || '—'}
          {u.id === profile?.id ? ' (you)' : ''}
        </span>
      ),
    },
    { key: 'email', label: 'Email', sortable: true },
    {
      key: 'role',
      label: 'Role',
      sortable: true,
      render: (u) => <StatusPill label={u.role} color={ROLE_COLOR[u.role] || C.sub} />,
    },
    {
      key: 'is_active',
      label: 'Status',
      sortable: true,
      sortValue: (u) => (u.is_active ? 1 : 0),
      render: (u) => (
        <StatusPill
          label={u.is_active ? 'Active' : 'Inactive'}
          color={u.is_active ? C.green : C.sub}
        />
      ),
    },
    {
      key: 'workspaces',
      label: 'Workspaces',
      render: (u) => (u.workspaces || []).map((ws) => ws.name).join(', ') || '—',
    },
    {
      key: 'actions',
      label: '',
      render: (u) => {
        if (u.id === profile?.id) return null;
        const inactive = !u.is_active;
        const busy = busyUserId === u.id;
        return (
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (inactive) setActive(u.id, true);
              else if (window.confirm(`Deactivate ${u.full_name || u.email}? They will not be able to sign in until reactivated.`)) {
                setActive(u.id, false);
              }
            }}
            className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full disabled:opacity-50"
            style={{
              background: inactive ? tint(C.green, '18') : tint(C.coral, '18'),
              color: inactive ? C.green : C.coral,
            }}
          >
            {inactive ? <UserCheck size={12} /> : <UserX size={12} />}
            {busy ? '…' : inactive ? 'Reactivate' : 'Deactivate'}
          </button>
        );
      },
    },
  ];

  return (
    <div className="flex-1 p-8 max-w-4xl w-full mx-auto overflow-y-auto" style={BODY}>
      <div className="flex items-center justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1 flex-wrap">
            <h2 className="text-xl font-extrabold" style={{ ...HEAD, color: C.ink }}>Users</h2>
            {!loading && rows.length > 0 && (
              <ViewToggle value={viewMode} onChange={setViewMode} />
            )}
            <ShowInactiveToggle
              show={showInactive}
              onChange={setShowInactive}
              inactiveCount={inactiveCount}
            />
          </div>
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
          <div className="text-2xl font-extrabold" style={HEAD}>{activeCount}</div>
          <div className="text-xs font-medium opacity-90">Active</div>
        </div>
        <div className="rounded-3xl p-4 text-white" style={{ background: C.sub }}>
          <div className="text-2xl font-extrabold" style={HEAD}>{inactiveCount}</div>
          <div className="text-xs font-medium opacity-90">Inactive</div>
        </div>
        <div className="rounded-3xl p-4 text-white" style={{ background: C.amber }}>
          <div className="text-2xl font-extrabold" style={HEAD}>{rows.filter((u) => u.role === 'member').length}</div>
          <div className="text-xs font-medium opacity-90">Members</div>
        </div>
      </div>

      {actionError && (
        <div
          className="mb-4 text-sm rounded-2xl border px-4 py-3"
          style={{ borderColor: tint(C.coral, '40'), background: tint(C.coral, '12'), color: C.coral }}
        >
          {actionError}
        </div>
      )}

      {loading ? (
        <p className="text-sm" style={{ color: C.sub }}>Loading…</p>
      ) : rows.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-3xl border border-dashed" style={{ borderColor: C.border }}>
          <div className="text-sm" style={{ color: C.sub }}>No users yet.</div>
        </div>
      ) : visibleRows.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-3xl border border-dashed" style={{ borderColor: C.border }}>
          <div className="text-sm" style={{ color: C.sub }}>
            No active users. Turn on Show inactive to find and reactivate someone.
          </div>
        </div>
      ) : viewMode === 'list' ? (
        <ListTable columns={userColumns} rows={visibleRows} initialSortKey="full_name" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {visibleRows.map((u) => {
            const roleColor = ROLE_COLOR[u.role] || C.sub;
            const inactive = !u.is_active;
            const isSelf = u.id === profile?.id;
            const busy = busyUserId === u.id;
            return (
              <div
                key={u.id}
                className="bg-white rounded-2xl p-4 shadow-sm border flex items-start gap-3"
                style={{
                  borderColor: C.border,
                  opacity: inactive ? 0.72 : 1,
                  background: inactive ? tint(C.sub, '08') : '#fff',
                }}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                  style={{ background: inactive ? C.sub : roleColor }}
                >
                  {initials(u.full_name || u.email)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <div className="text-sm font-bold truncate" style={{ color: inactive ? C.sub : C.ink }}>
                      {u.full_name || '—'}
                      {isSelf ? ' (you)' : ''}
                    </div>
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize shrink-0"
                      style={{ background: tint(roleColor, '20'), color: roleColor }}
                    >
                      {u.role}
                    </span>
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                      style={{
                        background: inactive ? tint(C.sub, '22') : tint(C.green, '22'),
                        color: inactive ? C.sub : C.green,
                      }}
                    >
                      {inactive ? 'Inactive' : 'Active'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs truncate mb-1.5" style={{ color: C.sub }}>
                    <Mail size={11} />{u.email}
                  </div>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {(u.workspaces || []).map((ws) => (
                      <span
                        key={`${u.id}-${ws.id}`}
                        className="inline-flex items-center gap-1 text-[10px] font-semibold pl-2 pr-1 py-0.5 rounded-full"
                        style={{ background: tint(C.teal, '16'), color: C.teal }}
                      >
                        {ws.name}
                        {u.role !== 'owner' && ws.id !== '__all' && (
                          <button
                            type="button"
                            title={`Remove from ${ws.name}`}
                            disabled={busy}
                            onClick={() => removeFromWorkspace(u.id, ws.id, ws.name)}
                            className="p-0.5 rounded-full hover:bg-white/60 disabled:opacity-40"
                            style={{ color: C.sub }}
                          >
                            <X size={10} />
                          </button>
                        )}
                      </span>
                    ))}
                    {u.role !== 'owner' && (u.workspaces || []).length === 0 && (
                      <span className="text-[10px]" style={{ color: C.sub }}>No workspace access</span>
                    )}
                  </div>
                  {!isSelf && (
                    <div className="flex flex-wrap gap-2">
                      {inactive ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => setActive(u.id, true)}
                          className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full disabled:opacity-50"
                          style={{ background: tint(C.green, '18'), color: C.green }}
                        >
                          <UserCheck size={12} />
                          {busy ? 'Working…' : 'Reactivate'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => {
                            if (window.confirm(`Deactivate ${u.full_name || u.email}? They will not be able to sign in until reactivated.`)) {
                              setActive(u.id, false);
                            }
                          }}
                          className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full disabled:opacity-50"
                          style={{ background: tint(C.coral, '18'), color: C.coral }}
                        >
                          <UserX size={12} />
                          {busy ? 'Working…' : 'Deactivate'}
                        </button>
                      )}
                    </div>
                  )}
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

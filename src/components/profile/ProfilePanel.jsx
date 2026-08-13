import { useEffect, useState } from 'react';
import { LogOut, Trash2, AlertTriangle } from 'lucide-react';
import { C, HEAD, BODY, inputClass, inputStyle, initials, tint } from '../../lib/constants';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { Field, SaveRow } from '../ui/shared';
import Modal from '../ui/Modal';
import { FormWorkspace } from '../forms/AdminForms';

function ConfirmDeleteModal({
  title, description, confirmWord = 'DELETE', accountName = '', confirmLabel, busy, error, onClose, onConfirm,
}) {
  const [typed, setTyped] = useState('');
  const value = typed.trim();
  const canSubmit = (value === confirmWord || (accountName && value === accountName)) && !busy;
  const hint = accountName
    ? `Type ${confirmWord} or your account name (${accountName}) to confirm`
    : `Type ${confirmWord} to confirm`;

  return (
    <Modal title={title} onClose={busy ? () => {} : onClose}>
      <p className="text-sm mb-4 leading-relaxed" style={{ color: C.sub }}>{description}</p>
      <Field label={hint}>
        <input
          className={inputClass}
          style={inputStyle}
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder={confirmWord}
          autoFocus
          disabled={busy}
          autoComplete="off"
        />
      </Field>
      {error && <p className="text-xs mb-3" style={{ color: C.coral }}>{error}</p>}
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={onClose}
          className="text-sm font-semibold px-4 py-2 rounded-full"
          style={{ color: C.sub }}
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={!canSubmit}
          onClick={() => onConfirm(value)}
          className="text-sm font-bold text-white px-4 py-2 rounded-full disabled:opacity-40"
          style={{ background: C.coral }}
        >
          {busy ? 'Working…' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

export default function ProfilePanel() {
  const { profile, session, refreshProfile, signOut } = useAuth();
  const { workspaces, reload, createWorkspace } = useWorkspace();
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [memberWorkspaces, setMemberWorkspaces] = useState([]);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [dangerModal, setDangerModal] = useState(null);
  const [dangerBusy, setDangerBusy] = useState(false);
  const [dangerError, setDangerError] = useState('');
  const [showCreateWs, setShowCreateWs] = useState(false);
  const [wipeNotice, setWipeNotice] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordBusy, setPasswordBusy] = useState(false);
  const isOwner = profile?.role === 'owner';
  const accountName = profile?.accounts?.name || '';

  useEffect(() => {
    setFullName(profile?.full_name || '');
  }, [profile?.full_name]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!profile?.id || isOwner) {
        setMemberWorkspaces([]);
        return;
      }
      const { data, error: err } = await supabase
        .from('workspace_members')
        .select('workspace_id, workspaces(id, name)')
        .eq('user_id', profile.id);
      if (cancelled) return;
      if (err) {
        setError(err.message);
        return;
      }
      setMemberWorkspaces(
        (data || [])
          .map((row) => row.workspaces)
          .filter(Boolean)
          .sort((a, b) => a.name.localeCompare(b.name)),
      );
    })();
    return () => { cancelled = true; };
  }, [profile?.id, isOwner]);

  const handleSignOut = async () => {
    await signOut();
    window.location.href = '/';
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    const email = profile?.email || session?.user?.email;
    if (!email) {
      setPasswordError('Could not determine your email.');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }
    if (newPassword === currentPassword) {
      setPasswordError('New password must be different from your current password.');
      return;
    }

    setPasswordBusy(true);
    try {
      const { error: verifyErr } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      });
      if (verifyErr) {
        setPasswordError('Current password is incorrect');
        return;
      }

      const { error: updateErr } = await supabase.auth.updateUser({ password: newPassword });
      if (updateErr) throw updateErr;

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordSuccess('Password updated successfully.');
    } catch (err) {
      setPasswordError(err.message || 'Could not update password.');
    } finally {
      setPasswordBusy(false);
    }
  };

  const authHeaders = () => {
    const token = session?.access_token;
    if (!token) throw new Error('Not signed in');
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
  };

  const runDeleteData = async (confirm) => {
    setDangerBusy(true);
    setDangerError('');
    try {
      const res = await fetch('/api/delete-account-data', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ confirm }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not delete data');
      setDangerModal(null);
      setWipeNotice('All workspace data was deleted. Create a workspace to start again.');
      await reload();
      await refreshProfile();
      setShowCreateWs(true);
    } catch (err) {
      setDangerError(err.message);
    } finally {
      setDangerBusy(false);
    }
  };

  const runDeleteAccount = async (confirm) => {
    setDangerBusy(true);
    setDangerError('');
    try {
      const res = await fetch('/api/delete-account', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ confirm }),
      });
      const data = await res.json();
      if (!res.ok) {
        const detail = Array.isArray(data.banFailures) && data.banFailures.length
          ? ` (${data.banFailures.map((f) => f.message).join('; ')})`
          : '';
        throw new Error(`${data.error || 'Could not delete account'}${detail}`);
      }
      await signOut();
      window.location.href = '/?account=deleted';
    } catch (err) {
      setDangerError(err.message);
      setDangerBusy(false);
    }
  };

  const workspaceList = isOwner
    ? null
    : (memberWorkspaces.length ? memberWorkspaces : workspaces);

  return (
    <div className="flex-1 p-8 max-w-lg w-full mx-auto overflow-y-auto" style={BODY}>
      <h2 className="text-xl font-extrabold mb-1" style={{ ...HEAD, color: C.ink }}>Profile</h2>
      <p className="text-sm mb-6" style={{ color: C.sub }}>Your account details for this ChangeView tenancy.</p>

      {wipeNotice && (
        <div
          className="mb-4 text-sm rounded-2xl border px-4 py-3"
          style={{ borderColor: tint(C.amber, '50'), background: tint(C.amber, '16'), color: C.ink }}
        >
          {wipeNotice}
        </div>
      )}

      <div className="bg-white rounded-3xl border shadow-sm p-5 mb-4" style={{ borderColor: C.border }}>
        <div className="flex items-center gap-3 mb-5">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold text-white"
            style={{ background: C.purple }}
          >
            {initials(profile?.full_name || profile?.email)}
          </div>
          <div>
            <div className="text-sm font-bold" style={{ color: C.ink }}>{profile?.full_name || '—'}</div>
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: tint(C.purple, '18'), color: C.purple }}
            >
              {isOwner ? 'Owner' : 'Member'}
            </span>
          </div>
        </div>

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setError('');
            setSaved(false);
            const trimmed = fullName.trim();
            if (!trimmed) {
              setError('Full name is required.');
              return;
            }
            const { error: err } = await supabase
              .from('users')
              .update({ full_name: trimmed })
              .eq('id', profile.id);
            if (err) {
              setError(err.message);
              return;
            }
            await refreshProfile();
            setSaved(true);
          }}
        >
          <Field label="Full name">
            <input
              className={inputClass}
              style={inputStyle}
              value={fullName}
              onChange={(e) => { setFullName(e.target.value); setSaved(false); }}
            />
          </Field>
          <Field label="Email">
            <input
              className={inputClass}
              style={{ ...inputStyle, background: C.bg }}
              value={profile?.email || ''}
              readOnly
              disabled
            />
          </Field>
          {accountName && (
            <Field label="Account">
              <input
                className={inputClass}
                style={{ ...inputStyle, background: C.bg }}
                value={accountName}
                readOnly
                disabled
              />
            </Field>
          )}
          <Field label="Workspaces">
            {isOwner ? (
              <p className="text-sm" style={{ color: C.ink }}>
                {workspaces.length === 0
                  ? 'No workspaces — create one to continue.'
                  : 'All workspaces (Owner)'}
              </p>
            ) : !workspaceList?.length ? (
              <p className="text-sm" style={{ color: C.sub }}>No workspace memberships found.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {workspaceList.map((w) => (
                  <span
                    key={w.id || w}
                    className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                    style={{ background: tint(C.teal, '18'), color: C.teal }}
                  >
                    {w.name || w}
                  </span>
                ))}
              </div>
            )}
          </Field>
          {error && <p className="text-xs mb-2" style={{ color: C.coral }}>{error}</p>}
          {saved && !error && <p className="text-xs mb-2" style={{ color: C.green }}>Saved.</p>}
          <SaveRow label="Save name" />
        </form>
      </div>

      <div className="bg-white rounded-3xl border shadow-sm p-5 mb-4" style={{ borderColor: C.border }}>
        <h3 className="text-sm font-extrabold mb-1" style={{ ...HEAD, color: C.ink }}>Change password</h3>
        <p className="text-xs mb-4" style={{ color: C.sub }}>
          Enter your current password, then choose a new one (at least 8 characters).
        </p>
        <form onSubmit={handleChangePassword}>
          <Field label="Current password">
            <input
              type="password"
              required
              autoComplete="current-password"
              className={inputClass}
              style={inputStyle}
              value={currentPassword}
              onChange={(e) => { setCurrentPassword(e.target.value); setPasswordError(''); setPasswordSuccess(''); }}
            />
          </Field>
          <Field label="New password">
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className={inputClass}
              style={inputStyle}
              value={newPassword}
              onChange={(e) => { setNewPassword(e.target.value); setPasswordError(''); setPasswordSuccess(''); }}
            />
          </Field>
          <Field label="Confirm new password">
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className={inputClass}
              style={inputStyle}
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setPasswordError(''); setPasswordSuccess(''); }}
            />
          </Field>
          {passwordError && <p className="text-xs mb-2" style={{ color: C.coral }}>{passwordError}</p>}
          {passwordSuccess && !passwordError && (
            <p className="text-xs mb-2" style={{ color: C.green }}>{passwordSuccess}</p>
          )}
          <SaveRow label={passwordBusy ? 'Updating…' : 'Update password'} disabled={passwordBusy} />
        </form>
      </div>

      <button
        type="button"
        onClick={handleSignOut}
        className="flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-2xl border bg-white mb-8"
        style={{ color: C.coral, borderColor: C.border }}
      >
        <LogOut size={15} /> Sign out
      </button>

      {isOwner && (
        <section className="rounded-3xl border p-5" style={{ borderColor: tint(C.coral, '45'), background: tint(C.coral, '08') }}>
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={16} style={{ color: C.coral }} />
            <h3 className="text-sm font-extrabold" style={{ ...HEAD, color: C.ink }}>Danger zone</h3>
          </div>
          <p className="text-xs mb-5" style={{ color: C.sub }}>
            These actions are permanent for your data. Deleting the account also cancels billing.
          </p>

          <div className="bg-white rounded-2xl border p-4 mb-3" style={{ borderColor: C.border }}>
            <div className="text-sm font-bold mb-1" style={{ color: C.ink }}>Delete all data</div>
            <p className="text-xs mb-3" style={{ color: C.sub }}>
              Removes every Workspace and everything under it. Keeps your login and subscription so you can start fresh.
            </p>
            <button
              type="button"
              onClick={() => { setDangerError(''); setDangerModal('data'); }}
              className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-full border"
              style={{ color: C.coral, borderColor: tint(C.coral, '55'), background: tint(C.coral, '12') }}
            >
              <Trash2 size={13} /> Delete all data
            </button>
          </div>

          <div className="bg-white rounded-2xl border p-4" style={{ borderColor: tint(C.coral, '40') }}>
            <div className="text-sm font-bold mb-1" style={{ color: C.coral }}>Delete account</div>
            <p className="text-xs mb-3" style={{ color: C.sub }}>
              Cancels billing, blocks every user on this account from logging in, and permanently removes all data.
              The account record is retained briefly for support recovery.
            </p>
            <button
              type="button"
              onClick={() => { setDangerError(''); setDangerModal('account'); }}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-white px-3 py-2 rounded-full"
              style={{ background: C.coral }}
            >
              <Trash2 size={13} /> Delete account
            </button>
          </div>
        </section>
      )}

      {dangerModal === 'data' && (
        <ConfirmDeleteModal
          title="Delete all data"
          description="This permanently deletes every Workspace and all Programs, Initiatives, Impacts, Requirements, Tasks, and related records. Your login and subscription stay active."
          accountName={accountName}
          confirmLabel="Delete all data"
          busy={dangerBusy}
          error={dangerError}
          onClose={() => setDangerModal(null)}
          onConfirm={runDeleteData}
        />
      )}

      {dangerModal === 'account' && (
        <ConfirmDeleteModal
          title="Delete account"
          description="This will: (1) cancel your Stripe subscription, (2) block every user on this account from logging in, and (3) permanently delete all workspace data."
          accountName={accountName}
          confirmLabel="Delete account forever"
          busy={dangerBusy}
          error={dangerError}
          onClose={() => setDangerModal(null)}
          onConfirm={runDeleteAccount}
        />
      )}

      {showCreateWs && (
        <Modal title="Create a workspace" onClose={() => setShowCreateWs(false)}>
          <FormWorkspace
            onSave={async (name) => {
              await createWorkspace(name);
              setShowCreateWs(false);
              setWipeNotice('');
            }}
          />
        </Modal>
      )}
    </div>
  );
}

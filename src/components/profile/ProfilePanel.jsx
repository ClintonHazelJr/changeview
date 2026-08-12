import { useEffect, useState } from 'react';
import { LogOut } from 'lucide-react';
import { C, HEAD, BODY, inputClass, inputStyle, initials } from '../../lib/constants';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { Field, SaveRow } from '../ui/shared';

export default function ProfilePanel() {
  const { profile, refreshProfile, signOut } = useAuth();
  const { workspaces } = useWorkspace();
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [memberWorkspaces, setMemberWorkspaces] = useState([]);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const isOwner = profile?.role === 'owner';

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

  return (
    <div className="flex-1 p-8 max-w-xl w-full mx-auto overflow-y-auto" style={BODY}>
      <div className="flex items-center gap-4 mb-6">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold text-white"
          style={{ background: C.purple }}
        >
          {initials(profile?.full_name || profile?.email)}
        </div>
        <div>
          <h2 className="text-xl font-extrabold" style={{ ...HEAD, color: C.ink }}>Profile</h2>
          <p className="text-sm" style={{ color: C.sub }}>Your account details for this ChangeView tenancy.</p>
        </div>
      </div>

      <form
        className="bg-white rounded-3xl border p-5 shadow-sm"
        style={{ borderColor: C.border }}
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
        <Field label="Role">
          <input
            className={inputClass}
            style={{ ...inputStyle, background: C.bg }}
            value={isOwner ? 'Owner' : 'Member'}
            readOnly
            disabled
          />
        </Field>
        <Field label="Workspaces">
          {isOwner ? (
            <p className="text-sm" style={{ color: C.ink }}>All workspaces (Owner)</p>
          ) : memberWorkspaces.length === 0 ? (
            <p className="text-sm" style={{ color: C.sub }}>
              {workspaces.length ? workspaces.map((w) => w.name).join(', ') : 'No workspace memberships found.'}
            </p>
          ) : (
            <ul className="text-sm space-y-1" style={{ color: C.ink }}>
              {memberWorkspaces.map((w) => (
                <li key={w.id}>{w.name}</li>
              ))}
            </ul>
          )}
        </Field>
        {error && <p className="text-xs mb-2" style={{ color: C.coral }}>{error}</p>}
        {saved && !error && <p className="text-xs mb-2" style={{ color: C.green }}>Saved.</p>}
        <SaveRow label="Save name" />
      </form>

      <button
        type="button"
        onClick={handleSignOut}
        className="mt-6 flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-2xl border"
        style={{ color: C.coral, borderColor: C.border, background: '#fff' }}
      >
        <LogOut size={15} /> Sign out
      </button>
    </div>
  );
}

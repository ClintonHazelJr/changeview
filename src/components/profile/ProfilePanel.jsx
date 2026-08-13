import { useEffect, useState } from 'react';
import { LogOut } from 'lucide-react';
import { C, HEAD, BODY, inputClass, inputStyle, initials, tint } from '../../lib/constants';
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

  const workspaceList = isOwner
    ? null
    : (memberWorkspaces.length ? memberWorkspaces : workspaces);

  return (
    <div className="flex-1 p-8 max-w-lg w-full mx-auto overflow-y-auto" style={BODY}>
      <h2 className="text-xl font-extrabold mb-1" style={{ ...HEAD, color: C.ink }}>Profile</h2>
      <p className="text-sm mb-6" style={{ color: C.sub }}>Your account details for this ChangeView tenancy.</p>

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
          <Field label="Workspaces">
            {isOwner ? (
              <p className="text-sm" style={{ color: C.ink }}>All workspaces (Owner)</p>
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

      <button
        type="button"
        onClick={handleSignOut}
        className="flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-2xl border bg-white"
        style={{ color: C.coral, borderColor: C.border }}
      >
        <LogOut size={15} /> Sign out
      </button>
    </div>
  );
}

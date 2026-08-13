import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { C, HEAD, BODY, inputClass, inputStyle } from '../lib/constants';
import { supabase } from '../lib/supabase';

function readInviteTokens() {
  const hash = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : '';
  const fromHash = new URLSearchParams(hash);
  const fromQuery = new URLSearchParams(window.location.search);

  const access_token = fromHash.get('access_token') || fromQuery.get('access_token');
  const refresh_token = fromHash.get('refresh_token') || fromQuery.get('refresh_token');
  const type = fromHash.get('type') || fromQuery.get('type');

  return { access_token, refresh_token, type };
}

export default function AcceptInvitePage() {
  const navigate = useNavigate();
  const [bootstrapping, setBootstrapping] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setError('');
      try {
        const { access_token, refresh_token } = readInviteTokens();

        if (access_token && refresh_token) {
          const { data, error: sessionErr } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });
          if (sessionErr) throw sessionErr;
          if (!cancelled) {
            setEmail(data.session?.user?.email || '');
            setReady(true);
          }
          window.history.replaceState({}, document.title, '/accept-invite');
        } else {
          // detectSessionInUrl may already have established a session
          const { data: { session }, error: getErr } = await supabase.auth.getSession();
          if (getErr) throw getErr;
          if (!session) {
            throw new Error('This invite link is invalid or has expired. Ask your admin to send a new invite.');
          }
          if (!cancelled) {
            setEmail(session.user?.email || '');
            setReady(true);
          }
          window.history.replaceState({}, document.title, '/accept-invite');
        }
      } catch (err) {
        if (!cancelled) setError(err.message || 'Could not accept invite.');
      } finally {
        if (!cancelled) setBootstrapping(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setSaving(true);
    try {
      const { error: updateErr } = await supabase.auth.updateUser({ password });
      if (updateErr) throw updateErr;
      navigate('/app', { replace: true });
    } catch (err) {
      setError(err.message || 'Could not set password.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ ...BODY, background: C.bg }}>
      <div className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-md border" style={{ borderColor: C.border }}>
        <h1 className="text-2xl font-extrabold mb-1" style={{ ...HEAD, color: C.ink }}>Accept invite</h1>
        <p className="text-sm mb-6" style={{ color: C.sub }}>
          {email
            ? `Set a password for ${email} to finish joining ChangeView.`
            : 'Set a password to finish joining your team on ChangeView.'}
        </p>

        {bootstrapping ? (
          <p className="text-sm" style={{ color: C.sub }}>Validating invite…</p>
        ) : !ready ? (
          <>
            {error && <p className="text-xs mb-4" style={{ color: C.coral }}>{error}</p>}
            <p className="text-xs" style={{ color: C.sub }}>
              Already have a password? <Link to="/login" style={{ color: C.purple }}>Log in</Link>
            </p>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: C.sub }}>New password</label>
            <input
              type="password"
              required
              autoFocus
              minLength={8}
              className={`${inputClass} mb-4`}
              style={inputStyle}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
            />
            <label className="block text-xs font-semibold mb-1.5" style={{ color: C.sub }}>Confirm password</label>
            <input
              type="password"
              required
              minLength={8}
              className={`${inputClass} mb-4`}
              style={inputStyle}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
            {error && <p className="text-xs mb-3" style={{ color: C.coral }}>{error}</p>}
            <button
              type="submit"
              disabled={saving}
              className="w-full text-sm font-bold text-white py-3 rounded-full disabled:opacity-60"
              style={{ background: C.purple }}
            >
              {saving ? 'Saving…' : 'Set password & continue'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

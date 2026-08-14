import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { C, HEAD, BODY, inputClass, inputStyle } from '../lib/constants';
import { supabase } from '../lib/supabase';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!cancelled) {
        if (!session) setError('Open the password reset link from your email to continue.');
        else setReady(true);
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
      setError(err.message || 'Could not update password.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ ...BODY, background: C.bg }}>
      <div className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-md border" style={{ borderColor: C.border }}>
        <h1 className="text-2xl font-extrabold mb-1" style={{ ...HEAD, color: C.ink }}>Set a new password</h1>
        <p className="text-sm mb-6" style={{ color: C.sub }}>Choose a password for your ChangeView account.</p>
        {error && !ready ? (
          <>
            <p className="text-sm mb-4" style={{ color: C.coral }}>{error}</p>
            <Link to="/login" className="text-sm font-bold" style={{ color: C.purple }}>Back to login</Link>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: C.sub }}>New password</label>
            <input
              type="password"
              required
              minLength={8}
              className={`${inputClass} mb-4`}
              style={inputStyle}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
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
              disabled={!ready || saving}
              className="w-full text-sm font-bold text-white py-3 rounded-full disabled:opacity-50"
              style={{ background: C.purple }}
            >
              {saving ? 'Saving…' : 'Update password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

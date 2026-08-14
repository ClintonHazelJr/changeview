import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { C, HEAD, BODY, inputClass, inputStyle } from '../lib/constants';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const { signIn, resetPassword, session, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [mode, setMode] = useState('login');
  const [busy, setBusy] = useState(false);

  if (loading) return null;
  if (session) return <Navigate to="/app" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setBusy(true);
    try {
      if (mode === 'reset') {
        await resetPassword(email);
        setInfo('Check your email for a password reset link.');
      } else {
        await signIn({ email, password });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ ...BODY, background: C.bg }}>
      <Link
        to="/"
        className="font-extrabold text-xl tracking-tight no-underline mb-5"
        style={{ ...HEAD, color: C.ink }}
      >
        ChangeView
      </Link>
      <div className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-md border" style={{ borderColor: C.border }}>
        <h1 className="text-2xl font-extrabold mb-1" style={{ ...HEAD, color: C.ink }}>
          {mode === 'reset' ? 'Reset password' : 'Welcome back'}
        </h1>
        <p className="text-sm mb-6" style={{ color: C.sub }}>
          {mode === 'reset'
            ? 'We will email you a link to choose a new password.'
            : 'Log in to ChangeView'}
        </p>
        <form onSubmit={handleSubmit}>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: C.sub }}>Email</label>
          <input
            type="email"
            required
            className={`${inputClass} mb-4`}
            style={inputStyle}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {mode === 'login' && (
            <>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: C.sub }}>Password</label>
              <input
                type="password"
                required
                className={`${inputClass} mb-2`}
                style={inputStyle}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <div className="mb-4 text-right">
                <button
                  type="button"
                  onClick={() => { setMode('reset'); setError(''); setInfo(''); }}
                  className="text-xs font-semibold"
                  style={{ color: C.purple }}
                >
                  Forgot password?
                </button>
              </div>
            </>
          )}
          {error && <p className="text-xs mb-3" style={{ color: C.coral }}>{error}</p>}
          {info && <p className="text-xs mb-3" style={{ color: C.green }}>{info}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full text-sm font-bold text-white py-3 rounded-full disabled:opacity-50"
            style={{ background: C.purple }}
          >
            {busy ? 'Please wait…' : mode === 'reset' ? 'Send reset link' : 'Log in'}
          </button>
        </form>
        <p className="text-xs text-center mt-4" style={{ color: C.sub }}>
          {mode === 'reset' ? (
            <button
              type="button"
              onClick={() => { setMode('login'); setError(''); setInfo(''); }}
              className="font-semibold"
              style={{ color: C.purple }}
            >
              Back to login
            </button>
          ) : (
            <>
              No account? <Link to="/signup" style={{ color: C.purple }}>Sign up</Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
}

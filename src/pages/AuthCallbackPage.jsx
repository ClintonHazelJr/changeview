import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { C, HEAD, BODY } from '../lib/constants';
import { supabase } from '../lib/supabase';

function readHashParams() {
  const hash = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : '';
  return new URLSearchParams(hash);
}

/**
 * Handles Supabase Auth email redirects (confirm signup, recovery, etc.).
 * Implicit flow: tokens arrive in the URL hash (same as /accept-invite).
 * Never call exchangeCodeForSession — that requires a same-browser PKCE verifier.
 */
export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const hash = readHashParams();
        const tokenHash = params.get('token_hash');
        const typeFromQuery = params.get('type');
        const typeFromHash = hash.get('type');
        const type = typeFromQuery || typeFromHash || '';
        const next = params.get('next') || '';
        const access_token = hash.get('access_token');
        const refresh_token = hash.get('refresh_token');
        const hasPkceCode = Boolean(params.get('code'));

        if (access_token && refresh_token) {
          const { error: sessionErr } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });
          if (sessionErr) throw sessionErr;
        } else if (tokenHash && type) {
          const { error: otpErr } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type,
          });
          if (otpErr) throw otpErr;
        } else if (hasPkceCode) {
          throw new Error(
            'This confirmation link is from an older signup format and cannot be completed in this browser. Sign up again (or request a new confirmation email) so a fresh link is sent.',
          );
        } else {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
            throw new Error('This link is invalid or has expired. Try signing in again.');
          }
        }

        if (cancelled) return;

        // Clear tokens from the address bar.
        window.history.replaceState({}, document.title, '/auth/callback');

        if (type === 'invite' || next === '/accept-invite') {
          navigate('/accept-invite', { replace: true });
          return;
        }
        if (type === 'recovery' || next === '/reset-password') {
          navigate('/reset-password', { replace: true });
          return;
        }
        navigate(next && next.startsWith('/') ? next : '/app', { replace: true });
      } catch (err) {
        if (!cancelled) setError(err.message || 'Could not complete sign-in from email link.');
      }
    })();

    return () => { cancelled = true; };
  }, [navigate, params]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ ...BODY, background: C.bg }}>
        <div className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-md border text-center" style={{ borderColor: C.border }}>
          <h1 className="text-xl font-extrabold mb-2" style={{ ...HEAD, color: C.ink }}>Link problem</h1>
          <p className="text-sm mb-4" style={{ color: C.coral }}>{error}</p>
          <Link to="/login" className="text-sm font-bold" style={{ color: C.purple }}>Go to login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ ...BODY, background: C.bg }}>
      <div className="text-sm" style={{ color: C.sub }}>Signing you in…</div>
    </div>
  );
}

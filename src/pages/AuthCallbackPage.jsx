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
 * Invites should use /accept-invite directly; this still routes invite type there.
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
        const code = params.get('code');
        const tokenHash = params.get('token_hash');
        const typeFromQuery = params.get('type');
        const typeFromHash = hash.get('type');
        const type = typeFromQuery || typeFromHash || '';
        const next = params.get('next') || '';
        const access_token = hash.get('access_token');
        const refresh_token = hash.get('refresh_token');

        // Prefer implicit-flow hash tokens (works across browsers/devices).
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
        } else if (code) {
          // Legacy PKCE links may still arrive; try exchange, then fail clearly.
          const { error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeErr) {
            throw new Error(
              exchangeErr.message?.includes('PKCE') || exchangeErr.message?.includes('verifier')
                ? 'This confirmation link needs to be opened again. Request a new email, or use the link in the same browser where you signed up.'
                : exchangeErr.message,
            );
          }
        } else {
          // detectSessionInUrl may already have established a session from the hash
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

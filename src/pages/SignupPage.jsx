import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { C, HEAD, BODY, PLAN_LABELS, inputClass, inputStyle } from '../lib/constants';
import { useAuth } from '../contexts/AuthContext';
import { rememberCheckoutIntent, startCheckout } from '../lib/checkout';

const VALID_PLANS = new Set(['solo', 'small', 'enterprise']);

export default function SignupPage() {
  const { signUp, signOut, session, loading } = useAuth();
  const [params] = useSearchParams();
  const planParam = String(params.get('plan') || 'solo').toLowerCase();
  const billingParam = String(params.get('billing') || 'monthly').toLowerCase();
  const planTier = VALID_PLANS.has(planParam) ? planParam : 'solo';
  const billingCycle = planTier === 'solo' ? 'monthly' : (billingParam === 'annual' ? 'annual' : 'monthly');
  const checkoutCancelled = params.get('checkout') === 'cancelled';

  const [fullName, setFullName] = useState('');
  const [accountName, setAccountName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Capture whether the user was already signed in when this page loaded (pricing card while logged in).
  const arrivedLoggedIn = useRef(null);
  const autoCheckoutStarted = useRef(false);

  useEffect(() => {
    rememberCheckoutIntent(planTier, billingCycle);
  }, [planTier, billingCycle]);

  useEffect(() => {
    if (loading) return;
    if (arrivedLoggedIn.current === null) {
      arrivedLoggedIn.current = Boolean(session);
    }
  }, [loading, session]);

  // Logged-in visit from a pricing card: checkout that card's tier (do not dump into /app Solo gate).
  useEffect(() => {
    if (loading || !arrivedLoggedIn.current || !session?.access_token) return;
    if (autoCheckoutStarted.current) return;
    autoCheckoutStarted.current = true;
    setBusy(true);
    setError('');
    startCheckout(planTier, billingCycle, {
      accessToken: session.access_token,
      email: session.user?.email,
      afterSignup: false,
    }).catch((err) => {
      setError(err.message || 'Could not start checkout');
      setBusy(false);
    });
  }, [loading, session?.access_token, session?.user?.email, planTier, billingCycle]);

  if (loading) return null;

  const brandLink = (
    <Link
      to="/"
      className="font-extrabold text-xl tracking-tight no-underline mb-5"
      style={{ ...HEAD, color: C.ink }}
    >
      ChangeView
    </Link>
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    rememberCheckoutIntent(planTier, billingCycle);
    try {
      const data = await signUp({
        email, password, fullName, accountName, planTier, billingCycle,
      });
      // Account/workspace provision via trigger; checkout must not wait on email confirm.
      await startCheckout(planTier, billingCycle, {
        accessToken: data.session?.access_token,
        email,
        afterSignup: true,
      });
      // If a session was created (confirm-email disabled), drop it so app access stays gated.
      if (data.session) {
        try { await signOut(); } catch { /* ignore */ }
      }
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  if (busy) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ ...BODY, background: C.bg }}>
        {brandLink}
        <div className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-md border text-center" style={{ borderColor: C.border }}>
          <h1 className="text-xl font-extrabold mb-2" style={{ ...HEAD, color: C.ink }}>Redirecting to checkout…</h1>
          <p className="text-sm" style={{ color: C.sub }}>
            Plan: {PLAN_LABELS[planTier] || planTier}
            {billingCycle === 'annual' ? ' · annual' : ' · monthly'}
          </p>
          {error && (
            <p className="text-sm mt-3" style={{ color: C.coral }}>{error}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ ...BODY, background: C.bg }}>
      {brandLink}
      <div className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-md border" style={{ borderColor: C.border }}>
        <h1 className="text-2xl font-extrabold mb-1" style={{ ...HEAD, color: C.ink }}>Start your 7-day free trial</h1>
        <p className="text-sm mb-2" style={{ color: C.sub }}>
          Card required — you will not be charged until the trial ends. Full Enterprise access during the trial.
        </p>
        <p className="text-xs font-semibold mb-6" style={{ color: C.purple }}>
          Plan: {PLAN_LABELS[planTier] || planTier}
          {billingCycle === 'annual' ? ' · billed annually after trial' : ' · billed monthly after trial'}
        </p>
        {checkoutCancelled && (
          <p className="text-xs mb-4" style={{ color: C.coral }}>
            Checkout was cancelled. Submit again when you&apos;re ready to add a card and start the trial.
          </p>
        )}
        <form onSubmit={handleSubmit}>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: C.sub }}>Full name</label>
          <input required className={`${inputClass} mb-4`} style={inputStyle} value={fullName} onChange={(e) => setFullName(e.target.value)} />
          <label className="block text-xs font-semibold mb-1.5" style={{ color: C.sub }}>Account name</label>
          <input className={`${inputClass} mb-4`} style={inputStyle} value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder="e.g. Acme Consulting" />
          <label className="block text-xs font-semibold mb-1.5" style={{ color: C.sub }}>Email</label>
          <input type="email" required className={`${inputClass} mb-4`} style={inputStyle} value={email} onChange={(e) => setEmail(e.target.value)} />
          <label className="block text-xs font-semibold mb-1.5" style={{ color: C.sub }}>Password</label>
          <input type="password" required minLength={6} className={`${inputClass} mb-4`} style={inputStyle} value={password} onChange={(e) => setPassword(e.target.value)} />
          {error && <p className="text-xs mb-3" style={{ color: C.coral }}>{error}</p>}
          <button type="submit" disabled={busy} className="w-full text-sm font-bold text-white py-3 rounded-full disabled:opacity-50" style={{ background: C.purple }}>
            Continue to checkout
          </button>
        </form>
        <p className="text-xs text-center mt-4" style={{ color: C.sub }}>
          Already have an account? <Link to="/login" style={{ color: C.purple }}>Log in</Link>
        </p>
      </div>
    </div>
  );
}

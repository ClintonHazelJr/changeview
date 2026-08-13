import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { C, HEAD, BODY, PLAN_LABELS, inputClass, inputStyle } from '../lib/constants';
import { useAuth } from '../contexts/AuthContext';

const VALID_PLANS = new Set(['solo', 'small', 'enterprise']);

export default function SignupPage() {
  const { signUp, session, loading } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const planParam = String(params.get('plan') || 'solo').toLowerCase();
  const billingParam = String(params.get('billing') || 'monthly').toLowerCase();
  const planTier = VALID_PLANS.has(planParam) ? planParam : 'solo';
  const billingCycle = planTier === 'solo' ? 'monthly' : (billingParam === 'annual' ? 'annual' : 'monthly');

  const [fullName, setFullName] = useState('');
  const [accountName, setAccountName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (loading) return null;
  if (session) return <Navigate to="/app" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const data = await signUp({
        email, password, fullName, accountName, planTier, billingCycle,
      });
      if (data.session) {
        navigate('/app');
        return;
      }
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ ...BODY, background: C.bg }}>
        <div className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-md border text-center" style={{ borderColor: C.border }}>
          <h1 className="text-xl font-extrabold mb-2" style={{ ...HEAD, color: C.ink }}>Check your email</h1>
          <p className="text-sm mb-4" style={{ color: C.sub }}>We sent a confirmation link to {email}. Once confirmed, log in to start your trial.</p>
          <Link to="/login" className="text-sm font-bold" style={{ color: C.purple }}>Go to login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ ...BODY, background: C.bg }}>
      <div className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-md border" style={{ borderColor: C.border }}>
        <h1 className="text-2xl font-extrabold mb-1" style={{ ...HEAD, color: C.ink }}>Start your 7-day free trial</h1>
        <p className="text-sm mb-2" style={{ color: C.sub }}>
          No credit card required. Full access while you try ChangeView.
        </p>
        <p className="text-xs font-semibold mb-6" style={{ color: C.purple }}>
          Plan: {PLAN_LABELS[planTier] || planTier}
          {billingCycle === 'annual' ? ' · billed annually after trial' : ' · billed monthly after trial'}
        </p>
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
          <button type="submit" className="w-full text-sm font-bold text-white py-3 rounded-full" style={{ background: C.purple }}>
            Start free trial
          </button>
        </form>
        <p className="text-xs text-center mt-4" style={{ color: C.sub }}>
          Already have an account? <Link to="/login" style={{ color: C.purple }}>Log in</Link>
        </p>
      </div>
    </div>
  );
}

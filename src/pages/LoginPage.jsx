import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { C, HEAD, BODY, inputClass, inputStyle } from '../lib/constants';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const { signIn, session, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (loading) return null;
  if (session) return <Navigate to="/app" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await signIn({ email, password });
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ ...BODY, background: C.bg }}>
      <div className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-md border" style={{ borderColor: C.border }}>
        <h1 className="text-2xl font-extrabold mb-1" style={{ ...HEAD, color: C.ink }}>Welcome back</h1>
        <p className="text-sm mb-6" style={{ color: C.sub }}>Log in to ChangeView</p>
        <form onSubmit={handleSubmit}>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: C.sub }}>Email</label>
          <input type="email" required className={`${inputClass} mb-4`} style={inputStyle} value={email} onChange={(e) => setEmail(e.target.value)} />
          <label className="block text-xs font-semibold mb-1.5" style={{ color: C.sub }}>Password</label>
          <input type="password" required className={`${inputClass} mb-4`} style={inputStyle} value={password} onChange={(e) => setPassword(e.target.value)} />
          {error && <p className="text-xs mb-3" style={{ color: C.coral }}>{error}</p>}
          <button type="submit" className="w-full text-sm font-bold text-white py-3 rounded-full" style={{ background: C.purple }}>Log in</button>
        </form>
        <p className="text-xs text-center mt-4" style={{ color: C.sub }}>
          No account? <Link to="/signup" style={{ color: C.purple }}>Sign up</Link>
        </p>
      </div>
    </div>
  );
}

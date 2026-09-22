import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { C, HEAD, BODY, inputClass, inputStyle } from '../lib/constants';

export default function CheckEmailPage() {
  const [params] = useSearchParams();
  const checkoutOk = params.get('checkout') === 'success';
  const emailFromQuery = useMemo(
    () => String(params.get('email') || '').trim().toLowerCase(),
    [params],
  );

  const [showFix, setShowFix] = useState(false);
  const [originalEmail, setOriginalEmail] = useState(emailFromQuery);
  const [correctedEmail, setCorrectedEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [displayEmail, setDisplayEmail] = useState(emailFromQuery);

  const handleFix = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setBusy(true);
    try {
      const res = await fetch('/api/fix-signup-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalEmail: originalEmail.trim(),
          correctedEmail: correctedEmail.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not update email');
      setDisplayEmail(data.email || correctedEmail.trim().toLowerCase());
      setOriginalEmail(data.email || correctedEmail.trim().toLowerCase());
      setCorrectedEmail('');
      setShowFix(false);
      setInfo(data.message || 'Confirmation email sent to your corrected address.');
    } catch (err) {
      setError(err.message || 'Could not update email');
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
        <h1 className="text-xl font-extrabold mb-2" style={{ ...HEAD, color: C.ink }}>
          {checkoutOk ? 'You\'re almost in' : 'Check your email'}
        </h1>
        <p className="text-sm mb-4" style={{ color: C.sub }}>
          {checkoutOk
            ? 'Checkout is complete and your trial is ready. Confirm your email to log in — you will not be charged until the trial ends.'
            : 'Confirm your email to finish setting up your account, then log in.'}
          {displayEmail ? (
            <>
              {' '}We sent a confirmation link to <strong style={{ color: C.ink }}>{displayEmail}</strong>.
            </>
          ) : null}
        </p>

        {info && <p className="text-xs mb-3" style={{ color: C.green }}>{info}</p>}
        {error && <p className="text-xs mb-3" style={{ color: C.coral }}>{error}</p>}

        {!showFix ? (
          <button
            type="button"
            className="text-sm font-bold mb-5"
            style={{ color: C.purple }}
            onClick={() => {
              setShowFix(true);
              setError('');
              setInfo('');
              if (!originalEmail && displayEmail) setOriginalEmail(displayEmail);
            }}
          >
            Entered the wrong email? Fix it here
          </button>
        ) : (
          <form onSubmit={handleFix} className="mb-5 text-left">
            <p className="text-xs font-semibold mb-3" style={{ color: C.sub }}>
              Entered the wrong email? Fix it here
            </p>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: C.sub }}>
              Original signup email
            </label>
            <input
              type="email"
              required
              className={`${inputClass} mb-3`}
              style={inputStyle}
              value={originalEmail}
              onChange={(e) => setOriginalEmail(e.target.value)}
            />
            <label className="block text-xs font-semibold mb-1.5" style={{ color: C.sub }}>
              Corrected email
            </label>
            <input
              type="email"
              required
              className={`${inputClass} mb-3`}
              style={inputStyle}
              value={correctedEmail}
              onChange={(e) => setCorrectedEmail(e.target.value)}
            />
            <div className="flex gap-3 items-center">
              <button
                type="submit"
                disabled={busy}
                className="text-sm font-bold text-white px-4 py-2.5 rounded-full disabled:opacity-50"
                style={{ background: C.purple }}
              >
                {busy ? 'Updating…' : 'Update email'}
              </button>
              <button
                type="button"
                className="text-xs font-semibold"
                style={{ color: C.sub }}
                onClick={() => { setShowFix(false); setError(''); }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <Link to="/login" className="text-sm font-bold" style={{ color: C.purple }}>
          Go to login
        </Link>
      </div>
    </div>
  );
}

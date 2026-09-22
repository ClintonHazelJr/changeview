import { adminClient, setCors } from './_adminAuth.js';
import { clientIp, consumeRateLimit } from './_rateLimit.js';
import { authCallbackUrlFromOrigin } from './_appOrigin.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

/**
 * Unauthenticated signup email correction.
 * Rate-limited: 5 attempts / hour / IP.
 */
export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = clientIp(req);
  const limitResult = consumeRateLimit(`fix-signup-email:${ip}`, {
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });
  console.log('[fix-signup-email] rate-limit check', {
    ip,
    ok: limitResult.ok,
    remaining: limitResult.remaining,
    limit: limitResult.limit,
  });
  if (!limitResult.ok) {
    res.setHeader('Retry-After', String(limitResult.retryAfterSec));
    return res.status(429).json({
      error: 'Too many attempts. Try again in an hour.',
      rateLimited: true,
    });
  }

  const admin = adminClient();
  if (!admin) {
    return res.status(500).json({ error: 'Service not configured (SUPABASE_SERVICE_ROLE_KEY)' });
  }

  const originalEmail = normalizeEmail(req.body?.originalEmail);
  const correctedEmail = normalizeEmail(req.body?.correctedEmail);

  if (!EMAIL_RE.test(originalEmail) || !EMAIL_RE.test(correctedEmail)) {
    return res.status(400).json({ error: 'Enter two valid email addresses.' });
  }
  if (originalEmail === correctedEmail) {
    return res.status(400).json({ error: 'Corrected email must be different from the original.' });
  }

  const { data: profile, error: profileErr } = await admin
    .from('users')
    .select('id, email, role')
    .ilike('email', originalEmail)
    .maybeSingle();

  if (profileErr) {
    console.error('[fix-signup-email] users lookup failed', profileErr.message);
    return res.status(500).json({ error: 'Could not look up signup.' });
  }
  if (!profile?.id) {
    return res.status(404).json({ error: 'No signup found for that original email.' });
  }

  const { data: authUserData, error: authLookupErr } = await admin.auth.admin.getUserById(profile.id);
  if (authLookupErr || !authUserData?.user) {
    return res.status(404).json({ error: 'No signup found for that original email.' });
  }

  const authUser = authUserData.user;
  if (authUser.email_confirmed_at) {
    return res.status(400).json({
      error: 'That account is already confirmed. Sign in with the current email, or reset your password.',
    });
  }

  const { data: clash } = await admin
    .from('users')
    .select('id')
    .ilike('email', correctedEmail)
    .neq('id', profile.id)
    .maybeSingle();
  if (clash?.id) {
    return res.status(409).json({ error: 'That corrected email is already in use.' });
  }

  const { error: updateAuthErr } = await admin.auth.admin.updateUserById(profile.id, {
    email: correctedEmail,
    email_confirm: false,
  });
  if (updateAuthErr) {
    console.error('[fix-signup-email] auth update failed', updateAuthErr.message);
    return res.status(500).json({ error: updateAuthErr.message || 'Could not update auth email.' });
  }

  const { error: updateProfileErr } = await admin
    .from('users')
    .update({ email: correctedEmail })
    .eq('id', profile.id);
  if (updateProfileErr) {
    console.error('[fix-signup-email] public.users update failed', updateProfileErr.message);
    return res.status(500).json({ error: 'Auth email updated but profile email failed. Contact support.' });
  }

  const origin = req.headers.origin
    || (typeof req.headers.referer === 'string' ? (() => {
      try { return new URL(req.headers.referer).origin; } catch { return null; }
    })() : null)
    || process.env.APP_ORIGIN
    || 'https://changeview.app';

  const { error: resendErr } = await admin.auth.resend({
    type: 'signup',
    email: correctedEmail,
    options: { emailRedirectTo: authCallbackUrlFromOrigin(origin, '/app') },
  });
  if (resendErr) {
    // Fallback: generateLink often triggers delivery depending on project config.
    console.warn('[fix-signup-email] resend failed, trying generateLink', resendErr.message);
    const { error: linkErr } = await admin.auth.admin.generateLink({
      type: 'signup',
      email: correctedEmail,
      options: { redirectTo: authCallbackUrlFromOrigin(origin, '/app') },
    });
    if (linkErr) {
      console.error('[fix-signup-email] generateLink failed', linkErr.message);
      return res.status(500).json({
        error: 'Email updated, but we could not send a new confirmation link. Contact support@changeview.app.',
      });
    }
  }

  console.log('[fix-signup-email] updated', {
    userId: profile.id,
    from: originalEmail,
    to: correctedEmail,
  });

  return res.status(200).json({
    ok: true,
    email: correctedEmail,
    message: `Confirmation email sent to ${correctedEmail}.`,
  });
}

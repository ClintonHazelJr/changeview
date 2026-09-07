import { adminClient, setCors, requirePlatformAdmin } from './_adminAuth.js';
import {
  RESET_CONFIRM_PHRASE,
  platformAdminEmail,
  runPlatformReset,
} from './_platformReset.js';

/**
 * Platform-admin only: hard-delete every account / user / Auth login / Stripe
 * customer except the keep email (defaults to PLATFORM_ADMIN_EMAIL).
 *
 * Body: { confirm: 'RESET ALL EXCEPT ME', keepEmail?: string, dryRun?: boolean }
 */
export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const admin = adminClient();
  if (!admin) {
    return res.status(500).json({ error: 'Service not configured (SUPABASE_SERVICE_ROLE_KEY)' });
  }

  const { caller, error: authError } = await requirePlatformAdmin(admin, req);
  if (authError) return res.status(authError.status).json({ error: authError.message });

  const confirm = String(req.body?.confirm || '').trim();
  if (confirm !== RESET_CONFIRM_PHRASE) {
    return res.status(400).json({
      error: `Type ${RESET_CONFIRM_PHRASE} to confirm`,
    });
  }

  const keepEmail = String(req.body?.keepEmail || platformAdminEmail()).trim().toLowerCase();
  // Caller may only keep themselves (or the configured platform admin email).
  const callerEmail = String(caller.email || '').toLowerCase();
  if (keepEmail !== callerEmail && keepEmail !== platformAdminEmail()) {
    return res.status(403).json({ error: 'keepEmail must be your own email' });
  }

  const dryRun = Boolean(req.body?.dryRun);
  const lines = [];
  const log = (...args) => {
    const line = args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
    lines.push(line);
    console.log('[admin-reset-except]', line);
  };

  try {
    const summary = await runPlatformReset({ keepEmail, log, dryRun });
    return res.status(200).json({
      ok: true,
      dryRun,
      keepEmail,
      deletedAccounts: summary.deletedAccounts.length,
      deletedAuthUsers: summary.deletedAuthUsers.length,
      deletedAppUsers: summary.deletedAppUsers.length,
      deletedStripeCustomers: summary.deletedStripeCustomers.length,
      errors: summary.errors,
      remaining: {
        users: summary.remaining?.users?.map((u) => u.email) || [],
        accounts: summary.remaining?.accounts?.map((a) => a.id) || [],
        auth: summary.remaining?.auth?.map((u) => u.email) || [],
      },
      log: lines.slice(-40),
    });
  } catch (err) {
    console.error('[admin-reset-except]', err);
    return res.status(500).json({ error: err.message || 'Reset failed' });
  }
}

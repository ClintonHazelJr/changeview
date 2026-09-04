import crypto from 'crypto';
import { adminClient, setCors, requireAccountOwner } from '../../_adminAuth.js';
import { ASANA_AUTH, asanaClientId, asanaRedirectUri } from '../../_asanaClient.js';
import { integrationEncryptionKey } from '../../_integrationCrypto.js';

function signState(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', integrationEncryptionKey()).update(body).digest('base64url');
  return `${body}.${sig}`;
}

/**
 * Start Asana OAuth — owner only. Returns { url } for the browser to open.
 */
export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!asanaClientId() || !process.env.ASANA_CLIENT_SECRET) {
    return res.status(500).json({ error: 'Asana OAuth is not configured (ASANA_CLIENT_ID / ASANA_CLIENT_SECRET)' });
  }

  const admin = adminClient();
  if (!admin) return res.status(500).json({ error: 'Service not configured' });

  const { caller, error: authError } = await requireAccountOwner(admin, req);
  if (authError) return res.status(authError.status).json({ error: authError.message });

  const origin = req.headers.origin
    || (typeof req.headers.referer === 'string' ? new URL(req.headers.referer).origin : null)
    || process.env.APP_ORIGIN
    || 'http://localhost:5173';

  const redirectUri = asanaRedirectUri(origin);
  const state = signState({
    accountId: caller.account_id,
    userId: caller.id,
    origin,
    exp: Date.now() + 15 * 60 * 1000,
  });

  const url = new URL(ASANA_AUTH);
  url.searchParams.set('client_id', asanaClientId());
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('state', state);
  url.searchParams.set('scope', 'default');

  return res.status(200).json({ url: url.toString() });
}

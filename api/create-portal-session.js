import Stripe from 'stripe';
import { adminClient, setCors, requireAccountOwner } from './_adminAuth.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

/**
 * Stripe Customer Portal — used when status is past_due so the owner can update their card.
 */
export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(500).json({ error: 'Stripe not configured' });
  }

  const admin = adminClient();
  if (!admin) {
    return res.status(500).json({ error: 'Service not configured (SUPABASE_SERVICE_ROLE_KEY)' });
  }

  const { caller, error: authError } = await requireAccountOwner(admin, req);
  if (authError) return res.status(authError.status).json({ error: authError.message });

  const { data: sub } = await admin
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('account_id', caller.account_id)
    .maybeSingle();

  if (!sub?.stripe_customer_id) {
    return res.status(400).json({ error: 'No Stripe customer on this account yet' });
  }

  const origin = req.headers.origin
    || (typeof req.headers.referer === 'string' ? req.headers.referer.replace(/\/$/, '') : null)
    || 'http://localhost:5173';

  try {
    const portal = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${origin}/app`,
    });
    return res.status(200).json({ url: portal.url });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Could not open billing portal' });
  }
}

import { adminClient } from './_adminAuth.js';
import { createStripeClient } from './_stripeClient.js';
import {
  resolvePriceId, priceEnvHint, MARKETING_TO_DB, DB_TO_MARKETING,
} from './_stripePlans.js';

const TIER_ALIASES = {
  solo: 'solo',
  small: 'small',
  enterprise: 'enterprise',
  tier_1: 'solo',
  tier_2: 'enterprise',
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // TEMP DEBUG: distinguish missing secret vs missing Price IDs (mask secret).
  const secretKey = process.env.STRIPE_SECRET_KEY;
  console.log('[checkout-debug] STRIPE_SECRET_KEY present:', Boolean(secretKey));
  console.log(
    '[checkout-debug] STRIPE_SECRET_KEY prefix:',
    secretKey ? String(secretKey).slice(0, 7) : '(empty)',
  );

  if (!secretKey) {
    return res.status(500).json({ error: 'Stripe not configured' });
  }

  const stripe = createStripeClient(secretKey);

  const { tier: rawTier, billingCycle = 'monthly' } = req.body || {};
  const tier = TIER_ALIASES[rawTier];

  if (!tier) return res.status(400).json({ error: 'Unknown plan tier' });
  if (billingCycle !== 'monthly' && billingCycle !== 'annual') {
    return res.status(400).json({ error: 'Billing cycle must be monthly or annual' });
  }
  if (tier === 'solo' && billingCycle !== 'monthly') {
    return res.status(400).json({ error: 'Sole Proprietor is billed monthly only' });
  }

  const priceId = resolvePriceId(tier, billingCycle);
  if (!priceId) {
    return res.status(500).json({
      error: `Stripe Price not configured for ${tier} (${billingCycle}). Set ${priceEnvHint(tier, billingCycle)}.`,
    });
  }

  try {
    const origin = req.headers.origin
      || (typeof req.headers.referer === 'string' ? req.headers.referer.replace(/\/$/, '') : null)
      || 'http://localhost:5173';

    let accountId = null;
    let customerEmail = null;
    let stripeCustomerId = null;
    let addTrial = true;

    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    console.log('[checkout-debug] before Supabase auth', {
      hasToken: Boolean(token),
      tokenLen: token ? token.length : 0,
    });
    if (token) {
      const admin = adminClient();
      console.log('[checkout-debug] adminClient ready:', Boolean(admin));
      if (admin) {
        console.log('[checkout-debug] calling admin.auth.getUser…');
        const { data: authData, error: authErr } = await admin.auth.getUser(token);
        console.log('[checkout-debug] after admin.auth.getUser', {
          hasUser: Boolean(authData?.user),
          userId: authData?.user?.id || null,
          authError: authErr?.message || null,
        });
        if (authData?.user) {
          customerEmail = authData.user.email || null;
          console.log('[checkout-debug] looking up users row…');
          const { data: caller, error: callerErr } = await admin
            .from('users')
            .select('account_id, role')
            .eq('id', authData.user.id)
            .maybeSingle();
          console.log('[checkout-debug] users lookup', {
            role: caller?.role || null,
            hasAccountId: Boolean(caller?.account_id),
            error: callerErr?.message || null,
          });
          if (caller?.role === 'owner' && caller.account_id) {
            accountId = caller.account_id;
            console.log('[checkout-debug] looking up subscriptions row…');
            const { data: sub, error: subErr } = await admin
              .from('subscriptions')
              .select('stripe_customer_id, stripe_subscription_id, status')
              .eq('account_id', accountId)
              .maybeSingle();
            console.log('[checkout-debug] subscriptions lookup', {
              hasCustomer: Boolean(sub?.stripe_customer_id),
              hasSubscription: Boolean(sub?.stripe_subscription_id),
              status: sub?.status || null,
              error: subErr?.message || null,
            });
            stripeCustomerId = sub?.stripe_customer_id || null;
            // Only first Checkout gets a trial; existing Stripe subs are plan changes.
            if (sub?.stripe_subscription_id) addTrial = false;
          }
        }
      }
    } else {
      console.log('[checkout-debug] after Supabase auth: skipped (no Bearer token)');
    }
    console.log('[checkout-debug] auth/lookup phase done', {
      accountId: accountId || null,
      hasCustomerEmail: Boolean(customerEmail),
      hasStripeCustomerId: Boolean(stripeCustomerId),
      addTrial,
    });

    const planTier = MARKETING_TO_DB[tier];
    const meta = {
      account_id: accountId || '',
      tier,
      plan_tier: planTier || '',
      billing_cycle: billingCycle,
    };

    const sessionParams = {
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/app?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: accountId ? `${origin}/app?checkout=cancelled` : `${origin}/?checkout=cancelled`,
      client_reference_id: accountId || undefined,
      metadata: meta,
      // Always collect a card, even when the subscription starts with a $0 trial.
      payment_method_collection: 'always',
      subscription_data: {
        metadata: meta,
        ...(addTrial ? { trial_period_days: 7 } : {}),
      },
    };

    if (stripeCustomerId) {
      sessionParams.customer = stripeCustomerId;
    } else if (customerEmail) {
      sessionParams.customer_email = customerEmail;
    }

    console.log('[checkout-debug] calling stripe.checkout.sessions.create…', {
      priceIdPrefix: String(priceId).slice(0, 8),
      addTrial,
      hasCustomer: Boolean(sessionParams.customer),
      hasCustomerEmail: Boolean(sessionParams.customer_email),
    });
    const session = await stripe.checkout.sessions.create(sessionParams);
    console.log('[checkout-debug] Stripe session created', { id: session?.id || null });
    return res.status(200).json({
      url: session.url,
      plan: DB_TO_MARKETING[planTier] || tier,
      billingCycle,
      trial: addTrial,
    });
  } catch (err) {
    console.error('[checkout-debug] FAILED after resolvePriceId');
    console.error('[checkout-debug] error message:', err?.message || String(err));
    console.error('[checkout-debug] error stack:', err?.stack || '(no stack)');
    return res.status(500).json({ error: err?.message || 'Checkout failed' });
  }
}

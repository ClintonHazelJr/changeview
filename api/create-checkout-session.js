import { adminClient } from './_adminAuth.js';
import { createStripeClient } from './_stripeClient.js';
import {
  resolvePriceBinding, priceEnvHint, MARKETING_TO_DB, DB_TO_MARKETING,
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

  const { tier: rawTier, billingCycle: rawCycle = 'monthly' } = req.body || {};
  const tier = TIER_ALIASES[String(rawTier || '').toLowerCase()];
  const billingCycle = rawCycle === 'annual' ? 'annual' : 'monthly';
  console.log('[checkout-debug] request body tier/cycle:', { rawTier, billingCycle, resolvedTier: tier || null });

  if (!tier) return res.status(400).json({ error: 'Unknown plan tier' });
  if (tier === 'solo' && billingCycle !== 'monthly') {
    return res.status(400).json({ error: 'Sole Proprietor is billed monthly only' });
  }

  const binding = resolvePriceBinding(tier, billingCycle);
  const priceId = binding.priceId;
  console.log('[checkout-debug] resolved price for', `${tier}_${billingCycle}`, {
    hasPriceId: Boolean(priceId),
    pricePrefix: priceId ? String(priceId).slice(0, 12) : null,
    envName: binding.envName,
    hint: priceEnvHint(tier, billingCycle),
  });
  if (!priceId) {
    return res.status(500).json({
      error: `Stripe Price not configured for ${tier} (${billingCycle}). Set ${priceEnvHint(tier, billingCycle)}.`,
    });
  }

  // Hard stop: non-Solo tiers must not silently reuse the Solo Price ID (undercharge).
  if (tier !== 'solo') {
    const soloBinding = resolvePriceBinding('solo', 'monthly');
    if (soloBinding.priceId && soloBinding.priceId === priceId) {
      console.error('[checkout-debug] PRICE COLLISION', {
        tier,
        billingCycle,
        envName: binding.envName,
        soloEnv: soloBinding.envName,
        pricePrefix: String(priceId).slice(0, 12),
      });
      return res.status(500).json({
        error: `Billing misconfiguration: ${binding.envName || priceEnvHint(tier, billingCycle)} points at the same Stripe Price as Solo (${soloBinding.envName}). Fix the Enterprise/Business Price IDs in Vercel env.`,
      });
    }
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
              .select('stripe_customer_id, stripe_subscription_id, status, plan_tier')
              .eq('account_id', accountId)
              .maybeSingle();
            console.log('[checkout-debug] subscriptions lookup', {
              hasCustomer: Boolean(sub?.stripe_customer_id),
              hasSubscription: Boolean(sub?.stripe_subscription_id),
              status: sub?.status || null,
              dbPlanTier: sub?.plan_tier || null,
              requestedTier: tier,
              error: subErr?.message || null,
            });
            stripeCustomerId = sub?.stripe_customer_id || null;
            if (sub?.stripe_subscription_id) addTrial = false;

            const dbPlanTier = MARKETING_TO_DB[tier];
            if (dbPlanTier && !sub?.stripe_subscription_id) {
              const nextBilling = tier === 'solo' ? 'monthly' : billingCycle;
              const { error: syncErr } = await admin
                .from('subscriptions')
                .update({
                  plan_tier: dbPlanTier,
                  billing_cycle: nextBilling,
                  updated_at: new Date().toISOString(),
                })
                .eq('account_id', accountId);
              console.log('[checkout-debug] synced plan_tier from request', {
                dbPlanTier,
                nextBilling,
                syncError: syncErr?.message || null,
              });
            }
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
      tier,
      priceEnv: binding.envName,
    });

    const planTier = MARKETING_TO_DB[tier];
    const meta = {
      account_id: accountId || '',
      tier,
      plan_tier: planTier || '',
      billing_cycle: billingCycle,
      price_env: binding.envName || '',
    };

    const sessionParams = {
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/app?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: accountId ? `${origin}/app?checkout=cancelled` : `${origin}/?checkout=cancelled`,
      client_reference_id: accountId || undefined,
      metadata: meta,
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
      tier,
      priceEnv: binding.envName,
      priceIdPrefix: String(priceId).slice(0, 12),
      addTrial,
      hasCustomer: Boolean(sessionParams.customer),
      hasCustomerEmail: Boolean(sessionParams.customer_email),
    });
    const session = await stripe.checkout.sessions.create(sessionParams);
    console.log('[checkout-debug] Stripe session created', {
      id: session?.id || null,
      tier,
      priceEnv: binding.envName,
    });
    return res.status(200).json({
      url: session.url,
      tier,
      plan: DB_TO_MARKETING[planTier] || tier,
      billingCycle,
      trial: addTrial,
      priceEnv: binding.envName,
      pricePrefix: String(priceId).slice(0, 12),
    });
  } catch (err) {
    console.error('[checkout-debug] FAILED after resolvePriceId');
    console.error('[checkout-debug] error message:', err?.message || String(err));
    console.error('[checkout-debug] error stack:', err?.stack || '(no stack)');
    return res.status(500).json({ error: err?.message || 'Checkout failed' });
  }
}

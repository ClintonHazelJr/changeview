import { adminClient } from './_adminAuth.js';
import { createStripeClient, subscriptionPeriodEndUnix } from './_stripeClient.js';
import {
  planFromPriceId,
  mapStripeSubscriptionStatus,
  unixToDateString,
  unixToIso,
  MARKETING_TO_DB,
} from './_stripePlans.js';

/** Required so Stripe signature verification sees the exact raw body. */
export const config = {
  api: {
    bodyParser: false,
  },
};

async function readRawBody(req) {
  if (Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === 'string') return Buffer.from(req.body);
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

function customerIdFrom(obj) {
  if (!obj) return null;
  if (typeof obj.customer === 'string') return obj.customer;
  return obj.customer?.id || null;
}

function subscriptionIdFrom(obj) {
  if (!obj) return null;
  if (typeof obj.subscription === 'string') return obj.subscription;
  return obj.subscription?.id || null;
}

function priceIdFromSubscription(subscription) {
  return subscription?.items?.data?.[0]?.price?.id || null;
}

async function findSubscriptionRow(admin, {
  accountId, stripeSubscriptionId, stripeCustomerId,
}) {
  if (accountId) {
    const { data } = await admin
      .from('subscriptions')
      .select('*')
      .eq('account_id', accountId)
      .maybeSingle();
    if (data) return data;
  }
  if (stripeSubscriptionId) {
    const { data } = await admin
      .from('subscriptions')
      .select('*')
      .eq('stripe_subscription_id', stripeSubscriptionId)
      .maybeSingle();
    if (data) return data;
  }
  if (stripeCustomerId) {
    const { data } = await admin
      .from('subscriptions')
      .select('*')
      .eq('stripe_customer_id', stripeCustomerId)
      .maybeSingle();
    if (data) return data;
  }
  return null;
}

async function applySubscriptionUpdate(admin, accountId, patch) {
  const { error } = await admin
    .from('subscriptions')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('account_id', accountId);
  if (error) throw new Error(error.message);
}

/** Sync DB subscription fields from a Stripe Subscription object (source of truth). */
function patchFromStripeSubscription(subscription, extras = {}) {
  const fromPrice = planFromPriceId(priceIdFromSubscription(subscription));
  const mappedStatus = mapStripeSubscriptionStatus(subscription.status);
  const patch = {
    stripe_subscription_id: subscription.id,
    stripe_customer_id: customerIdFrom(subscription) || extras.stripeCustomerId || null,
    current_period_end: unixToDateString(subscriptionPeriodEndUnix(subscription)),
    trial_ends_at: subscription.trial_end ? unixToIso(subscription.trial_end) : null,
    ...extras.extraPatch,
  };
  if (mappedStatus) patch.status = mappedStatus;
  if (mappedStatus === 'active') {
    // Trial converted successfully — clear trial end for banner logic.
    patch.trial_ends_at = null;
  }
  if (fromPrice) {
    patch.plan_tier = fromPrice.planTier;
    patch.billing_cycle = fromPrice.planTier === 'tier_1' ? 'monthly' : fromPrice.billingCycle;
  } else if (extras.planTier) {
    patch.plan_tier = extras.planTier;
    patch.billing_cycle = extras.billingCycle || 'monthly';
  }
  return patch;
}

async function handleCheckoutCompleted(stripe, admin, session) {
  const accountId = session.metadata?.account_id || session.client_reference_id;
  if (!accountId) {
    console.warn('checkout.session.completed missing account_id metadata');
    return;
  }

  let stripeSub = null;
  const subRef = session.subscription;
  if (subRef) {
    const subId = typeof subRef === 'string' ? subRef : subRef.id;
    stripeSub = await stripe.subscriptions.retrieve(subId);
  }
  if (!stripeSub) {
    console.warn('checkout.session.completed missing subscription', session.id);
    return;
  }

  const marketingTier = session.metadata?.tier;
  const planTier = MARKETING_TO_DB[marketingTier] || MARKETING_TO_DB[session.metadata?.plan_tier];
  let billingCycle = session.metadata?.billing_cycle || 'monthly';
  if (planTier === 'tier_1') billingCycle = 'monthly';

  const patch = patchFromStripeSubscription(stripeSub, {
    stripeCustomerId: customerIdFrom(session),
    planTier,
    billingCycle,
  });

  await applySubscriptionUpdate(admin, accountId, patch);
}

async function handleSubscriptionSync(admin, subscription) {
  const accountId = subscription.metadata?.account_id || null;
  const row = await findSubscriptionRow(admin, {
    accountId,
    stripeSubscriptionId: subscription.id,
    stripeCustomerId: customerIdFrom(subscription),
  });
  if (!row) {
    console.warn('subscription sync: no matching subscriptions row', subscription.id);
    return;
  }

  const patch = patchFromStripeSubscription(subscription);
  await applySubscriptionUpdate(admin, row.account_id, patch);
}

async function handleSubscriptionDeleted(admin, subscription) {
  const row = await findSubscriptionRow(admin, {
    accountId: subscription.metadata?.account_id || null,
    stripeSubscriptionId: subscription.id,
    stripeCustomerId: customerIdFrom(subscription),
  });
  if (!row) {
    console.warn('customer.subscription.deleted: no matching subscriptions row', subscription.id);
    return;
  }
  await applySubscriptionUpdate(admin, row.account_id, {
    status: 'cancelled',
    stripe_subscription_id: subscription.id,
    stripe_customer_id: customerIdFrom(subscription) || row.stripe_customer_id,
    current_period_end: unixToDateString(subscriptionPeriodEndUnix(subscription)) || row.current_period_end,
    trial_ends_at: null,
  });
}

async function handleInvoicePaymentFailed(admin, invoice) {
  const stripeSubscriptionId = subscriptionIdFrom(invoice);
  const stripeCustomerId = customerIdFrom(invoice);
  const row = await findSubscriptionRow(admin, {
    stripeSubscriptionId,
    stripeCustomerId,
  });
  if (!row) {
    console.warn('invoice.payment_failed: no matching subscriptions row');
    return;
  }
  await applySubscriptionUpdate(admin, row.account_id, {
    status: 'past_due',
    stripe_customer_id: stripeCustomerId || row.stripe_customer_id,
    stripe_subscription_id: stripeSubscriptionId || row.stripe_subscription_id,
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).send('Method not allowed');
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(500).send('Stripe not configured');
  }
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(500).send('STRIPE_WEBHOOK_SECRET not configured');
  }

  const stripe = createStripeClient(process.env.STRIPE_SECRET_KEY);

  const admin = adminClient();
  if (!admin) {
    return res.status(500).send('Supabase service role not configured');
  }

  let event;
  try {
    const rawBody = await readRawBody(req);
    const signature = req.headers['stripe-signature'];
    if (!signature) {
      return res.status(400).send('Missing stripe-signature header');
    }
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(stripe, admin, event.data.object);
        break;
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionSync(admin, event.data.object);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(admin, event.data.object);
        break;
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(admin, event.data.object);
        break;
      default:
        break;
    }
  } catch (err) {
    console.error(`Stripe webhook handler error (${event.type}):`, err.message);
    return res.status(500).json({ error: err.message || 'Webhook handler failed' });
  }

  return res.status(200).json({ received: true });
}

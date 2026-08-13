import Stripe from 'stripe';
import { adminClient } from './_adminAuth.js';
import {
  planFromPriceId,
  mapStripeSubscriptionStatus,
  unixToDateString,
  MARKETING_TO_DB,
} from './_stripePlans.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

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

async function handleCheckoutCompleted(admin, session) {
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

  const priceId = priceIdFromSubscription(stripeSub);
  const fromPrice = planFromPriceId(priceId);
  const marketingTier = session.metadata?.tier || fromPrice?.marketingTier || 'solo';
  const planTier = fromPrice?.planTier
    || MARKETING_TO_DB[marketingTier]
    || MARKETING_TO_DB[session.metadata?.plan_tier]
    || 'tier_1';
  let billingCycle = fromPrice?.billingCycle
    || session.metadata?.billing_cycle
    || 'monthly';
  if (planTier === 'tier_1') billingCycle = 'monthly';

  await applySubscriptionUpdate(admin, accountId, {
    status: 'active',
    trial_ends_at: null,
    plan_tier: planTier,
    billing_cycle: billingCycle,
    stripe_customer_id: customerIdFrom(session) || customerIdFrom(stripeSub),
    stripe_subscription_id: stripeSub?.id || subscriptionIdFrom(session),
    current_period_end: unixToDateString(stripeSub?.current_period_end),
  });
}

async function handleSubscriptionUpdated(admin, subscription) {
  const accountId = subscription.metadata?.account_id || null;
  const row = await findSubscriptionRow(admin, {
    accountId,
    stripeSubscriptionId: subscription.id,
    stripeCustomerId: customerIdFrom(subscription),
  });
  if (!row) {
    console.warn('customer.subscription.updated: no matching subscriptions row', subscription.id);
    return;
  }

  const fromPrice = planFromPriceId(priceIdFromSubscription(subscription));
  const mappedStatus = mapStripeSubscriptionStatus(subscription.status);
  const patch = {
    stripe_subscription_id: subscription.id,
    stripe_customer_id: customerIdFrom(subscription) || row.stripe_customer_id,
    current_period_end: unixToDateString(subscription.current_period_end),
  };
  if (mappedStatus) patch.status = mappedStatus;
  if (mappedStatus === 'active') patch.trial_ends_at = null;
  if (fromPrice) {
    patch.plan_tier = fromPrice.planTier;
    patch.billing_cycle = fromPrice.planTier === 'tier_1' ? 'monthly' : fromPrice.billingCycle;
  }

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
    current_period_end: unixToDateString(subscription.current_period_end) || row.current_period_end,
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
        await handleCheckoutCompleted(admin, event.data.object);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(admin, event.data.object);
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

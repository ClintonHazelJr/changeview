import { adminClient } from './_adminAuth.js';
import { createStripeClient, subscriptionPeriodEndUnix } from './_stripeClient.js';
import {
  planFromPriceId,
  mapStripeSubscriptionStatus,
  unixToDateString,
  unixToIso,
  normalizePlanTier,
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

/** Empty strings from metadata must not count as IDs. */
function nonEmpty(value) {
  const s = String(value || '').trim();
  return s || null;
}

async function findSubscriptionRow(admin, {
  accountId, stripeSubscriptionId, stripeCustomerId,
}) {
  if (accountId) {
    const { data, error } = await admin
      .from('subscriptions')
      .select('*')
      .eq('account_id', accountId)
      .maybeSingle();
    console.log('[stripe-webhook] findSubscriptionRow by account_id', {
      accountId,
      found: Boolean(data),
      error: error?.message || null,
    });
    if (data) return data;
  }
  if (stripeSubscriptionId) {
    const { data, error } = await admin
      .from('subscriptions')
      .select('*')
      .eq('stripe_subscription_id', stripeSubscriptionId)
      .maybeSingle();
    console.log('[stripe-webhook] findSubscriptionRow by stripe_subscription_id', {
      stripeSubscriptionId,
      found: Boolean(data),
      error: error?.message || null,
    });
    if (data) return data;
  }
  if (stripeCustomerId) {
    const { data, error } = await admin
      .from('subscriptions')
      .select('*')
      .eq('stripe_customer_id', stripeCustomerId)
      .maybeSingle();
    console.log('[stripe-webhook] findSubscriptionRow by stripe_customer_id', {
      stripeCustomerId,
      found: Boolean(data),
      error: error?.message || null,
    });
    if (data) return data;
  }
  return null;
}

/**
 * Resolve our account_id when Checkout metadata is missing/empty (common live-mode
 * failure if checkout was created before account provisioning finished).
 */
async function resolveAccountId(stripe, admin, {
  metadataAccountId,
  clientReferenceId,
  stripeCustomerId,
  customerEmail,
}) {
  const fromMeta = nonEmpty(metadataAccountId) || nonEmpty(clientReferenceId);
  if (fromMeta) {
    console.log('[stripe-webhook] account resolved from session metadata/reference', {
      accountId: fromMeta,
      from: nonEmpty(metadataAccountId) ? 'metadata.account_id' : 'client_reference_id',
    });
    return fromMeta;
  }

  let email = nonEmpty(customerEmail)?.toLowerCase() || null;
  if (!email && stripeCustomerId) {
    try {
      console.log('[stripe-webhook] retrieving Stripe customer for email fallback', {
        stripeCustomerId,
      });
      const customer = await stripe.customers.retrieve(stripeCustomerId);
      email = nonEmpty(customer?.email)?.toLowerCase() || null;
      console.log('[stripe-webhook] Stripe customer email', {
        stripeCustomerId,
        hasEmail: Boolean(email),
      });
    } catch (err) {
      console.error('[stripe-webhook] customer.retrieve failed', {
        stripeCustomerId,
        message: err.message,
      });
    }
  }

  if (email) {
    const { data: owner, error } = await admin
      .from('users')
      .select('id, account_id, role, email')
      .ilike('email', email)
      .eq('role', 'owner')
      .maybeSingle();
    console.log('[stripe-webhook] account resolve via owner email', {
      email,
      found: Boolean(owner?.account_id),
      accountId: owner?.account_id || null,
      error: error?.message || null,
    });
    if (owner?.account_id) return owner.account_id;
  }

  console.error('[stripe-webhook] could not resolve account_id', {
    metadataAccountId: metadataAccountId || null,
    clientReferenceId: clientReferenceId || null,
    stripeCustomerId: stripeCustomerId || null,
    customerEmail: email || null,
  });
  return null;
}

async function applySubscriptionUpdate(admin, accountId, patch, context = {}) {
  console.log('[stripe-webhook] Supabase UPDATE starting', {
    context,
    accountId,
    patchKeys: Object.keys(patch || {}),
    patch: {
      status: patch.status || null,
      plan_tier: patch.plan_tier || null,
      billing_cycle: patch.billing_cycle || null,
      stripe_customer_id: patch.stripe_customer_id || null,
      stripe_subscription_id: patch.stripe_subscription_id || null,
      trial_ends_at: patch.trial_ends_at || null,
      current_period_end: patch.current_period_end || null,
    },
  });

  const { data, error } = await admin
    .from('subscriptions')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('account_id', accountId)
    .select('account_id, status, plan_tier, stripe_customer_id, stripe_subscription_id');

  console.log('[stripe-webhook] Supabase UPDATE finished', {
    context,
    accountId,
    rows: Array.isArray(data) ? data.length : null,
    updated: data?.[0] || null,
    error: error?.message || null,
  });

  if (error) throw new Error(error.message);
  if (!data?.length) {
    throw new Error(
      `subscriptions update matched 0 rows for account_id=${accountId} (${context})`,
    );
  }
  return data[0];
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
    patch.billing_cycle = fromPrice.planTier === 'solo' ? 'monthly' : fromPrice.billingCycle;
  } else if (extras.planTier) {
    patch.plan_tier = extras.planTier;
    patch.billing_cycle = extras.planTier === 'solo' ? 'monthly' : (extras.billingCycle || 'monthly');
  } else {
    console.warn('[stripe-webhook] planFromPriceId miss — Price ID not in env catalog', {
      priceId: priceIdFromSubscription(subscription),
      subscriptionId: subscription.id,
      livemode: subscription.livemode,
    });
  }
  return patch;
}

async function handleCheckoutCompleted(stripe, admin, session) {
  console.log('[stripe-webhook] checkout.session.completed received', {
    sessionId: session.id,
    livemode: session.livemode,
    mode: session.mode,
    status: session.status,
    paymentStatus: session.payment_status,
    metadata: session.metadata || null,
    clientReferenceId: session.client_reference_id || null,
    customer: session.customer || null,
    customerEmail: session.customer_email || session.customer_details?.email || null,
    subscriptionField: session.subscription || null,
  });

  const accountId = await resolveAccountId(stripe, admin, {
    metadataAccountId: session.metadata?.account_id,
    clientReferenceId: session.client_reference_id,
    stripeCustomerId: customerIdFrom(session),
    customerEmail: session.customer_email || session.customer_details?.email,
  });

  if (!accountId) {
    // Permanent without account linkage — log loudly; returning 200 avoids infinite retries.
    console.error('[stripe-webhook] checkout.session.completed SKIPPED — no account_id', {
      sessionId: session.id,
      livemode: session.livemode,
      metadata: session.metadata || null,
    });
    return { applied: false, reason: 'missing_account_id' };
  }

  let stripeSub = null;
  const subRef = session.subscription;
  if (subRef) {
    const subId = typeof subRef === 'string' ? subRef : subRef.id;
    console.log('[stripe-webhook] retrieving Stripe subscription', { subId, sessionId: session.id });
    stripeSub = await stripe.subscriptions.retrieve(subId);
    console.log('[stripe-webhook] Stripe subscription retrieved', {
      subId: stripeSub?.id,
      status: stripeSub?.status,
      priceId: priceIdFromSubscription(stripeSub),
      metadata: stripeSub?.metadata || null,
    });
  }
  if (!stripeSub) {
    console.error('[stripe-webhook] checkout.session.completed SKIPPED — no subscription on session', {
      sessionId: session.id,
      mode: session.mode,
      subscriptionField: session.subscription || null,
    });
    return { applied: false, reason: 'missing_subscription' };
  }

  const planTier = normalizePlanTier(session.metadata?.tier)
    || normalizePlanTier(session.metadata?.plan_tier);
  let billingCycle = session.metadata?.billing_cycle || 'monthly';
  if (planTier === 'solo') billingCycle = 'monthly';

  const patch = patchFromStripeSubscription(stripeSub, {
    stripeCustomerId: customerIdFrom(session),
    planTier,
    billingCycle,
  });

  await applySubscriptionUpdate(admin, accountId, patch, 'checkout.session.completed');
  return { applied: true, accountId };
}

async function handleSubscriptionSync(admin, subscription) {
  console.log('[stripe-webhook] subscription sync', {
    type: 'customer.subscription.*',
    subscriptionId: subscription.id,
    livemode: subscription.livemode,
    status: subscription.status,
    metadata: subscription.metadata || null,
    customer: subscription.customer || null,
  });

  const accountId = nonEmpty(subscription.metadata?.account_id);
  const row = await findSubscriptionRow(admin, {
    accountId,
    stripeSubscriptionId: subscription.id,
    stripeCustomerId: customerIdFrom(subscription),
  });
  if (!row) {
    console.error('[stripe-webhook] subscription sync SKIPPED — no matching subscriptions row', {
      subscriptionId: subscription.id,
      metadataAccountId: accountId,
      stripeCustomerId: customerIdFrom(subscription),
    });
    return { applied: false, reason: 'no_subscription_row' };
  }

  const patch = patchFromStripeSubscription(subscription);
  await applySubscriptionUpdate(admin, row.account_id, patch, 'customer.subscription.sync');
  return { applied: true, accountId: row.account_id };
}

async function handleSubscriptionDeleted(admin, subscription) {
  const row = await findSubscriptionRow(admin, {
    accountId: nonEmpty(subscription.metadata?.account_id),
    stripeSubscriptionId: subscription.id,
    stripeCustomerId: customerIdFrom(subscription),
  });
  if (!row) {
    console.error('[stripe-webhook] customer.subscription.deleted SKIPPED — no row', {
      subscriptionId: subscription.id,
    });
    return { applied: false, reason: 'no_subscription_row' };
  }
  await applySubscriptionUpdate(admin, row.account_id, {
    status: 'cancelled',
    stripe_subscription_id: subscription.id,
    stripe_customer_id: customerIdFrom(subscription) || row.stripe_customer_id,
    current_period_end: unixToDateString(subscriptionPeriodEndUnix(subscription)) || row.current_period_end,
    trial_ends_at: null,
  }, 'customer.subscription.deleted');
  return { applied: true, accountId: row.account_id };
}

async function handleInvoicePaymentFailed(admin, invoice) {
  const stripeSubscriptionId = subscriptionIdFrom(invoice);
  const stripeCustomerId = customerIdFrom(invoice);
  const row = await findSubscriptionRow(admin, {
    stripeSubscriptionId,
    stripeCustomerId,
  });
  if (!row) {
    console.error('[stripe-webhook] invoice.payment_failed SKIPPED — no row', {
      stripeSubscriptionId,
      stripeCustomerId,
    });
    return { applied: false, reason: 'no_subscription_row' };
  }
  await applySubscriptionUpdate(admin, row.account_id, {
    status: 'past_due',
    stripe_customer_id: stripeCustomerId || row.stripe_customer_id,
    stripe_subscription_id: stripeSubscriptionId || row.stripe_subscription_id,
  }, 'invoice.payment_failed');
  return { applied: true, accountId: row.account_id };
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
    console.error('[stripe-webhook] signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log('[stripe-webhook] event accepted', {
    id: event.id,
    type: event.type,
    livemode: event.livemode,
  });

  let result = { applied: false, reason: 'unhandled' };
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        result = await handleCheckoutCompleted(stripe, admin, event.data.object);
        break;
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        result = await handleSubscriptionSync(admin, event.data.object);
        break;
      case 'customer.subscription.deleted':
        result = await handleSubscriptionDeleted(admin, event.data.object);
        break;
      case 'invoice.payment_failed':
        result = await handleInvoicePaymentFailed(admin, event.data.object);
        break;
      default:
        result = { applied: false, reason: 'ignored_event_type' };
        break;
    }
  } catch (err) {
    console.error(`[stripe-webhook] handler error (${event.type}):`, {
      message: err.message,
      stack: err.stack,
    });
    // 500 so Stripe retries transient Supabase failures.
    return res.status(500).json({ error: err.message || 'Webhook handler failed' });
  }

  console.log('[stripe-webhook] event handled', {
    id: event.id,
    type: event.type,
    ...result,
  });
  return res.status(200).json({ received: true, ...result });
}

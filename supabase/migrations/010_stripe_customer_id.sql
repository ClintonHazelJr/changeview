-- Store Stripe Customer ID so Checkout can reuse customers and webhooks can match accounts.
alter table subscriptions
  add column if not exists stripe_customer_id text;

create index if not exists idx_subscriptions_stripe_customer
  on subscriptions (stripe_customer_id)
  where stripe_customer_id is not null;

create index if not exists idx_subscriptions_stripe_subscription
  on subscriptions (stripe_subscription_id)
  where stripe_subscription_id is not null;

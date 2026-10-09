-- Audit lock-in: align check constraints with values the app actually writes/reads.
--
-- FINDING (action required):
--   subscriptions.status — code writes/checks: incomplete, trialing, active, cancelled, past_due
--   (signup inserts 'incomplete'; needsCheckout / Stripe webhook / complete-checkout use the same set).
--   Migration 009 only allowed trialing|active|cancelled|past_due. Migration 012 was supposed to
--   add incomplete but was not applied on this database (same class of drift as plan_tier).
--
-- AUDITED / ALREADY ALIGNED (no change):
--   subscriptions.plan_tier     → solo|small|enterprise          (013)
--   subscriptions.billing_cycle → monthly|annual
--   subscriptions solo_must_be_monthly
--   users.role                  → owner|member
--   workspace_members.role      → admin|member  (code inserts 'member')
--   reference_counters.entity_type → program|initiative|impact
--   programs.status             → planning|delivery|closed
--   initiatives.status          → planning|delivery|hypercare|closed
--   requirements.status         → draft|approved|rejected
--   requirements.priority       → low|medium|high
--   impacts.status              → draft|approved|rejected
--   impacts.severity_*         → none|low|medium|high (null allowed via 004)
--   impact_attachments.field    → current_process|future_process
--   learning_needs.status       → draft|approved|rejected
--   comms.tone                  → professional|playful|caring
--   comms.status                → draft|approved|sent  (app writes 'draft' today)
--   tasks.status                → backlog|ready|in_progress|blocked|done
--   tasks.priority              → low|medium|high
--
-- Stripe mapStripeSubscriptionStatus only emits values in the subscriptions.status set
-- (or null, which skips the patch).

alter table public.subscriptions drop constraint if exists subscriptions_status_check;

alter table public.subscriptions
  add constraint subscriptions_status_check
  check (status in ('incomplete', 'trialing', 'active', 'cancelled', 'past_due'));

alter table public.subscriptions
  alter column status set default 'incomplete';

-- Reaffirm plan_tier / billing constraints so a partial 013 cannot leave the DB half-migrated.
alter table public.subscriptions drop constraint if exists subscriptions_plan_tier_check;
alter table public.subscriptions
  add constraint subscriptions_plan_tier_check
  check (plan_tier in ('solo', 'small', 'enterprise'));

alter table public.subscriptions drop constraint if exists subscriptions_billing_cycle_check;
alter table public.subscriptions
  add constraint subscriptions_billing_cycle_check
  check (billing_cycle in ('monthly', 'annual'));

alter table public.subscriptions drop constraint if exists tier_1_must_be_monthly;
alter table public.subscriptions drop constraint if exists solo_must_be_monthly;
alter table public.subscriptions
  add constraint solo_must_be_monthly
  check (plan_tier <> 'solo' or billing_cycle = 'monthly');

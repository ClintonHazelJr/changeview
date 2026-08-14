# ChangeView

B2B SaaS change management tool — scope impact, generate comms, track adoption.

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Supabase

1. Create a [Supabase](https://supabase.com) project.
2. Run `schema.sql` in the SQL editor (exactly as written). Includes `requirements` /
   `requirement_impacts`.
3. Run `supabase/migrations/002_signup_provisioning.sql` (safe to re-run) so signup creates
   `accounts`, `subscriptions`, `workspaces`, and `users`.
4. Run `rls_policies.sql` (uses `current_account_id()` / `current_user_role()` /
   `current_workspace_ids()` helpers — do not reintroduce raw `users` subqueries in policies).
5. If the DB already existed before Requirements: run
   `supabase/migrations/003_requirements.sql`, then re-run `rls_policies.sql`.
6. For severity “No Impact” + file attachments: run
   `supabase/migrations/004_severity_none_and_attachments.sql`, create a private Storage
   bucket named `attachments`, run `storage_policies.sql`, then re-run `rls_policies.sql`.
7. For inviting Enterprise members into an existing account (instead of creating a new
   tenancy): run `supabase/migrations/005_invite_member_provisioning.sql`.

Without the signup trigger, Supabase Auth still creates `auth.users`, but the app tables stay
empty and new users cannot load a workspace.

### 3. Environment variables

Copy `.env.example` to `.env.local` and fill in values:

```
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=              # signing secret for /api/stripe-webhook
```

Stripe Price IDs (for checkout — create one Product per tier in Stripe):

```
STRIPE_PRICE_SOLO_MONTHLY=          # $59 / month
STRIPE_PRICE_SMALL_MONTHLY=         # $149 / month
STRIPE_PRICE_SMALL_ANNUAL=          # $1,490 / year
STRIPE_PRICE_ENTERPRISE_MONTHLY=    # $299 / month
STRIPE_PRICE_ENTERPRISE_ANNUAL=     # $2,990 / year
```

Webhook endpoint (Stripe Dashboard → Developers → Webhooks): `https://<your-domain>/api/stripe-webhook`  
Events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`.

Signup goes through Stripe Checkout with `trial_period_days: 7` (card on file, $0 today). Enable the Stripe Customer Portal for payment-method updates (`/api/create-portal-session`).

Also apply: `010_stripe_customer_id.sql`, `011_account_deleted_at.sql`, and `012_stripe_managed_trials.sql` (new accounts start as `incomplete` until Checkout completes).

### Auth redirect URLs (Supabase Dashboard → Authentication → URL Configuration)

Allow these Redirect URLs (adjust host for local/prod):

```
http://localhost:5173/auth/callback
http://localhost:5173/accept-invite
http://localhost:5173/reset-password
https://<your-domain>/auth/callback
https://<your-domain>/accept-invite
https://<your-domain>/reset-password
```

Prefer Site URL pointing at your app host. Email templates should use `{{ .ConfirmationURL }}` / `{{ .RedirectTo }}` (not a hard-coded homepage). The app sets `emailRedirectTo` / `redirectTo` for signup, invites, and password reset.

### 4. Run locally

```bash
npm run dev
```

For API routes locally, use [Vercel CLI](https://vercel.com/docs/cli):

```bash
npx vercel dev
```

## Deploy

Push to GitHub and connect to Vercel. Set all env vars in Vercel project settings.

## Pricing

Landing page plans: **Sole Proprietor** $59/mo (monthly only), **Business** $149/mo or $1,490/yr, **Enterprise** $299/mo or $2,990/yr. Checkout uses the Stripe Price IDs above based on tier + billing cycle.

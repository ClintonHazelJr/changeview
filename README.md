# ChangeView

B2B SaaS change management tool — scope impact, generate comms, track adoption.

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Supabase

1. Create a [Supabase](https://supabase.com) project.
2. Run `schema.sql` in the SQL editor (exactly as written).
3. Run `supabase/migrations/001_auth_rls.sql` for auth triggers and RLS policies.
4. Run `supabase/migrations/002_signup_provisioning.sql` (safe to re-run). This installs the
   `on_auth_user_created` trigger so every signup creates `accounts`, `subscriptions`,
   `workspaces`, and `users`, plus an `ensure_account_for_user` RPC the app uses as a fallback.

Without step 3/4, Supabase Auth still creates `auth.users`, but the app tables stay empty and
new users cannot load a workspace.

### 3. Environment variables

Copy `.env.example` to `.env.local` and fill in values:

```
SUPABASE_URL=
SUPABASE_ANON_KEY=
ANTHROPIC_API_KEY=
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
```

Optional Stripe price IDs (for checkout):

```
STRIPE_PRICE_TIER1_MONTHLY=
STRIPE_PRICE_TIER2_MONTHLY=
STRIPE_PRICE_TIER2_ANNUAL=
```

Add the same variable names in Vercel project settings for deployment.

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

## Pricing placeholders

Tier 1 and Tier 2 prices on the landing page are `[PLACEHOLDER]` — swap with real numbers before launch.

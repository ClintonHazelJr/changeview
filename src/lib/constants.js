/** Brand tokens (landing + app). Legacy keys (purple/teal/…) alias into this system. */
export const C = {
  ink: '#17181c',
  paper: '#f7f7f6',
  navy: '#1c2f8f',
  royal: '#3a54c4',
  blue3: '#5f79df',
  blue4: '#93a6ee',
  red: '#ff1717',
  darknavy: '#0f1633',
  trust: '#eef0f7',
  sub: '#575653',
  bg: '#f7f7f6',
  border: '#e6e5e2',

  // Legacy aliases — keep existing C.purple / C.coral call sites on the new palette
  purple: '#1c2f8f', // navy (primary)
  teal: '#5f79df', // blue3
  coral: '#ff1717', // red (urgent / error only)
  green: '#1c2f8f', // navy (approved / done)
  amber: '#3a54c4', // royal (medium)
};

export const HEAD = {
  fontFamily: "'Sora', sans-serif",
  letterSpacing: '-0.03em',
  fontWeight: 800,
};
export const BODY = { fontFamily: "'Sora', sans-serif" };

export const tint = (hex, a = '16') => hex + a;

export const initials = (name = '') =>
  name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?';

const GRAY = '#8a8986';

export const SEVERITY_COLOR = {
  none: C.ink, // No Impact — ink, not pure black
  low: '#22C55E',
  medium: '#FBBF24',
  high: C.red, // #ff1717
};
export const SEVERITY_LEVELS = ['none', 'low', 'medium', 'high'];
export const isRatedSeverity = (value) => Boolean(value) && value !== 'none';
export const STATUS_COLOR = {
  // Initiative
  planning: C.blue4,
  delivery: C.blue3,
  hypercare: C.royal,
  closed: GRAY,
  // Requirement / impact
  draft: GRAY,
  approved: C.navy,
  rejected: C.red,
  completed: '#16A34A', // green — distinct from approved (navy)
  // Severity (shared keys — traffic light)
  none: C.ink,
  low: '#22C55E',
  medium: '#FBBF24',
  high: C.red,
  // Task Kanban
  backlog: GRAY,
  ready: C.blue4,
  in_progress: C.blue3,
  blocked: C.red,
  done: C.navy,
};
export const TAG_OPTIONS = ['Training', 'Huddle', 'Email', 'Documentation'];

/** Plan tier IDs match DB plan_tier: solo | small | enterprise. */
export const PLAN_LABELS = {
  solo: 'Starter',
  small: 'Pro',
  enterprise: 'Enterprise',
};

/** Seat / workspace caps. null = unlimited. Aligns with marketing + DB plan_max_users(). */
export const PLAN_LIMITS = {
  solo: { workspaces: 1, users: 2 },
  small: { workspaces: null, users: 5 },
  enterprise: { workspaces: null, users: null },
};

/** Rank for upgrade/downgrade comparisons (display labels differ; IDs stay solo/small/enterprise). */
export const PLAN_TIER_RANK = { solo: 0, small: 1, enterprise: 2 };

export function planTierRank(tier) {
  return PLAN_TIER_RANK[tier] ?? 0;
}

/** Reports free on every paid/trialing plan including Starter (solo). */
export const FREE_REPORT_KEYS = new Set(['requirements', 'cia', 'schedule']);

/** Reports that require Pro (small) or Enterprise when not on trial. */
export function isPaidReport(key) {
  return !FREE_REPORT_KEYS.has(key);
}

export function formatPlanLimit(used, limit) {
  const usedN = Number(used) || 0;
  if (limit == null) return `${usedN} of unlimited`;
  return `${usedN} of ${limit}`;
}

/** UI gate only — API still enforces PLATFORM_ADMIN_EMAIL / default. */
export const PLATFORM_ADMIN_EMAIL = String(
  import.meta.env.VITE_PLATFORM_ADMIN_EMAIL || 'clintonhazeljr@gmail.com',
).trim().toLowerCase();

export const PLATFORM_RESET_CONFIRM = 'RESET ALL EXCEPT ME';

export const isPlatformAdminEmail = (email) =>
  String(email || '').trim().toLowerCase() === PLATFORM_ADMIN_EMAIL;

export const isSoloPlan = (tier) => tier === 'solo';
export const isEnterprisePlan = (tier) => tier === 'enterprise';
export const isSmallPlan = (tier) => tier === 'small';

export function isTrialExpired(subscription) {
  if (!subscription || subscription.status !== 'trialing') return false;
  if (!subscription.trial_ends_at) return false;
  return new Date(subscription.trial_ends_at).getTime() <= Date.now();
}

export function isTrialingActive(subscription) {
  return subscription?.status === 'trialing' && !isTrialExpired(subscription);
}

/** Trial unlocks Enterprise-level capacity for the duration of the trial. */
export function effectivePlanLimits(tier, subscription = null) {
  if (isTrialingActive(subscription)) return PLAN_LIMITS.enterprise;
  return PLAN_LIMITS[tier] || PLAN_LIMITS.solo;
}

export function isPastDue(subscription) {
  return subscription?.status === 'past_due';
}

/** Owner still needs Stripe Checkout (card for trial) before the sub exists. */
export function needsCheckout(subscription) {
  if (!subscription) return true;
  if (subscription.status === 'incomplete') return true;
  if (!subscription.stripe_subscription_id && subscription.status !== 'cancelled') return true;
  return false;
}

export function trialDaysLeft(subscription) {
  if (!subscription?.trial_ends_at) return 0;
  const ms = new Date(subscription.trial_ends_at).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

/**
 * Tasks, Schedule, paid reports — locked on Starter when paid (seat invites still allowed up to plan_max_users).
 * Stripe `trialing` unlocks full Enterprise-level access regardless of selected tier.
 */
export const hasPaidPlanFeatures = (tier, subscription = null) => {
  // Trial unlocks everything — match banner copy; do not require trial_ends_at here.
  if (subscription?.status === 'trialing') return true;
  if (!subscription || subscription.status === 'incomplete' || isPastDue(subscription)) return false;
  if (subscription.status === 'cancelled') return false;
  if (isTrialExpired(subscription)) return false;
  return !isSoloPlan(tier);
};

export const TASK_STATUSES = [
  { key: 'backlog', label: 'Backlog' },
  { key: 'ready', label: 'Ready' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'blocked', label: 'Blocked' },
  { key: 'done', label: 'Done' },
];

export const inputClass = 'w-full border rounded-2xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-transparent';
export const inputStyle = { borderColor: C.border, color: C.ink };

export function formatReference(num) {
  return String(num).padStart(5, '0');
}

export function parseDbError(err) {
  const msg = err?.message || err?.error_description || 'Something went wrong';
  if (msg.includes('Tier 1 accounts are limited') || msg.includes('Sole Proprietor plans are limited') || msg.includes('solo accounts are limited') || msg.includes('Starter plans are limited')) {
    return 'Starter plans are limited to a single Workspace. Upgrade to Pro or Enterprise to add more.';
  }
  if (msg.includes('plan_max_users') || msg.includes('user limit') || msg.includes('seat limit') || msg.includes('maximum number of users')) {
    return 'This plan’s user limit is reached. Starter allows 2 users; upgrade to Pro (5) or contact us for Enterprise.';
  }
  return msg;
}

/** Soft-active flag: missing column / null treated as active. */
export function isActiveRecord(row) {
  return row?.is_active !== false;
}

/** Soft-archive flag. */
export function isArchivedRecord(row) {
  return Boolean(row?.archived_at);
}

/** Active rows for new assignments; keep currentId even if deactivated. */
export function assignableOptions(rows, currentId) {
  return (rows || []).filter((r) => isActiveRecord(r) || (currentId && r.id === currentId));
}

/** Non-archived rows for pickers/lists; keep currentId even if archived. */
export function unarchivedOptions(rows, currentId) {
  return (rows || []).filter((r) => !isArchivedRecord(r) || (currentId && r.id === currentId));
}

/** Strip legacy [cv-meta:{...}] tags once stuffed into initiative descriptions. */
export function stripInitiativeMeta(description) {
  return (description || '').replace(/\n?\[cv-meta:[^\]]+\]\s*$/, '').trim();
}

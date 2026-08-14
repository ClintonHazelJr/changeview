export const C = {
  purple: '#7C6FF0',
  teal: '#2DD4BF',
  coral: '#FF8C82',
  green: '#34D399',
  amber: '#FBBF24',
  ink: '#1E2140',
  sub: '#8A8CA5',
  bg: '#F8F8FC',
  border: '#EFEFF6',
};

export const HEAD = { fontFamily: "'Plus Jakarta Sans', sans-serif" };
export const BODY = { fontFamily: "'Inter', sans-serif" };

export const tint = (hex, a = '16') => hex + a;

export const initials = (name = '') =>
  name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?';

export const SEVERITY_COLOR = {
  none: '#2A2D3A',
  low: C.green,
  medium: C.amber,
  high: C.coral,
};
export const SEVERITY_LEVELS = ['none', 'low', 'medium', 'high'];
export const isRatedSeverity = (value) => Boolean(value) && value !== 'none';
export const STATUS_COLOR = {
  planning: C.purple,
  delivery: C.teal,
  hypercare: C.amber,
  closed: C.sub,
  draft: C.amber,
  approved: C.green,
  rejected: C.coral,
  none: '#2A2D3A',
  low: C.green,
  medium: C.amber,
  high: C.coral,
  backlog: C.sub,
  ready: C.purple,
  in_progress: C.teal,
  blocked: C.coral,
  done: C.green,
};
export const TAG_OPTIONS = ['Training', 'Huddle', 'Email', 'Documentation'];

/** DB: tier_1 / small / tier_2. Display labels only — IDs stay solo/small/enterprise. */
export const PLAN_LABELS = {
  tier_1: 'Sole Proprietor',
  small: 'Business',
  tier_2: 'Enterprise',
  solo: 'Sole Proprietor',
  enterprise: 'Enterprise',
};
export const isSoloPlan = (tier) => tier === 'tier_1' || tier === 'solo';
export const isEnterprisePlan = (tier) => tier === 'tier_2' || tier === 'enterprise';
export const isSmallPlan = (tier) => tier === 'small';

export function isTrialExpired(subscription) {
  if (!subscription || subscription.status !== 'trialing') return false;
  if (!subscription.trial_ends_at) return false;
  return new Date(subscription.trial_ends_at).getTime() <= Date.now();
}

export function isTrialingActive(subscription) {
  return subscription?.status === 'trialing' && !isTrialExpired(subscription);
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
 * Tasks, Schedule, multi-user — locked on Sole Proprietor when paid.
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
  if (msg.includes('Tier 1 accounts are limited')) {
    return 'Sole Proprietor plans are limited to a single Workspace. Upgrade to Enterprise to add more.';
  }
  return msg;
}

/** Store owner/PM names in description until schema has text fields (FK is users, not people). */
export function packInitiativeMeta(description, {
  changeOwner, productOwner, businessOwner, projectManager,
}) {
  const cleaned = (description || '').replace(/\n?\[cv-meta:[^\]]+\]\s*$/, '').trim();
  if (!changeOwner && !productOwner && !businessOwner && !projectManager) return cleaned;
  return `${cleaned}\n[cv-meta:${JSON.stringify({
    changeOwner: changeOwner || '',
    productOwner: productOwner || '',
    businessOwner: businessOwner || '',
    projectManager: projectManager || '',
  })}]`;
}

export function parseInitiativeMeta(description) {
  const raw = description || '';
  const match = raw.match(/\[cv-meta:({.*?})\]\s*$/);
  if (!match) {
    return {
      description: raw, changeOwner: '', productOwner: '', businessOwner: '', projectManager: '',
    };
  }
  try {
    const meta = JSON.parse(match[1]);
    return {
      description: raw.replace(/\n?\[cv-meta:[^\]]+\]\s*$/, '').trim(),
      changeOwner: meta.changeOwner || '',
      productOwner: meta.productOwner || '',
      businessOwner: meta.businessOwner || '',
      projectManager: meta.projectManager || '',
    };
  } catch {
    return {
      description: raw, changeOwner: '', productOwner: '', businessOwner: '', projectManager: '',
    };
  }
}

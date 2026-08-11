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

export const SEVERITY_COLOR = { low: C.green, medium: C.amber, high: C.coral };
export const TAG_OPTIONS = ['Training', 'Huddle', 'Email', 'Documentation'];

export const inputClass = 'w-full border rounded-2xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-transparent';
export const inputStyle = { borderColor: C.border, color: C.ink };

export function formatReference(num) {
  return String(num).padStart(5, '0');
}

export function parseDbError(err) {
  const msg = err?.message || err?.error_description || 'Something went wrong';
  if (msg.includes('Tier 1 accounts are limited')) {
    return 'Tier 1 accounts are limited to a single Workspace. Upgrade to Tier 2 to add more.';
  }
  return msg;
}

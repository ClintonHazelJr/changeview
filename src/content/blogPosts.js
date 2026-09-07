/** Marketing blog posts — markdown bodies rendered by MarkdownBody. */
import aiAndChange from './blog/ai-and-change-management.md?raw';
import stateOfChange from './blog/state-of-change-management.md?raw';
import changeSystems from './blog/change-management-systems.md?raw';
import noSystems from './blog/change-managers-no-systems.md?raw';
import scopeImpact from './blog/how-to-scope-impact.md?raw';
import ocmVsDap from './blog/ocm-vs-dap-vs-itsm.md?raw';
import changeCompass from './blog/change-compass-alternative.md?raw';
import pricing from './blog/pricing-comparison.md?raw';
import servicenow from './blog/servicenow-vs-ocm.md?raw';

/**
 * Index order: comparison/SEO pieces (6–9) first, then practitioner pieces (1–5).
 * Distinct editorial voices across posts are intentional — do not normalize tone.
 * Posts 1–5 are unpublished for now (kept in the catalog; set published: true to ship).
 */
export const BLOG_POSTS = [
  {
    slug: 'ocm-vs-dap-vs-itsm',
    published: true,
    title: 'Change management software vs. digital adoption platforms: a category breakdown',
    excerpt:
      'A search for “change management software” spans three distinct categories. Here is how to tell them apart before you burn a sales cycle.',
    image: '/blog/ocm-vs-dap-vs-itsm.jpg',
    imageAlt: 'Yellow directional signpost pointing toward many destinations',
    imageCredit: 'Photo via Unsplash',
    markdown: ocmVsDap,
  },
  {
    slug: 'change-compass-alternative',
    published: true,
    title: "Looking for a Change Compass alternative? Here's what I'd actually check first",
    excerpt:
      'Change Compass is strong at portfolio saturation — and priced for that buyer. What to look for if you are running a few engagements, not forty initiatives.',
    image: '/blog/change-compass-alternative.jpg',
    imageAlt: 'A small team collaborating around laptops at a shared table',
    imageCredit: 'Photo via Unsplash',
    markdown: changeCompass,
  },
  {
    slug: 'pricing-comparison',
    published: true,
    title: 'A transparent price comparison of change management tools',
    excerpt:
      'Published pricing is rare in this category. A sourced comparison of what vendors and contract benchmarks actually disclose.',
    image: '/blog/pricing-comparison.jpg',
    imageAlt: 'Calculator app open on a phone beside financial paperwork',
    imageCredit: 'Photo via Unsplash',
    markdown: pricing,
  },
  {
    slug: 'servicenow-vs-ocm',
    published: true,
    title: 'ServiceNow change management vs. what I actually do: same words, completely different jobs',
    excerpt:
      'ITSM “change” and organizational change share a name and almost nothing else. How to tell which search result you actually need.',
    image: '/blog/servicenow-vs-ocm.jpg',
    imageAlt: 'Server racks with cabling in a data center',
    imageCredit: 'Photo via Unsplash',
    markdown: servicenow,
  },
  {
    slug: 'ai-and-change-management',
    published: false,
    title: "AI didn't create a new kind of change. It just made everything move faster.",
    excerpt:
      'AI rollouts are still change work — identity and trust included — just on a six-week clock instead of six months.',
    image: '/blog/ai-and-change-management.jpg',
    imageAlt: 'Person using an AI chatbot on a laptop',
    imageCredit: 'Photo via Pexels',
    markdown: aiAndChange,
  },
  {
    slug: 'state-of-change-management',
    published: false,
    title: 'The state of change management: rising demand, flat headcount, unchanged tooling',
    excerpt:
      'Demand is high, headcount has not kept up, and most delivery still runs on spreadsheets from roughly 2010.',
    image: '/blog/state-of-change-management.jpg',
    imageAlt: 'Professionals in a corporate boardroom meeting',
    imageCredit: 'Photo via Pexels',
    markdown: stateOfChange,
  },
  {
    slug: 'change-management-systems',
    published: false,
    title: "A field guide to change management systems, and why most of them weren't built with you in mind",
    excerpt:
      'DAPs and ITSM tools dominate the search results. What to check for if you actually need organizational change software.',
    image: '/blog/change-management-systems.jpg',
    imageAlt: 'Laptop screen showing an analytics dashboard',
    imageCredit: 'Photo via Unsplash',
    markdown: changeSystems,
  },
  {
    slug: 'change-managers-no-systems',
    published: false,
    title: "Every department got its own system. Except the one whose whole job is managing everyone else's.",
    excerpt:
      'Sales got a CRM. Support got tickets. Change management still rebuilds the spreadsheet — and it costs credibility.',
    image: '/blog/change-managers-no-systems.jpg',
    imageAlt: 'Cluttered desk with papers, sketches, pens, and a phone',
    imageCredit: 'Photo via Unsplash',
    markdown: noSystems,
  },
  {
    slug: 'how-to-scope-impact',
    published: false,
    title: 'How to actually scope the impact of a change, before it scopes you',
    excerpt:
      'Most plans go sideways early because impact was never scoped properly. A practical way to do it first.',
    image: '/blog/how-to-scope-impact.jpg',
    imageAlt: 'Whiteboard covered with planning notes and sticky notes',
    imageCredit: 'Photo via Pexels',
    markdown: scopeImpact,
  },
];

export function getPublishedPosts() {
  return BLOG_POSTS.filter((p) => p.published);
}

export function getPostBySlug(slug) {
  const post = BLOG_POSTS.find((p) => p.slug === slug) || null;
  if (!post || !post.published) return null;
  return post;
}

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const SITE_URL = (process.env.SITE_URL || 'https://www.changeview.app').replace(/\/$/, '');
export const SITE_NAME = 'ChangeView';
export const DEFAULT_IMAGE = `${SITE_URL}/assets/hero_real_final.png`;

/** Static public pages. Titles are real search phrases, kept near 60 chars. */
export const STATIC_PAGES = {
  '/': {
    title: 'Change Management Software for Consultants | ChangeView',
    description:
      'Plan, launch and measure change in one place. Stakeholder maps, readiness tracking, adoption analytics and comms for change managers. 1-week free trial.',
    h1: 'Change that people actually adopt.',
    body:
      'ChangeView is change management software for independent change consultants and small change teams. Plan, launch and measure organizational change in one place: stakeholder maps, change impact assessments, readiness tracking, adoption analytics and a communications hub.',
    links: [
      ['/blog', 'Change management guides and templates'],
      ['/about', 'About ChangeView'],
      ['/guide', 'User guide'],
    ],
  },
  '/about': {
    title: 'About ChangeView | Change Management Software',
    description:
      'ChangeView is built by a change manager for independent consultants and small teams who are done with spreadsheets.',
    h1: 'About ChangeView',
    body: 'ChangeView is change management software built for the people who make change stick.',
    links: [['/', 'Home']],
  },
  '/blog': {
    title: 'Change Management Guides and Templates | ChangeView',
    description:
      'Practical guides on change management plans, stakeholder analysis, adoption metrics and change models for change managers.',
    h1: 'Change management guides and templates',
    body: 'Practical guides for change managers.',
    links: [],
  },
  '/contact': {
    title: 'Contact ChangeView',
    description: 'Get in touch with the ChangeView team about change management software, plans and support.',
    h1: 'Contact ChangeView',
    body: 'Questions about ChangeView? Get in touch.',
    links: [['/', 'Home']],
  },
  '/guide': {
    title: 'ChangeView User Guide | Change Management Software',
    description: 'Step by step guide to planning, tracking and reporting change with ChangeView.',
    h1: 'ChangeView user guide',
    body: 'How to plan, track and report change with ChangeView.',
    links: [['/', 'Home']],
  },
  '/privacy': {
    title: 'Privacy Policy | ChangeView',
    description: 'How ChangeView collects, uses and protects your data.',
    h1: 'Privacy Policy',
    body: '',
    links: [],
  },
  '/terms': {
    title: 'Terms of Service | ChangeView',
    description: 'The terms that apply when you use ChangeView.',
    h1: 'Terms of Service',
    body: '',
    links: [],
  },
};

export function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function truncate(text, max) {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).replace(/\s+\S*$/, '')}…`;
}

function inline(text) {
  return esc(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\[(.+?)\]\((https?:\/\/[^\s)]+|\/[^\s)]*)\)/g, '<a href="$2">$1</a>');
}

/** Same minimal markdown the client renders (h1, h2, p, ul, em, strong). */
export function renderMarkdown(source) {
  const blocks = String(source || '')
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n')
    .trim()
    .split(/\n{2,}/);
  const out = [];
  for (const raw of blocks) {
    const block = raw.trim();
    if (!block) continue;
    if (block.startsWith('# ')) {
      out.push(`<h1>${inline(block.slice(2))}</h1>`);
      continue;
    }
    if (block.startsWith('## ')) {
      out.push(`<h2>${inline(block.slice(3))}</h2>`);
      continue;
    }
    if (block.startsWith('### ')) {
      out.push(`<h3>${inline(block.slice(4))}</h3>`);
      continue;
    }
    const lines = block.split('\n');
    const listStart = lines.findIndex((l) => /^[-*]\s+/.test(l.trim()));
    if (listStart >= 0) {
      const before = lines.slice(0, listStart).join(' ').trim();
      if (before) out.push(`<p>${inline(before)}</p>`);
      const items = lines
        .slice(listStart)
        .map((l) => l.trim())
        .filter((l) => /^[-*]\s+/.test(l))
        .map((l) => `<li>${inline(l.replace(/^[-*]\s+/, ''))}</li>`);
      out.push(`<ul>${items.join('')}</ul>`);
      continue;
    }
    out.push(`<p>${inline(lines.join(' '))}</p>`);
  }
  return out.join('\n');
}

export function plainText(markdown) {
  return String(markdown || '')
    .replace(/^#+\s+.*$/gm, '')
    .replace(/[*_`>-]/g, '')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

export function jsonLd(obj) {
  return `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`;
}

export function organizationLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/favicon.svg`,
    legalName: 'Blackhand Technologies',
  };
}

export function softwareLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: SITE_NAME,
    url: SITE_URL,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    description:
      'Change management software for consultants and small teams: stakeholder maps, change impact assessments, readiness tracking, adoption analytics and comms.',
    publisher: { '@type': 'Organization', name: 'Blackhand Technologies' },
  };
}

/** Load the built index.html (shipped via vercel.json includeFiles), else fetch it. */
export async function loadTemplate(req) {
  const candidates = [join(process.cwd(), 'dist', 'index.html'), join(process.cwd(), 'index.html')];
  for (const file of candidates) {
    try {
      const html = readFileSync(file, 'utf8');
      if (html.includes('id="root"')) return html;
    } catch {
      /* try next */
    }
  }
  try {
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const r = await fetch(`https://${host}/index.html`);
    if (r.ok) return await r.text();
  } catch {
    /* fall through */
  }
  return '<!doctype html><html lang="en"><head><meta charset="UTF-8"/></head><body><div id="root"></div></body></html>';
}

/** Replace title, add meta/canonical/OG/JSON-LD, and put readable content in #root. */
export function injectPage(template, page) {
  const { title, description, path, image, type = 'website', ld = [], bodyHtml = '' } = page;
  const canonical = `${SITE_URL}${path === '/' ? '/' : path}`;
  const tags = [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(description)}" />`,
    `<link rel="canonical" href="${esc(canonical)}" />`,
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    `<meta property="og:type" content="${type}" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(description)}" />`,
    `<meta property="og:url" content="${esc(canonical)}" />`,
    `<meta property="og:image" content="${esc(image || DEFAULT_IMAGE)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(title)}" />`,
    `<meta name="twitter:description" content="${esc(description)}" />`,
    `<meta name="twitter:image" content="${esc(image || DEFAULT_IMAGE)}" />`,
    ...ld.map(jsonLd),
  ].join('\n    ');

  let html = template
    .replace(/<title>[\s\S]*?<\/title>/i, '')
    .replace(/<meta\s+name="description"[^>]*>/gi, '')
    .replace(/<link\s+rel="canonical"[^>]*>/gi, '');
  html = html.replace(/<\/head>/i, `    ${tags}\n  </head>`);
  html = html.replace(/<div id="root"><\/div>/i, `<div id="root">${bodyHtml}</div>`);
  return html;
}

// Weekly cron: drafts one blog article from the topic queue and saves it UNPUBLISHED.
// Triggered by Vercel Cron (see vercel.json). Auth: Authorization: Bearer $CRON_SECRET.
import { adminClient } from './_adminAuth.js';

const MODEL = 'claude-sonnet-4-20250514';
const SITE_URL = process.env.SITE_URL || 'https://www.changeview.app';

const SYSTEM_PROMPT = `You write blog articles for ChangeView, change management software for consultants and small teams.

Style:
- Plain, direct, practical. Short paragraphs. Australian spelling (organisation, prioritise).
- Format: markdown with one "# " title, "## " section headings, short paragraphs, "- " bullet lists. Optional *em* and **strong**. No tables, no code blocks, no images.
- 900 to 1300 words.
- Never use em dashes or en dashes. Use commas, full stops or colons.

Honesty rules:
- Do not invent statistics, studies, customer names, quotes or case studies.
- For competitor topics, do not make claims about a competitor's features, pricing or quality. Give the reader criteria to check themselves and say to verify on the vendor's site.
- ChangeView facts you may state: it keeps impact assessment, stakeholders, comms plans, training and tasks in one place; it has a stakeholder map; it tracks readiness from real training completion; it does not force a methodology. Do not state prices.
- Trial wording must be exact: "1-week free trial (card required, charged only when the trial ends)".
- End with one short call to action pointing to ${SITE_URL}.

Output ONLY valid JSON with these keys:
{"title": string, "slug": string (lowercase, hyphens, max 70 chars), "excerpt": string (max 180 chars), "meta_title": string (max 60 chars), "meta_description": string (max 155 chars), "image_keywords": string (3 comma separated phrases), "content": string (the markdown body, starting with the # title)}`;

const clean = (s) => String(s ?? '').replace(/\s*[—–]\s*/g, ', ');

function slugify(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70);
}

function parseJson(text) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end < 0) throw new Error('No JSON in model output');
  return JSON.parse(text.slice(start, end + 1));
}

async function notify(subject, html) {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.BLOG_NOTIFY_EMAIL;
  if (!key || !to) return false;
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.BLOG_NOTIFY_FROM || 'ChangeView <onboarding@resend.dev>',
      to: [to],
      subject,
      html,
    }),
  });
  return r.ok;
}

export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY missing' });

  const db = adminClient();

  const { data: topic, error: topicErr } = await db
    .from('blog_topics')
    .select('*')
    .eq('status', 'queued')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (topicErr) return res.status(500).json({ error: topicErr.message });
  if (!topic) {
    await notify('ChangeView blog topic queue is empty', '<p>Add rows to the blog_topics table so the weekly draft can continue.</p>');
    return res.status(200).json({ ok: true, message: 'No queued topics' });
  }

  try {
    const userPrompt = `Write the article.\nTopic: ${topic.topic}\nTarget search keyword: ${topic.keyword}\nAngle: ${topic.angle}\nUse the keyword naturally in the title, first paragraph and one heading.`;
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4000,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error?.message || 'Anthropic API error');
    const text = (data.content || []).map((b) => b.text || '').join('');
    const a = parseJson(text);

    const title = clean(a.title || topic.topic).trim();
    let slug = slugify(a.slug || title) || slugify(topic.topic);
    const { data: existing } = await db.from('blog_posts').select('id').eq('slug', slug).maybeSingle();
    if (existing) slug = `${slug.slice(0, 60)}-${Date.now().toString(36)}`;

    const { data: post, error: insErr } = await db
      .from('blog_posts')
      .insert({
        title,
        slug,
        excerpt: clean(a.excerpt).slice(0, 200),
        content: clean(a.content),
        meta_title: clean(a.meta_title).slice(0, 70),
        meta_description: clean(a.meta_description).slice(0, 170),
        image_keywords: clean(a.image_keywords),
        published: false,
      })
      .select('id, slug, title')
      .single();
    if (insErr) throw new Error(insErr.message);

    await db
      .from('blog_topics')
      .update({ status: 'drafted', post_id: post.id, used_at: new Date().toISOString() })
      .eq('id', topic.id);

    const emailed = await notify(
      `Blog draft ready: ${post.title}`,
      `<p>A new unpublished draft is ready for review.</p><p><b>${post.title}</b></p><p>Review and publish it at <a href="${SITE_URL}/admin/blog">${SITE_URL}/admin/blog</a>.</p><p>Check for invented claims before publishing.</p>`
    );
    return res.status(200).json({ ok: true, slug: post.slug, emailed });
  } catch (err) {
    await notify('ChangeView blog draft failed', `<p>${String(err.message || err)}</p>`);
    return res.status(500).json({ error: String(err.message || err) });
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'AI service not configured' });
  }

  const {
    initiativeName,
    initiativeDescription,
    impact,
    keyMessage,
    audience,
    tone,
    channel,
    extraInstructions,
  } = req.body;

  const systemPrompt = `You write internal change management communications. Structure every message with: what's changing, why it's happening, what's different for the reader specifically, what they need to do, and where to get help. Keep it tight, no filler, no corporate jargon. Match the requested tone exactly. Output only the message itself, no preamble, no explanation, no subject line label.`;

  let userPrompt = `Initiative: ${initiativeName || 'Untitled'}\nInitiative description: ${initiativeDescription || ''}\n`;

  if (impact) {
    userPrompt += `Impact context: ${impact.department} team, current state "${impact.currentProcess || ''}" moving to "${impact.futureProcess || ''}". Severity: people impact is ${impact.severityPeople || 'unknown'}, system impact is ${impact.severitySystem || 'unknown'}.\n`;
  }

  userPrompt += `Key message to convey: ${keyMessage || 'General update on this initiative'}\n`;
  userPrompt += `Audience: ${(audience || []).join(', ') || 'Internal'}\n`;
  userPrompt += `Tone: ${tone || 'professional'}\n`;
  userPrompt += `Channel: ${(channel || []).join(', ') || 'Email'}\n`;
  if (extraInstructions) {
    userPrompt += `Additional instructions: ${extraInstructions}\n`;
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || 'Anthropic API error' });
    }

    const content = (data.content || []).map((b) => b.text || '').join('\n');
    return res.status(200).json({ content });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to generate comms' });
  }
}

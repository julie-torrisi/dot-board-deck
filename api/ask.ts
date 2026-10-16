// POST /api/ask  { prompt, bio }  ->  { reply }
// The Anthropic API key lives only in the ANTHROPIC_API_KEY environment variable.

import { CANNED, MAX_BIO, TIMEOUT_MS, RateLimiter, fitReply, systemPrompt, validInput } from './_shared';

const limiter = new RateLimiter();
const MODEL = process.env.ASK_MODEL || 'claude-haiku-5-5';

// Other sites allowed to call this endpoint (for example private decks), comma separated.
const ORIGINS = (process.env.ASK_ALLOWED_ORIGINS || '').split(',').map((o) => o.trim()).filter(Boolean);
const reply = (cors: Record<string, string>) => (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...cors } });

function corsFor(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') || '';
  if (!ORIGINS.includes(origin)) return {};
  return { 'access-control-allow-origin': origin, 'access-control-allow-methods': 'POST, OPTIONS', 'access-control-allow-headers': 'content-type', vary: 'origin' };
}

export async function OPTIONS(req: Request): Promise<Response> {
  return new Response(null, { status: 204, headers: corsFor(req) });
}

export async function POST(req: Request): Promise<Response> {
  const json = reply(corsFor(req));
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!limiter.allow(ip)) return json({ reply: 'TOO MANY QUESTIONS.\nGIVE THE BOARD A\nMINUTE.' }, 429);

  let body: { prompt?: unknown; bio?: unknown };
  try { body = await req.json(); } catch { return json({ reply: CANNED }, 400); }
  const prompt = validInput(body.prompt);
  if (!prompt) return json({ reply: 'KEEP IT UNDER\n120 CHARACTERS.' }, 400);
  const bio = typeof body.bio === 'string' ? body.bio.slice(0, MAX_BIO) : '';

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return json({ reply: CANNED, offline: true }, 503);

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 80,
        system: systemPrompt(bio),
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!res.ok) return json({ reply: CANNED }, 502);
    const data = (await res.json()) as { content?: { type: string; text?: string }[] };
    const text = data.content?.find((c) => c.type === 'text')?.text ?? '';
    return json({ reply: fitReply(text) });
  } catch {
    return json({ reply: CANNED }, 504);
  }
}

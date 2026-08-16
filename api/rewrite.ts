/**
 * The AI finishing pass, server side. Receives the visible text of the page
 * the user imported and asks a cheap model (via OpenRouter) to write the new
 * one-pager's copy in the business's own words. Stateless; the key lives
 * only in the server environment; the client degrades gracefully without us.
 *
 * Abuse guards (the endpoint is public and the tokens cost real money):
 * browser-origin allowlist, text length window, per-IP rate limit, hard
 * max_tokens cap, 20s timeout. The final backstop is the spend limit set on
 * the OpenRouter key itself.
 *
 * Self-contained on purpose — see api/fetch-site.ts (ESM imports into ../src
 * fail at runtime on Vercel's builder).
 */

declare const process: { env: Record<string, string | undefined> };

const MODEL = 'google/gemini-2.5-flash';
const MAX_COMPLETION_TOKENS = 1600;
const TIMEOUT_MS = 20_000;
const RATE_LIMIT = 6; // requests per IP per minute, per warm instance

const ALLOWED_ORIGIN =
  /^https?:\/\/(localhost(:\d+)?|urlite\.app|www\.urlite\.app|urlite-[a-z0-9-]+\.vercel\.app)$/i;

const hits = new Map<string, number[]>();

function limited(ip: string): boolean {
  const now = Date.now();
  const w = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  w.push(now);
  hits.set(ip, w);
  return w.length > RATE_LIMIT;
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}

const SYSTEM = `You write website copy for a one-page site builder. You receive the visible text of a small business's existing web page. Produce copy for their new one-page site based ONLY on facts present in that text — never invent numbers, prices, addresses or claims.
Style: plain, concrete, confident. Short sentences. No exclamation marks, no emoji, no buzzwords, no "we are passionate".
Rules per field: heroTitle max 8 words with 1-3 key words wrapped in *asterisks*; lede 1-2 sentences; services 4-6 items describing what THIS business actually offers (title max 5 words, text exactly one sentence); stats exactly 3 short entries (big max 8 chars); ticker 3-4 short offer lines; statementBig one memorable sentence; extras up to 4 two-word items.
If the page text is too thin to fill a field truthfully, OMIT that field.
The user message names the output language code (en, ro or da). Write EVERY field in that language — translate the page's facts into it if the page uses another language. Never mix languages.
Reply with ONLY a JSON object, no markdown fences, with any of these optional keys:
{"tagline","kicker","heroTitle","lede","stats":[{"big","small"}],"ticker":[],"statementBig","statementText","servicesKicker","servicesTitle","servicesLede","services":[{"title","text"}],"extrasLabel","extras":[],"bandKicker","bandTitle","bandText","galleryKicker","galleryTitle","contactKicker","contactTitle","contactLede"}`;

export async function POST(request: Request): Promise<Response> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return json(503, { ok: false, error: 'rewrite unavailable' });

  const origin = request.headers.get('origin') ?? '';
  if (!ALLOWED_ORIGIN.test(origin)) return json(403, { ok: false, error: 'forbidden' });

  const ip = (request.headers.get('x-forwarded-for') ?? 'unknown').split(',')[0].trim();
  if (limited(ip)) return json(429, { ok: false, error: 'slow down' });

  let text = '';
  let lang = 'en';
  try {
    const body = (await request.json()) as { text?: unknown; lang?: unknown };
    text = typeof body.text === 'string' ? body.text.trim() : '';
    lang = body.lang === 'ro' || body.lang === 'da' ? body.lang : 'en';
  } catch {
    return json(400, { ok: false, error: 'bad request' });
  }
  if (text.length < 200 || text.length > 6500) {
    return json(422, { ok: false, error: 'nothing to write from' });
  }

  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      signal: ctl.signal,
      headers: {
        authorization: `Bearer ${key}`,
        'content-type': 'application/json',
        'http-referer': 'https://urlite.app',
        'x-title': 'Urlite import',
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.4,
        max_tokens: MAX_COMPLETION_TOKENS,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM },
          {
            role: 'user',
            content: `Output language code: ${lang}\n\nPage text:\n${text}`,
          },
        ],
      }),
    });
    if (!res.ok) return json(502, { ok: false, error: 'model unavailable' });
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const raw = data.choices?.[0]?.message?.content ?? '';
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start < 0 || end <= start) return json(502, { ok: false, error: 'no brief' });
    const brief = JSON.parse(raw.slice(start, end + 1));
    return json(200, { ok: true, brief });
  } catch {
    return json(504, { ok: false, error: 'timeout' });
  } finally {
    clearTimeout(timer);
  }
}

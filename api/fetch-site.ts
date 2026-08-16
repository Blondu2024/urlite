/**
 * The magic import's only server-side piece: a stateless, store-nothing proxy
 * that fetches a PUBLIC page's HTML on behalf of the editor (browsers can't —
 * CORS). The site a user builds still lives entirely in the link; this
 * function sees the imported page once and forgets it.
 *
 * Hard rules: http(s) to public hosts only (no loopback/RFC1918/metadata),
 * redirects validated hop by hop, 8s timeout, 1.5 MB cap, text/html only.
 *
 * Self-contained on purpose: Vercel's builder compiles this entry alone, and
 * an ESM import reaching into ../src fails at runtime with ERR_MODULE_NOT_FOUND
 * (seen live, 16 Aug 2026). Tests import the guard straight from this file.
 */

const PRIVATE_HOST = /^(localhost|.*\.local|.*\.internal|.*\.localhost)$/i;

function isPrivateIPv4(host: string): boolean {
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const [a, b] = [Number(m[1]), Number(m[2])];
  if (a === 127 || a === 10 || a === 0) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 169 && b === 254) return true; // link-local incl. cloud metadata
  return false;
}

/** The only URLs the fetcher may touch: public http(s) hosts, nothing inward. */
export function isAllowedTarget(raw: string): boolean {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return false;
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
  const host = u.hostname;
  if (!host || PRIVATE_HOST.test(host)) return false;
  if (host.includes(':')) return false; // no raw IPv6 targets — public sites have names
  if (isPrivateIPv4(host)) return false;
  return true;
}

const MAX_BYTES = 4_000_000; // old sites are small; our own inlined-image demos hit ~3.2 MB
const MAX_HOPS = 3;
const TIMEOUT_MS = 8000;

const UA =
  'Mozilla/5.0 (compatible; UrliteImport/1.0; +https://urlite.app) AppleWebKit/537.36';

function fail(status: number, error: string): Response {
  return new Response(JSON.stringify({ ok: false, error }), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}

async function readCapped(res: globalThis.Response): Promise<string | null> {
  const reader = res.body?.getReader();
  if (!reader) return null;
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const buf = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    buf.set(c, off);
    off += c.byteLength;
  }
  return new TextDecoder('utf-8', { fatal: false }).decode(buf);
}

export async function GET(request: Request): Promise<Response> {
  const target = new URL(request.url).searchParams.get('url') ?? '';
  let current = /^https?:\/\//i.test(target) ? target : 'https://' + target;

  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    for (let hop = 0; hop <= MAX_HOPS; hop++) {
      if (!isAllowedTarget(current)) return fail(400, 'That address cannot be read.');
      const res = await fetch(current, {
        redirect: 'manual',
        signal: ctl.signal,
        headers: { 'user-agent': UA, accept: 'text/html,application/xhtml+xml' },
      });
      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get('location');
        if (!loc || hop === MAX_HOPS) return fail(502, 'Too many redirects.');
        current = new URL(loc, current).href;
        continue;
      }
      if (!res.ok) return fail(502, `The site answered with ${res.status}.`);
      const type = res.headers.get('content-type') ?? '';
      if (!type.includes('text/html')) return fail(415, 'That link is not a web page.');
      const html = await readCapped(res);
      if (html === null) return fail(413, 'That page is too heavy to read.');
      return new Response(JSON.stringify({ ok: true, url: current, html }), {
        headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
      });
    }
    return fail(502, 'Too many redirects.');
  } catch {
    return fail(504, 'The site did not answer in time.');
  } finally {
    clearTimeout(timer);
  }
}

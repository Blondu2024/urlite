/**
 * Short links, server side. A short link does not host a site — it remembers
 * which link the site is. `/x/<id>` resolves to a 302 into the ordinary
 * viewer, so nothing here renders user content and no new markup path exists.
 *
 * Self-contained on purpose — see api/fetch-site.ts (relative imports into
 * ../src fail at runtime on Vercel's builder). The pure helpers are exported
 * by name so the tests can reach them; Vercel uses GET and POST.
 */

import { inflateSync, strFromU8 } from 'fflate';

export const ID_ALPHABET = '23456789abcdefghjkmnpqrstuvwxyz'; // no 0, o, 1, l, i
const ID_LENGTH = 10;
export const MAX_PAYLOAD = 65536;

export function newId(): string {
  /* rejection sampling: 248 = 31 * 8, so every letter is equally likely */
  const out: string[] = [];
  const buf = new Uint8Array(ID_LENGTH * 2);
  while (out.length < ID_LENGTH) {
    crypto.getRandomValues(buf);
    for (const b of buf) {
      if (b >= 248) continue;
      out.push(ID_ALPHABET[b % ID_ALPHABET.length]);
      if (out.length === ID_LENGTH) break;
    }
  }
  return out.join('');
}

function toBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
  const bin = atob(b64 + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function newSecret(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return toBase64Url(bytes);
}

export async function sha256Hex(s: string): Promise<string> {
  const data = new TextEncoder().encode(s);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Compares digests, not secrets, and in constant time for the length we control. */
export async function sameSecret(hash: string, candidate: string): Promise<boolean> {
  if (typeof candidate !== 'string' || candidate.length === 0) return false;
  const other = await sha256Hex(candidate);
  if (other.length !== hash.length) return false;
  let diff = 0;
  for (let i = 0; i < other.length; i++) diff |= other.charCodeAt(i) ^ hash.charCodeAt(i);
  return diff === 0;
}

/**
 * The important guard. Anything we store must be a site the editor could have
 * made — that is what keeps this from being free storage for arbitrary text,
 * which is the actual phishing vector.
 */
export function validPayload(v: unknown): v is string {
  if (typeof v !== 'string') return false;
  if (!v.startsWith('v1.')) return false;
  if (v.length > MAX_PAYLOAD) return false;
  try {
    const cfg = JSON.parse(strFromU8(inflateSync(fromBase64Url(v.slice(3))))) as Record<
      string,
      unknown
    >;
    if (typeof cfg !== 'object' || cfg === null || Array.isArray(cfg)) return false;
    if (cfg.v !== 1) return false;
    if (typeof cfg.brandName !== 'string') return false;
    if (typeof cfg.theme !== 'object' || cfg.theme === null) return false;
    if (typeof cfg.hero !== 'object' || cfg.hero === null) return false;
    return true;
  } catch {
    return false;
  }
}

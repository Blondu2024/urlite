import { deflateSync, inflateSync, strFromU8, strToU8 } from 'fflate';
import type { SiteConfig } from './types';

/**
 * The whole site travels in the URL fragment as `v1.<base64url(deflate(json))>`.
 * The fragment never reaches any server — the site literally lives in the link.
 */

const PREFIX = 'v1.';

function toBase64Url(bytes: Uint8Array): string {
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
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

export function encodeSite(config: SiteConfig): string {
  const json = strToU8(JSON.stringify(config));
  const packed = deflateSync(json, { level: 9 });
  return PREFIX + toBase64Url(packed);
}

/** Returns null when the payload is not something we wrote (corrupt / foreign). */
export function decodeSite(payload: string): unknown | null {
  const t = payload.trim().replace(/^#/, '');
  if (!t.startsWith(PREFIX)) return null;
  try {
    const bytes = fromBase64Url(t.slice(PREFIX.length));
    const json = strFromU8(inflateSync(bytes));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/** Size of the encoded payload in bytes (what actually rides in the link). */
export function payloadBytes(encoded: string): number {
  return encoded.length;
}

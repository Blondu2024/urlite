/**
 * The client half of short links. The long link stays the default and stays
 * self-contained; everything here only runs for someone who asked for a link
 * they can print.
 */

export interface ManageKey {
  id: string;
  secret: string;
  /** the printable short URL, as the server named it. Optional because a
      management hash carries only the id and the secret; it is filled in
      from the read response the moment we resolve that link. */
  url?: string;
}

export const MANAGE_KEY = 'urlite-manage';

/** Where short links live when the server did not say. Kept in step with
    the SHORT_HOST fallback in api/link.ts. */
export const SHORT_HOST = 'urlite-x.vercel.app';

/**
 * The link to print, for a key we already hold. The server names the host
 * whenever it answers, and that name is what we keep; this fallback exists
 * so the box under "This is the link to print" is never empty, which is the
 * one thing this whole feature is for.
 */
export function shortLinkUrl(key: ManageKey): string {
  return key.url ?? `https://${SHORT_HOST}/x/${key.id}`;
}

const MANAGE_HASH = /^#?m=([23456789abcdefghjkmnpqrstuvwxyz]{10})\.([A-Za-z0-9_-]{16,64})$/;

export function parseManageHash(hash: string): ManageKey | null {
  const m = MANAGE_HASH.exec(hash.trim());
  return m ? { id: m[1], secret: m[2] } : null;
}

export function manageUrl(key: ManageKey, origin: string): string {
  return `${origin}/app#m=${key.id}.${key.secret}`;
}

export function loadManageKey(): ManageKey | null {
  try {
    const raw = localStorage.getItem(MANAGE_KEY);
    if (!raw) return null;
    const k = JSON.parse(raw) as ManageKey;
    if (typeof k?.id !== 'string' || typeof k?.secret !== 'string') return null;
    return typeof k.url === 'string'
      ? { id: k.id, secret: k.secret, url: k.url }
      : { id: k.id, secret: k.secret };
  } catch {
    return null;
  }
}

export function saveManageKey(key: ManageKey): void {
  try {
    localStorage.setItem(MANAGE_KEY, JSON.stringify(key));
  } catch {
    /* storage blocked — the management link is still on screen */
  }
}

export function clearManageKey(): void {
  try {
    localStorage.removeItem(MANAGE_KEY);
  } catch {
    /* nothing to do */
  }
}

async function post(body: unknown): Promise<Record<string, unknown>> {
  const res = await fetch('/api/link', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const out = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok || out.ok !== true) throw new Error(String(out.error ?? res.status));
  return out;
}

export async function createShortLink(payload: string): Promise<{ key: ManageKey; url: string }> {
  const out = await post({ payload });
  const url = String(out.url);
  /* the url is kept ON the key, so it is what gets written to storage and
     survives to the next visit alongside the id and the secret */
  return { key: { id: String(out.id), secret: String(out.secret), url }, url };
}

export async function updateShortLink(key: ManageKey, payload: string): Promise<void> {
  await post({ id: key.id, secret: key.secret, payload });
}

export async function readShortLink(
  id: string,
): Promise<{ payload: string; url?: string } | null> {
  const res = await fetch(`/api/link?id=${encodeURIComponent(id)}`);
  if (!res.ok) return null;
  const out = (await res.json().catch(() => ({}))) as { payload?: unknown; url?: unknown };
  if (typeof out.payload !== 'string') return null;
  return typeof out.url === 'string'
    ? { payload: out.payload, url: out.url }
    : { payload: out.payload };
}

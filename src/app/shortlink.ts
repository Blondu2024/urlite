/**
 * The client half of short links. The long link stays the default and stays
 * self-contained; everything here only runs for someone who asked for a link
 * they can print.
 */

export interface ManageKey {
  id: string;
  secret: string;
}

export const MANAGE_KEY = 'urlite-manage';

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
    return typeof k?.id === 'string' && typeof k?.secret === 'string' ? k : null;
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
  return {
    key: { id: String(out.id), secret: String(out.secret) },
    url: String(out.url),
  };
}

export async function updateShortLink(key: ManageKey, payload: string): Promise<void> {
  await post({ id: key.id, secret: key.secret, payload });
}

export async function readShortLink(id: string): Promise<string | null> {
  const res = await fetch(`/api/link?id=${encodeURIComponent(id)}`);
  if (!res.ok) return null;
  const out = (await res.json().catch(() => ({}))) as { payload?: unknown };
  return typeof out.payload === 'string' ? out.payload : null;
}

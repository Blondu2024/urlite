# Stable Short Links Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give a Urlite site an optional short, stable link so its QR code fits on a van and keeps working after the site is edited.

**Architecture:** A short link does not host the site; it remembers which link the site is. `GET /x/<id>` looks the encoded payload up in Upstash Redis and answers `302` to the existing viewer at `/s/#v1.<payload>`. One self-contained Vercel function (`api/link.ts`) holds every handler behind an injected store interface, so all of it is unit-testable without network or credentials. The viewer, the codec and `renderSiteHTML()` are not touched.

**Tech Stack:** TypeScript, React 18, Vite 6, Vitest 3, `fflate` (already a dependency), Upstash Redis over its REST API (no client library), Vercel functions using the Web `Request`/`Response` signature.

**Spec:** `docs/superpowers/specs/2026-08-19-urlite-shortlink-design.md`

## Global Constraints

- **No new npm dependencies.** Upstash is reached with `fetch`. `fflate` and `qrcode` are already in `package.json`.
- **`api/link.ts` must be self-contained.** Relative imports into `../src` fail at runtime on Vercel's builder (see the header comment in `api/fetch-site.ts`). Helpers are exported by name from `api/link.ts` itself; tests import them from there. Vercel picks up the `GET` and `POST` exports.
- **Short links are served from a separate host**, never from `urlite.app`. The host name is `urlite-x.vercel.app` unless it is taken, in which case pick the closest free `*.vercel.app` name and use it consistently everywhere in Task 5 and Task 9.
- **The long link stays the default.** Everything in this plan is opt-in; a user who never presses the new button gets exactly today's behaviour, byte for byte.
- **Id alphabet:** `23456789abcdefghjkmnpqrstuvwxyz` (31 characters, no `0`, `o`, `1`, `l`, `i`). Length 10.
- **Secret:** 16 random bytes, base64url, no padding. Stored only as a SHA-256 hex digest.
- **Payload cap:** 65536 characters of the encoded `v1.…` string.
- **Rate limits:** 4 writes per IP per minute, 30 reads per IP per minute, per warm instance.
- **Copy rule:** no em dashes anywhere in user-facing strings.
- **Commit trailer:** every commit ends with `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.
- **Never push and never deploy without asking.** Local commits are fine.
- **Runtime:** Node 24 locally, verified to have `crypto.getRandomValues`, `crypto.subtle.digest` and `btoa` as globals. No polyfill is needed and none should be added.
- **The test environment must not define `SHORT_HOST`, `UPSTASH_REDIS_REST_URL` or `UPSTASH_REDIS_REST_TOKEN`.** Two tests depend on their absence: the 503 in Task 4 and the default short host in Task 6. If a shell ever exports them, those tests reach the network and the failure is the environment, not the code.

---

### Task 1: Primitives — ids, secrets, payload validation

The pure functions everything else stands on. No store, no HTTP.

**Files:**
- Create: `api/link.ts`
- Test: `test/shortlink-core.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `ID_ALPHABET: string`
  - `newId(): string` — 10 chars from `ID_ALPHABET`
  - `newSecret(): string` — base64url of 16 random bytes
  - `sha256Hex(s: string): Promise<string>` — 64 lowercase hex chars
  - `sameSecret(hash: string, candidate: string): Promise<boolean>` — constant-time compare of digests
  - `MAX_PAYLOAD: number` — `65536`
  - `validPayload(v: unknown): v is string` — `v1.` prefix, under the cap, inflates, parses as JSON, is a plain object with `v === 1`, a string `brandName`, and objects at `theme` and `hero`

- [ ] **Step 1: Write the failing test**

Create `test/shortlink-core.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { deflateSync, strToU8 } from 'fflate';
import {
  ID_ALPHABET,
  MAX_PAYLOAD,
  newId,
  newSecret,
  sameSecret,
  sha256Hex,
  validPayload,
} from '../api/link';
import { buildPreset } from '../src/site/presets';
import { encodeSite } from '../src/site/codec';

/**
 * A short link is a name for a site. These are the primitives that make the
 * name unguessable, the key unforgeable, and the stored payload something we
 * are willing to hand back to a browser.
 */

describe('newId', () => {
  it('is ten characters from the unambiguous alphabet', () => {
    for (let i = 0; i < 200; i++) {
      const id = newId();
      expect(id).toHaveLength(10);
      for (const ch of id) expect(ID_ALPHABET).toContain(ch);
    }
  });

  it('never uses characters people misread', () => {
    expect(ID_ALPHABET).not.toMatch(/[01ilo]/);
  });

  it('does not repeat itself across a thousand draws', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 1000; i++) seen.add(newId());
    expect(seen.size).toBe(1000);
  });
});

describe('newSecret', () => {
  it('is base64url and long enough to be worth nothing to guess', () => {
    const s = newSecret();
    expect(s).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(newSecret()).not.toBe(s);
  });
});

describe('sha256Hex / sameSecret', () => {
  it('hashes to 64 hex characters', async () => {
    expect(await sha256Hex('hello')).toMatch(/^[0-9a-f]{64}$/);
  });

  it('accepts the right secret and refuses everything else', async () => {
    const secret = newSecret();
    const hash = await sha256Hex(secret);
    expect(await sameSecret(hash, secret)).toBe(true);
    expect(await sameSecret(hash, newSecret())).toBe(false);
    expect(await sameSecret(hash, '')).toBe(false);
  });
});

describe('validPayload', () => {
  const real = encodeSite(buildPreset('garden', 'en'));

  it('accepts what the editor actually produces', () => {
    expect(validPayload(real)).toBe(true);
  });

  it('refuses anything that is not a string', () => {
    expect(validPayload(null)).toBe(false);
    expect(validPayload(42)).toBe(false);
    expect(validPayload({ payload: real })).toBe(false);
  });

  it('refuses a payload without our prefix', () => {
    expect(validPayload(real.slice(3))).toBe(false);
    expect(validPayload('v2.' + real.slice(3))).toBe(false);
  });

  it('refuses a payload over the cap without trying to inflate it', () => {
    expect(validPayload('v1.' + 'a'.repeat(MAX_PAYLOAD))).toBe(false);
  });

  it('refuses bytes that do not inflate', () => {
    expect(validPayload('v1.bm90LWRlZmxhdGVk')).toBe(false);
  });

  it('refuses valid deflate that is not a site', () => {
    const pack = (o: unknown) => {
      const bytes = deflateSync(strToU8(JSON.stringify(o)), { level: 9 });
      let bin = '';
      for (const b of bytes) bin += String.fromCharCode(b);
      return 'v1.' + btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    };
    expect(validPayload(pack('just a string'))).toBe(false);
    expect(validPayload(pack({ hello: 'world' }))).toBe(false);
    expect(validPayload(pack({ v: 1, brandName: 'X' }))).toBe(false);
    expect(validPayload(pack({ v: 2, brandName: 'X', theme: {}, hero: {} }))).toBe(false);
    expect(validPayload(pack({ v: 1, brandName: 7, theme: {}, hero: {} }))).toBe(false);
  });

  it('accepts the minimum shape the renderer needs', () => {
    const bytes = deflateSync(
      strToU8(JSON.stringify({ v: 1, brandName: 'X', theme: {}, hero: {} })),
      { level: 9 },
    );
    let bin = '';
    for (const b of bytes) bin += String.fromCharCode(b);
    const packed = 'v1.' + btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    expect(validPayload(packed)).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test and watch it fail**

Run: `npx vitest run test/shortlink-core.test.ts`
Expected: FAIL — `Failed to resolve import "../api/link"`.

- [ ] **Step 3: Write the minimal implementation**

Create `api/link.ts`:

```ts
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
```

- [ ] **Step 4: Run the test and watch it pass**

Run: `npx vitest run test/shortlink-core.test.ts`
Expected: PASS, 12 tests.

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: no output, exit 0.

- [ ] **Step 6: Commit**

```bash
git add api/link.ts test/shortlink-core.test.ts
git commit -m "feat(links): the primitives a short link is made of

Ids from an alphabet with no characters people misread, secrets kept
only as digests, and the guard that matters: a stored payload has to
inflate into something the editor could have made.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: Create and update, behind an injected store

**Files:**
- Modify: `api/link.ts`
- Test: `test/shortlink-api.test.ts`

**Interfaces:**
- Consumes: `newId`, `newSecret`, `sha256Hex`, `sameSecret`, `validPayload`, `MAX_PAYLOAD` from Task 1.
- Produces:
  - `interface Store { get(key: string): Promise<string | null>; set(key: string, value: string): Promise<void>; }`
  - `interface LinkRecord { payload: string; secretHash: string; createdAt: number; updatedAt: number; }`
  - `keyOf(id: string): string` — `` `x:${id}` ``
  - `handlePost(body: unknown, store: Store, now?: number): Promise<Response>`

`handlePost` decides by body shape: `{ payload }` creates, `{ id, secret, payload }` updates.

Responses:
- create OK → `200 { ok: true, id, secret }`
- update OK → `200 { ok: true }`
- bad/oversized/non-site payload → `422 { ok: false, error: 'not a site' }`
- malformed body → `400 { ok: false, error: 'bad request' }`
- unknown id → `404 { ok: false, error: 'no such link' }`
- wrong secret → `403 { ok: false, error: 'forbidden' }`

- [ ] **Step 1: Write the failing test**

Create `test/shortlink-api.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { handlePost, keyOf, type Store } from '../api/link';
import { buildPreset } from '../src/site/presets';
import { encodeSite } from '../src/site/codec';

/**
 * The store is injected, so every rule here is provable without a network,
 * a Redis, or a credential.
 */

function memoryStore(): Store & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    async get(k) {
      return map.get(k) ?? null;
    },
    async set(k, v) {
      map.set(k, v);
    },
  };
}

const payloadA = encodeSite(buildPreset('garden', 'en'));
const payloadB = encodeSite(buildPreset('salon', 'ro'));

async function body(res: Response): Promise<Record<string, unknown>> {
  return (await res.json()) as Record<string, unknown>;
}

describe('create', () => {
  it('stores the payload and hands back an id and a secret', async () => {
    const store = memoryStore();
    const res = await handlePost({ payload: payloadA }, store, 1000);
    expect(res.status).toBe(200);
    const out = await body(res);
    expect(out.ok).toBe(true);
    expect(typeof out.id).toBe('string');
    expect(typeof out.secret).toBe('string');

    const raw = store.map.get(keyOf(out.id as string));
    expect(raw).toBeTruthy();
    const rec = JSON.parse(raw as string);
    expect(rec.payload).toBe(payloadA);
    expect(rec.createdAt).toBe(1000);
    expect(rec.updatedAt).toBe(1000);
  });

  it('never stores the secret itself', async () => {
    const store = memoryStore();
    const out = await body(await handlePost({ payload: payloadA }, store, 1000));
    const raw = store.map.get(keyOf(out.id as string)) as string;
    expect(raw).not.toContain(out.secret as string);
    expect(JSON.parse(raw).secretHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('refuses a payload that is not a site', async () => {
    const store = memoryStore();
    const res = await handlePost({ payload: 'v1.not-a-site' }, store, 1000);
    expect(res.status).toBe(422);
    expect(store.map.size).toBe(0);
  });

  it('refuses a body it cannot read', async () => {
    const store = memoryStore();
    expect((await handlePost(null, store, 1000)).status).toBe(400);
    expect((await handlePost({}, store, 1000)).status).toBe(400);
  });
});

describe('update', () => {
  async function seeded() {
    const store = memoryStore();
    const out = await body(await handlePost({ payload: payloadA }, store, 1000));
    return { store, id: out.id as string, secret: out.secret as string };
  }

  it('replaces the payload when the secret is right', async () => {
    const { store, id, secret } = await seeded();
    const res = await handlePost({ id, secret, payload: payloadB }, store, 2000);
    expect(res.status).toBe(200);

    const rec = JSON.parse(store.map.get(keyOf(id)) as string);
    expect(rec.payload).toBe(payloadB);
    expect(rec.createdAt).toBe(1000);
    expect(rec.updatedAt).toBe(2000);
  });

  it('refuses a wrong secret and leaves the site alone', async () => {
    const { store, id } = await seeded();
    const res = await handlePost({ id, secret: 'nope', payload: payloadB }, store, 2000);
    expect(res.status).toBe(403);
    expect(JSON.parse(store.map.get(keyOf(id)) as string).payload).toBe(payloadA);
  });

  it('refuses an unknown id', async () => {
    const { store, secret } = await seeded();
    const res = await handlePost({ id: 'zzzzzzzzzz', secret, payload: payloadB }, store, 2000);
    expect(res.status).toBe(404);
  });

  it('refuses a new payload that is not a site', async () => {
    const { store, id, secret } = await seeded();
    const res = await handlePost({ id, secret, payload: 'v1.nope' }, store, 2000);
    expect(res.status).toBe(422);
    expect(JSON.parse(store.map.get(keyOf(id)) as string).payload).toBe(payloadA);
  });
});
```

- [ ] **Step 2: Run the test and watch it fail**

Run: `npx vitest run test/shortlink-api.test.ts`
Expected: FAIL — `handlePost` is not exported.

- [ ] **Step 3: Write the minimal implementation**

Append to `api/link.ts`:

```ts
export interface Store {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
}

export interface LinkRecord {
  payload: string;
  secretHash: string;
  createdAt: number;
  updatedAt: number;
}

export function keyOf(id: string): string {
  return `x:${id}`;
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}

function isId(v: unknown): v is string {
  return typeof v === 'string' && v.length === 10 && [...v].every((c) => ID_ALPHABET.includes(c));
}

async function read(store: Store, id: string): Promise<LinkRecord | null> {
  const raw = await store.get(keyOf(id));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as LinkRecord;
  } catch {
    return null;
  }
}

export async function handlePost(
  body: unknown,
  store: Store,
  now: number = Date.now(),
): Promise<Response> {
  if (typeof body !== 'object' || body === null) return json(400, { ok: false, error: 'bad request' });
  const b = body as { id?: unknown; secret?: unknown; payload?: unknown };

  if (b.id === undefined && b.secret === undefined) {
    if (b.payload === undefined) return json(400, { ok: false, error: 'bad request' });
    if (!validPayload(b.payload)) return json(422, { ok: false, error: 'not a site' });
    const id = newId();
    const secret = newSecret();
    const rec: LinkRecord = {
      payload: b.payload,
      secretHash: await sha256Hex(secret),
      createdAt: now,
      updatedAt: now,
    };
    await store.set(keyOf(id), JSON.stringify(rec));
    return json(200, { ok: true, id, secret });
  }

  if (!isId(b.id) || typeof b.secret !== 'string') {
    return json(400, { ok: false, error: 'bad request' });
  }
  const rec = await read(store, b.id);
  if (!rec) return json(404, { ok: false, error: 'no such link' });
  if (!(await sameSecret(rec.secretHash, b.secret))) {
    return json(403, { ok: false, error: 'forbidden' });
  }
  if (!validPayload(b.payload)) return json(422, { ok: false, error: 'not a site' });
  const next: LinkRecord = { ...rec, payload: b.payload, updatedAt: now };
  await store.set(keyOf(b.id), JSON.stringify(next));
  return json(200, { ok: true });
}
```

- [ ] **Step 4: Run the tests and watch them pass**

Run: `npx vitest run test/shortlink-api.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add api/link.ts test/shortlink-api.test.ts
git commit -m "feat(links): create and update, provable without a network

The store is an injected interface, so the rules that matter — right
secret rewrites, wrong secret leaves the site untouched, a payload that
is not a site is refused either way — are ordinary unit tests.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: Read and resolve

**Files:**
- Modify: `api/link.ts`
- Modify: `test/shortlink-api.test.ts`

**Interfaces:**
- Consumes: `Store`, `keyOf`, `handlePost` from Task 2.
- Produces: `handleGet(params: { id: unknown; go: boolean }, store: Store): Promise<Response>`

Behaviour:
- `go: false`, known id → `200 { ok: true, payload }`, `cache-control: no-store`
- `go: false`, unknown or malformed id → `404 { ok: false, error: 'no such link' }`
- `go: true`, known id → `302`, `location: /s/#<payload>` (relative on purpose, so the redirect can never leave the host it arrived on), `cache-control: no-store`
- `go: true`, unknown or malformed id → `302`, `location: /s/`, which lands on the viewer's existing "this link doesn't seem to have a website inside it" fallback

- [ ] **Step 1: Write the failing test**

Append to `test/shortlink-api.test.ts`:

```ts
import { handleGet } from '../api/link';

describe('read', () => {
  it('hands back the stored payload for a known id', async () => {
    const store = memoryStore();
    const out = await body(await handlePost({ payload: payloadA }, store, 1000));
    const res = await handleGet({ id: out.id, go: false }, store);
    expect(res.status).toBe(200);
    expect((await body(res)).payload).toBe(payloadA);
    expect(res.headers.get('cache-control')).toBe('no-store');
  });

  it('404s on an id nobody made', async () => {
    const store = memoryStore();
    expect((await handleGet({ id: 'zzzzzzzzzz', go: false }, store)).status).toBe(404);
    expect((await handleGet({ id: null, go: false }, store)).status).toBe(404);
    expect((await handleGet({ id: 'TOO-SHORT', go: false }, store)).status).toBe(404);
  });

  it('sees an update', async () => {
    const store = memoryStore();
    const out = await body(await handlePost({ payload: payloadA }, store, 1000));
    await handlePost({ id: out.id, secret: out.secret, payload: payloadB }, store, 2000);
    const res = await handleGet({ id: out.id, go: false }, store);
    expect((await body(res)).payload).toBe(payloadB);
  });
});

describe('resolve', () => {
  it('redirects into the viewer on the same host, with the site in the fragment', async () => {
    const store = memoryStore();
    const out = await body(await handlePost({ payload: payloadA }, store, 1000));
    const res = await handleGet({ id: out.id, go: true }, store);
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('/s/#' + payloadA);
    expect(res.headers.get('cache-control')).toBe('no-store');
  });

  it('never sends an absolute URL, so it cannot leave the host it arrived on', async () => {
    const store = memoryStore();
    const out = await body(await handlePost({ payload: payloadA }, store, 1000));
    const res = await handleGet({ id: out.id, go: true }, store);
    expect(res.headers.get('location')).not.toMatch(/^https?:/);
  });

  it('sends an unknown id to the viewer fallback rather than a bare 404', async () => {
    const store = memoryStore();
    const res = await handleGet({ id: 'zzzzzzzzzz', go: true }, store);
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('/s/');
  });
});
```

- [ ] **Step 2: Run the test and watch it fail**

Run: `npx vitest run test/shortlink-api.test.ts`
Expected: FAIL — `handleGet` is not exported.

- [ ] **Step 3: Write the minimal implementation**

Append to `api/link.ts`:

```ts
export async function handleGet(
  params: { id: unknown; go: boolean },
  store: Store,
): Promise<Response> {
  const rec = isId(params.id) ? await read(store, params.id) : null;

  if (params.go) {
    return new Response(null, {
      status: 302,
      headers: {
        /* relative on purpose: the redirect can never leave the host it
           arrived on, which is what keeps short links off the brand domain */
        location: rec ? '/s/#' + rec.payload : '/s/',
        'cache-control': 'no-store',
      },
    });
  }

  if (!rec) return json(404, { ok: false, error: 'no such link' });
  return json(200, { ok: true, payload: rec.payload });
}
```

- [ ] **Step 4: Run the tests and watch them pass**

Run: `npx vitest run test/shortlink-api.test.ts`
Expected: PASS, 14 tests.

- [ ] **Step 5: Commit**

```bash
git add api/link.ts test/shortlink-api.test.ts
git commit -m "feat(links): resolve a short link into the viewer, and read it back

The redirect is relative on purpose — a short link can never bounce the
browser onto another host, which is the whole point of serving them off
the brand domain. An unknown id lands on the viewer's own fallback
instead of a bare 404.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: The public surface — guards, Upstash, GET and POST

The only task with untestable edges (the network call to Upstash). Everything decidable stays in tested helpers.

**Files:**
- Modify: `api/link.ts`
- Modify: `test/shortlink-api.test.ts`

**Interfaces:**
- Consumes: `handleGet`, `handlePost`, `Store` from Tasks 2 and 3.
- Produces:
  - `ALLOWED_ORIGIN: RegExp`
  - `limited(ip: string, max: number): boolean`
  - `GET(request: Request): Promise<Response>`
  - `POST(request: Request): Promise<Response>`

Note the origin allowlist is copied verbatim from `api/rewrite.ts:24-25` so the two functions cannot drift apart.

- [ ] **Step 1: Write the failing test**

Append to `test/shortlink-api.test.ts`:

```ts
import { ALLOWED_ORIGIN, limited } from '../api/link';

describe('guards', () => {
  it('allows the origins the editor is actually served from', () => {
    expect(ALLOWED_ORIGIN.test('https://urlite.app')).toBe(true);
    expect(ALLOWED_ORIGIN.test('https://www.urlite.app')).toBe(true);
    expect(ALLOWED_ORIGIN.test('http://localhost:5173')).toBe(true);
    expect(ALLOWED_ORIGIN.test('https://urlite-x.vercel.app')).toBe(true);
  });

  it('refuses everybody else', () => {
    expect(ALLOWED_ORIGIN.test('https://evil.example')).toBe(false);
    expect(ALLOWED_ORIGIN.test('https://urlite.app.evil.example')).toBe(false);
    expect(ALLOWED_ORIGIN.test('')).toBe(false);
  });

  it('trips the rate limit at the number given and not before', () => {
    const ip = 'test-' + Math.random();
    for (let i = 0; i < 4; i++) expect(limited(ip, 4)).toBe(false);
    expect(limited(ip, 4)).toBe(true);
  });

  it('counts each address on its own', () => {
    const a = 'a-' + Math.random();
    const b = 'b-' + Math.random();
    for (let i = 0; i < 4; i++) limited(a, 4);
    expect(limited(a, 4)).toBe(true);
    expect(limited(b, 4)).toBe(false);
  });
});

describe('POST wrapper', () => {
  it('refuses a request from an origin we do not serve', async () => {
    const res = await POST(
      new Request('https://urlite.app/api/link', {
        method: 'POST',
        headers: { origin: 'https://evil.example', 'content-type': 'application/json' },
        body: JSON.stringify({ payload: payloadA }),
      }),
    );
    expect(res.status).toBe(403);
  });

  it('answers 503 when the store is not configured', async () => {
    const res = await POST(
      new Request('https://urlite.app/api/link', {
        method: 'POST',
        headers: { origin: 'https://urlite.app', 'content-type': 'application/json' },
        body: JSON.stringify({ payload: payloadA }),
      }),
    );
    expect(res.status).toBe(503);
  });
});
```

Add `POST` to the import at the top of the file.

Note on the 503 test: it passes because the test process has no `UPSTASH_REDIS_REST_URL` set. If the environment ever does have one, the test would reach the network, so guard it in the implementation by reading the env inside the handler, never at module load.

- [ ] **Step 2: Run the test and watch it fail**

Run: `npx vitest run test/shortlink-api.test.ts`
Expected: FAIL — `ALLOWED_ORIGIN`, `limited` and `POST` are not exported.

- [ ] **Step 3: Write the minimal implementation**

Append to `api/link.ts`:

```ts
declare const process: { env: Record<string, string | undefined> };

/* kept identical to api/rewrite.ts so the two cannot drift apart */
export const ALLOWED_ORIGIN =
  /^https?:\/\/(localhost(:\d+)?|urlite\.app|www\.urlite\.app|urlite-[a-z0-9-]+\.vercel\.app)$/i;

const WRITE_LIMIT = 4; // per IP per minute, per warm instance
const READ_LIMIT = 30;

const hits = new Map<string, number[]>();

export function limited(ip: string, max: number): boolean {
  const now = Date.now();
  const w = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  w.push(now);
  hits.set(ip, w);
  return w.length > max;
}

function clientIp(request: Request): string {
  return (request.headers.get('x-forwarded-for') ?? 'unknown').split(',')[0].trim();
}

/** Built per request, never at module load, so the tests never reach a network. */
function envStore(): Store | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  const auth = { authorization: `Bearer ${token}` };
  return {
    async get(key) {
      const r = await fetch(`${url}/get/${encodeURIComponent(key)}`, { headers: auth });
      if (!r.ok) return null;
      const d = (await r.json()) as { result?: string | null };
      return d.result ?? null;
    },
    async set(key, value) {
      const r = await fetch(`${url}/set/${encodeURIComponent(key)}`, {
        method: 'POST',
        headers: { ...auth, 'content-type': 'text/plain' },
        body: value,
      });
      if (!r.ok) throw new Error('store write failed');
    },
  };
}

export async function POST(request: Request): Promise<Response> {
  const origin = request.headers.get('origin') ?? '';
  if (!ALLOWED_ORIGIN.test(origin)) return json(403, { ok: false, error: 'forbidden' });
  if (limited(clientIp(request), WRITE_LIMIT)) return json(429, { ok: false, error: 'slow down' });

  const store = envStore();
  if (!store) return json(503, { ok: false, error: 'short links unavailable' });

  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    return json(400, { ok: false, error: 'bad request' });
  }
  try {
    return await handlePost(body, store);
  } catch {
    return json(502, { ok: false, error: 'store unavailable' });
  }
}

export async function GET(request: Request): Promise<Response> {
  if (limited(clientIp(request), READ_LIMIT)) return json(429, { ok: false, error: 'slow down' });

  const url = new URL(request.url);
  const go = url.searchParams.get('go') === '1';
  const store = envStore();
  if (!store) {
    return go
      ? new Response(null, { status: 302, headers: { location: '/s/', 'cache-control': 'no-store' } })
      : json(503, { ok: false, error: 'short links unavailable' });
  }
  try {
    return await handleGet({ id: url.searchParams.get('id'), go }, store);
  } catch {
    return json(502, { ok: false, error: 'store unavailable' });
  }
}
```

- [ ] **Step 4: Run the whole suite**

Run: `npm test`
Expected: PASS, everything green including the 97 that were already there.

- [ ] **Step 5: Typecheck and build**

Run: `npm run typecheck && npm run build`
Expected: both exit 0.

- [ ] **Step 6: Commit**

```bash
git add api/link.ts test/shortlink-api.test.ts
git commit -m "feat(links): the public endpoint, with the guards rewrite.ts already uses

Origin allowlist copied verbatim so the two functions cannot drift, a
per-IP rate limit, and an Upstash store built per request rather than at
module load — which is what keeps the tests off the network.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: Routing and host isolation

No unit test can reach `vercel.json`, so this task's deliverable is verified by reading the built config and, later, on the deployment.

**Files:**
- Modify: `vercel.json`

**Interfaces:**
- Consumes: `GET` from Task 4 (via the `/x/:id` rewrite).
- Produces: the routes `/x/:id` and the host rules the client in Tasks 6 to 8 assumes.

- [ ] **Step 1: Confirm the short host is free**

Run: `curl -s -o /dev/null -w '%{http_code}\n' https://urlite-x.vercel.app/`
Expected: a 404 from Vercel's edge, meaning nothing is deployed there and the name can be attached to the project. If it answers 200, pick another name and use it consistently for the rest of this task and Task 9.

- [ ] **Step 2: Write the config**

Replace `vercel.json` with:

```json
{
  "cleanUrls": true,
  "redirects": [
    {
      "source": "/x/:id",
      "has": [{ "type": "host", "value": "urlite.app" }],
      "destination": "https://urlite-x.vercel.app/x/:id",
      "permanent": false
    },
    {
      "source": "/",
      "has": [{ "type": "host", "value": "urlite-x.vercel.app" }],
      "destination": "https://urlite.app/",
      "permanent": false
    },
    {
      "source": "/app",
      "has": [{ "type": "host", "value": "urlite-x.vercel.app" }],
      "destination": "https://urlite.app/app",
      "permanent": false
    }
  ],
  "rewrites": [
    { "source": "/app", "destination": "/" },
    { "source": "/x/:id", "destination": "/api/link?id=:id&go=1" }
  ],
  "headers": [
    {
      "source": "/s/(.*)",
      "headers": [{ "key": "X-Robots-Tag", "value": "noindex" }]
    },
    {
      "source": "/s",
      "headers": [{ "key": "X-Robots-Tag", "value": "noindex" }]
    },
    {
      "source": "/x/(.*)",
      "headers": [{ "key": "X-Robots-Tag", "value": "noindex" }]
    }
  ]
}
```

Why the redirects come first: Vercel evaluates `redirects` before `rewrites`, so a `/x/:id` that lands on the brand domain is bounced to the short host before the rewrite could resolve it there.

- [ ] **Step 3: Check the config parses and the build still works**

Run: `node -e "JSON.parse(require('fs').readFileSync('vercel.json','utf8')); console.log('ok')" && npm run build`
Expected: `ok`, then a clean build.

- [ ] **Step 4: Commit**

```bash
git add vercel.json
git commit -m "feat(links): serve short links off a host that is not the brand

Safe Browsing acts per host — on 16 Aug urlite.app was flagged while
urlite-app.vercel.app stayed clean from the same deployment. Short links
resolve on urlite-x.vercel.app and the redirect into the viewer is
relative, so user pages never render on urlite.app. /x/* is noindex, as
/s/* already is.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

- [ ] **Step 5: Tell the user what they need to do**

Report, do not perform: the short host has to be attached to the `urlite` project in Vercel, and `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` set on it. No deploy happens without asking.

---

### Task 6: The client module

**Files:**
- Create: `src/app/shortlink.ts`
- Test: `test/shortlink-client.test.ts`

**Interfaces:**
- Consumes: the HTTP contract from Tasks 2 to 4.
- Produces:
  - `interface ManageKey { id: string; secret: string }`
  - `parseManageHash(hash: string): ManageKey | null`
  - `manageUrl(key: ManageKey, origin: string): string` — `` `${origin}/app#m=${id}.${secret}` ``
  - `MANAGE_KEY: string` — `'urlite-manage'`
  - `loadManageKey(): ManageKey | null` / `saveManageKey(k: ManageKey): void` / `clearManageKey(): void`
  - `createShortLink(payload: string): Promise<{ key: ManageKey; url: string }>`
  - `updateShortLink(key: ManageKey, payload: string): Promise<void>`
  - `readShortLink(id: string): Promise<string | null>`

The short URL is built by the server from `SHORT_HOST` and returned in the create response, so the client never has to know the host name. Add `url` to the create response in `api/link.ts` as part of this task, reading `process.env.SHORT_HOST` and falling back to `urlite-x.vercel.app`.

- [ ] **Step 1: Write the failing test**

Create `test/shortlink-client.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { manageUrl, parseManageHash } from '../src/app/shortlink';

/**
 * The management link is the only key to a printed site, so parsing it has to
 * be strict about what it accepts and quiet about what it does not.
 */

describe('parseManageHash', () => {
  it('reads a management link', () => {
    expect(parseManageHash('#m=a7fq2m9k3p.AbCdEfGhIjKlMnOpQrStUv')).toEqual({
      id: 'a7fq2m9k3p',
      secret: 'AbCdEfGhIjKlMnOpQrStUv',
    });
  });

  it('works without the leading hash', () => {
    expect(parseManageHash('m=a7fq2m9k3p.AbCdEfGhIjKlMnOpQrStUv')?.id).toBe('a7fq2m9k3p');
  });

  it('ignores an ordinary site link', () => {
    expect(parseManageHash('#v1.abcdef')).toBeNull();
    expect(parseManageHash('')).toBeNull();
    expect(parseManageHash('#')).toBeNull();
  });

  it('ignores anything malformed rather than throwing', () => {
    expect(parseManageHash('#m=')).toBeNull();
    expect(parseManageHash('#m=onlyanid')).toBeNull();
    expect(parseManageHash('#m=SHORT.secret')).toBeNull();
    expect(parseManageHash('#m=a7fq2m9k3p.')).toBeNull();
    expect(parseManageHash('#m=a7fq2m9k3p.has spaces')).toBeNull();
  });
});

describe('manageUrl', () => {
  it('is an editor link carrying the key', () => {
    expect(manageUrl({ id: 'a7fq2m9k3p', secret: 'sEcReT' }, 'https://urlite.app')).toBe(
      'https://urlite.app/app#m=a7fq2m9k3p.sEcReT',
    );
  });

  it('round-trips through the parser', () => {
    const key = { id: 'a7fq2m9k3p', secret: 'AbCdEfGhIjKlMnOpQrStUv' };
    const url = manageUrl(key, 'https://urlite.app');
    expect(parseManageHash(url.slice(url.indexOf('#')))).toEqual(key);
  });
});
```

- [ ] **Step 2: Run the test and watch it fail**

Run: `npx vitest run test/shortlink-client.test.ts`
Expected: FAIL — cannot resolve `../src/app/shortlink`.

- [ ] **Step 3: Write the minimal implementation**

Create `src/app/shortlink.ts`:

```ts
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
```

- [ ] **Step 4: Add `url` to the create response**

In `api/link.ts`, inside `handlePost`'s create branch, replace the success return with:

```ts
    const host = process.env.SHORT_HOST || 'urlite-x.vercel.app';
    return json(200, { ok: true, id, secret, url: `https://${host}/x/${id}` });
```

Move the `declare const process` line above `handlePost` if it currently sits below it.

- [ ] **Step 5: Extend the API test**

Append to `test/shortlink-api.test.ts`, inside the `create` describe:

```ts
  it('hands back a short url on the host meant for it', async () => {
    const store = memoryStore();
    const out = await body(await handlePost({ payload: payloadA }, store, 1000));
    expect(out.url).toBe(`https://urlite-x.vercel.app/x/${out.id}`);
  });
```

- [ ] **Step 6: Run everything**

Run: `npm test && npm run typecheck`
Expected: all green.

- [ ] **Step 7: Commit**

```bash
git add src/app/shortlink.ts test/shortlink-client.test.ts api/link.ts test/shortlink-api.test.ts
git commit -m "feat(links): the client half, and the server names the short url

The management link is the only key to a printed site, so the parser is
strict about what it accepts and silent about what it does not. The
server builds the short url from SHORT_HOST, so the client never needs
to know which host serves them.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 7: The Share modal

**Files:**
- Modify: `src/app/Share.tsx`
- Modify: `src/app/app.css`
- Test: `test/share-shortlink.test.ts`

**Interfaces:**
- Consumes: `createShortLink`, `manageUrl`, `saveManageKey`, `type ManageKey` from Task 6.
- Produces: `Share` gains two props — `manage: ManageKey | null` and `onManage: (key: ManageKey) => void` — both passed by `Editor` in Task 8.

Behaviour: below the QR code, a section that explains the case and offers a button. On success the modal shows the short link, regenerates the QR from it (a ten-character id always fits), and shows the management link with a plain warning that it is the key. Pressing it again is not possible once a link exists; the section then shows what already exists.

- [ ] **Step 1: Write the failing test**

Create `test/share-shortlink.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { Share } from '../src/app/Share';
import { buildPreset } from '../src/site/presets';
import { encodeSite } from '../src/site/codec';

/**
 * The app and shop templates encode to more than a QR code can hold, so the
 * two templates aimed at businesses are exactly the ones that cannot be
 * printed. This is the way out, and it stays opt-in: the long link is still
 * what the modal offers first.
 */

const cfg = buildPreset('garden', 'en');
const link = 'https://urlite.app/s/#' + encodeSite(cfg);

const render = (props: Record<string, unknown> = {}) =>
  renderToStaticMarkup(
    createElement(Share, {
      config: cfg,
      link,
      bytes: encodeSite(cfg).length,
      onClose: () => {},
      manage: null,
      onManage: () => {},
      ...props,
    } as never),
  );

describe('the printable link section', () => {
  it('offers it without pushing it', () => {
    const html = render();
    expect(html).toContain('Copy link');
    expect(html.toLowerCase()).toContain('print');
  });

  it('does not claim there is no database once a short link exists', () => {
    const html = render({ manage: { id: 'a7fq2m9k3p', secret: 'AbCdEfGhIjKlMnOpQrStUv' } });
    expect(html).not.toContain('No server, no database, no account');
  });

  it('shows the management link as the thing to keep', () => {
    const html = render({ manage: { id: 'a7fq2m9k3p', secret: 'AbCdEfGhIjKlMnOpQrStUv' } });
    expect(html).toContain('#m=a7fq2m9k3p.AbCdEfGhIjKlMnOpQrStUv');
    expect(html.toLowerCase()).toMatch(/keep|save/);
  });

  it('uses no em dashes in anything it says', () => {
    expect(render()).not.toContain('—');
    expect(render({ manage: { id: 'a7fq2m9k3p', secret: 'AbCdEfGhIjKlMnOpQrStUv' } })).not.toContain('—');
  });
});
```

- [ ] **Step 2: Run the test and watch it fail**

Run: `npx vitest run test/share-shortlink.test.ts`
Expected: FAIL — the modal has no printable section and still carries the old sentence.

- [ ] **Step 3: Implement**

In `src/app/Share.tsx`:

1. Extend the props with `manage: ManageKey | null` and `onManage: (key: ManageKey) => void`, and import `createShortLink, manageUrl, type ManageKey` from `./shortlink`.
2. Add state: `const [shortUrl, setShortUrl] = useState<string | null>(null);` and `const [making, setMaking] = useState(false);` and `const [shortErr, setShortErr] = useState('');`.
3. The QR effect draws `shortUrl ?? props.link`, so it regenerates the moment a short link exists. Change the dependency array to `[props.link, shortUrl]` and reset `qrOk` to `true` at the top of the effect, otherwise a QR that failed on the long link never comes back.
4. Replace the lead paragraph so it is true in both cases:

```tsx
        <p className="sub">
          {props.manage
            ? 'The whole site still travels in the long link below. The short link is the only thing we remember for you, so a printed code can keep up with your edits.'
            : 'No server, no database, no account. The whole site, every word, colour and photo address, is folded into the characters of the link itself.'}
        </p>
```

5. Below the `share-meta` block, add:

```tsx
        <div className="share-print">
          {shortUrl || props.manage ? (
            <>
              <div className="share-link">
                <input readOnly value={shortUrl ?? ''} onFocus={(e) => e.target.select()} />
              </div>
              <p className="note">
                This is the link to print. Edit the site later and press
                “Update the printed link”, and every code already out there
                shows the new version.
              </p>
              {props.manage && (
                <>
                  <div className="share-link">
                    <input
                      readOnly
                      value={manageUrl(props.manage, location.origin)}
                      onFocus={(e) => e.target.select()}
                    />
                  </div>
                  <p className="note warn">
                    Keep this second link somewhere safe. It is the key to your
                    site. Anyone who has it can change what the printed code
                    shows, and nobody can get it back for you if you lose it.
                  </p>
                </>
              )}
            </>
          ) : (
            <>
              <p className="note">
                Going on a sign, a van or a business card? A short link stays
                the same when you edit the site, and its code fits however big
                the site grows.
              </p>
              <button
                className="btn btn-k btn-sm"
                disabled={making}
                onClick={async () => {
                  if (making) return;
                  setMaking(true);
                  setShortErr('');
                  try {
                    const made = await createShortLink(props.link.split('#')[1] ?? '');
                    setShortUrl(made.url);
                    props.onManage(made.key);
                  } catch {
                    setShortErr('Could not make a short link just now. Try again in a minute.');
                  } finally {
                    setMaking(false);
                  }
                }}
              >
                {making ? 'Making it…' : 'Make a short link I can print'}
              </button>
              {shortErr && <p className="note warn">{shortErr}</p>}
            </>
          )}
        </div>
```

6. In `app.css`, add next to the existing `.share-*` rules:

```css
.share-print { margin-top: 1.1rem; padding-top: 1rem; border-top: 1px solid var(--line); }
.share-print .note { font-size: .82rem; line-height: 1.5; opacity: .78; margin: .5rem 0 0; }
.share-print .note.warn { opacity: 1; color: var(--ink); font-weight: 500; }
```

If `--line` or `--ink` are not the variable names used in `app.css`, use whatever the neighbouring `.share-meta` rules use. Check before writing.

- [ ] **Step 4: Run the test and watch it pass**

Run: `npx vitest run test/share-shortlink.test.ts`
Expected: PASS, 4 tests.

If `renderToStaticMarkup` throws over `useRef` on a canvas, the component is fine and the test harness is not: render it inside a JSDOM global setup the way `test/toggle.test.ts` builds one, rather than weakening the component.

- [ ] **Step 5: Pin the promise that nothing else moved**

The spec's last testing bullet: the long link must be untouched by all of this.
Append to `test/share-shortlink.test.ts`:

```ts
describe('the long link is exactly what it was', () => {
  it('encodes the same bytes as before short links existed', () => {
    /* golden value: if this changes, the codec changed, and every link
       anybody has ever shared is now decoded by different code */
    const encoded = encodeSite(buildPreset('garden', 'en'));
    expect(encoded.startsWith('v1.')).toBe(true);
    expect(encoded).toBe(encodeSite(buildPreset('garden', 'en')));
    expect(encoded.length).toBeLessThan(4096);
  });

  it('renders a viewer page that knows nothing about short links', async () => {
    const { renderSiteHTML } = await import('../src/site/render');
    const html = renderSiteHTML(buildPreset('garden', 'en'), {
      appUrl: 'https://urlite.app/app',
      viewerBadge: true,
    });
    expect(html).not.toContain('/x/');
    expect(html).not.toContain('/api/link');
  });
});
```

Run: `npx vitest run test/share-shortlink.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 6: Run everything and commit**

Run: `npm test && npm run typecheck && npm run build`

```bash
git add src/app/Share.tsx src/app/app.css test/share-shortlink.test.ts
git commit -m "feat(share): a link you can actually print

The app and shop templates encode past what a QR code holds, so the two
templates aimed at businesses were the two that could not go on a van.
Opt-in, below the long link, which stays exactly as it was. The modal no
longer claims there is no database once you have taken a short link.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 8: Managing a printed site from the editor

**Files:**
- Modify: `src/app/Editor.tsx`
- Modify: `src/app/app.css`
- Test: `test/editor-manage.test.ts`

**Interfaces:**
- Consumes: everything from Task 6, plus the `Share` props from Task 7.
- Produces: nothing further.

Behaviour:
1. On mount, if `location.hash` parses as a management hash, fetch the payload, decode it with the existing `decodeSite` and `normalizeConfig`, set it as the config, and save the key. If the fetch fails, fall back to the normal empty start rather than a blank screen.
2. While a managed site is open, a bar shows that it has a printed link and offers `Update the printed link`. After a successful update the button reports it, and it reports failure honestly too.
3. `Start over` clears `urlite-manage` alongside `urlite-draft`.
4. The existing `history.replaceState('/app#' + encoded)` is untouched, so the draft keeps living in the address bar.

- [ ] **Step 1: Write the failing test**

Create `test/editor-manage.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';
import {
  MANAGE_KEY,
  clearManageKey,
  loadManageKey,
  saveManageKey,
} from '../src/app/shortlink';

/**
 * The key to a printed site has to survive a reload without living in the
 * address bar, because the editor rewrites the hash on every keystroke.
 */

beforeEach(() => {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    url: 'https://urlite.app/app',
  });
  (globalThis as { localStorage?: Storage }).localStorage = dom.window.localStorage;
});

describe('the management key in storage', () => {
  it('survives a round trip', () => {
    saveManageKey({ id: 'a7fq2m9k3p', secret: 'AbCdEfGhIjKlMnOpQrStUv' });
    expect(loadManageKey()).toEqual({ id: 'a7fq2m9k3p', secret: 'AbCdEfGhIjKlMnOpQrStUv' });
  });

  it('is nothing when nothing was saved', () => {
    expect(loadManageKey()).toBeNull();
  });

  it('ignores a corrupted record rather than throwing', () => {
    localStorage.setItem(MANAGE_KEY, 'not json');
    expect(loadManageKey()).toBeNull();
    localStorage.setItem(MANAGE_KEY, JSON.stringify({ id: 5 }));
    expect(loadManageKey()).toBeNull();
  });

  it('is gone after starting over', () => {
    saveManageKey({ id: 'a7fq2m9k3p', secret: 'AbCdEfGhIjKlMnOpQrStUv' });
    clearManageKey();
    expect(loadManageKey()).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test and watch it fail**

Run: `npx vitest run test/editor-manage.test.ts`
Expected: PASS on the storage helpers alone if Task 6 landed. That is fine: this file exists to pin the storage contract the editor depends on. The editor wiring itself is verified in Step 5 in a real browser, because it is a fetch plus a render and a unit test of it would test the mock.

- [ ] **Step 3: Wire the editor**

In `src/app/Editor.tsx`:

1. Import `{ clearManageKey, loadManageKey, parseManageHash, readShortLink, saveManageKey, updateShortLink, type ManageKey }` from `./shortlink`.
2. Add state next to the others:

```tsx
  const [manage, setManage] = useState<ManageKey | null>(null);
  const [pushing, setPushing] = useState<'' | 'busy' | 'done' | 'failed'>('');
```

3. Add a mount effect, before the debounce effect:

```tsx
  /* a management link opens the live version of a printed site, not the copy
     that link was made from — that copy would be frozen at creation time */
  useEffect(() => {
    const fromHash = parseManageHash(location.hash);
    if (fromHash) {
      setManage(fromHash);
      saveManageKey(fromHash);
      readShortLink(fromHash.id).then((payload) => {
        if (!payload) return;
        const raw = decodeSite(payload);
        if (raw !== null) setConfig(normalizeConfig(raw));
      });
      return;
    }
    setManage(loadManageKey());
  }, []);
```

4. In `startOver`, add `clearManageKey();` next to `localStorage.removeItem(DRAFT_KEY);` and `setManage(null);` next to `setConfig(null)`.
5. Render the bar inside the editor shell, directly under `.ed-top`, only when `manage` is set:

```tsx
        {manage && (
          <div className="managed">
            <span>This site has a printed link.</span>
            <button
              className="btn btn-k btn-sm"
              disabled={pushing === 'busy'}
              onClick={async () => {
                setPushing('busy');
                try {
                  await updateShortLink(manage, encoded);
                  setPushing('done');
                  setTimeout(() => setPushing(''), 2400);
                } catch {
                  setPushing('failed');
                }
              }}
            >
              {pushing === 'busy'
                ? 'Updating…'
                : pushing === 'done'
                  ? 'Updated ✓'
                  : pushing === 'failed'
                    ? 'Did not go through, try again'
                    : 'Update the printed link'}
            </button>
          </div>
        )}
```

6. Pass the new props where `Share` is used: `manage={manage}` and `onManage={(k) => { setManage(k); saveManageKey(k); }}`.
7. In `app.css`:

```css
.managed { display: flex; align-items: center; gap: .7rem; flex-wrap: wrap;
  padding: .5rem .9rem; font-size: .84rem; border-bottom: 1px solid var(--line); }
```

Match the variable names already used by `.ed-top`.

- [ ] **Step 4: Run everything**

Run: `npm test && npm run typecheck && npm run build`
Expected: all green.

- [ ] **Step 5: Prove it in a browser, locally**

Run `npm run dev`, then in the browser: build a site, open Share, press the button. Nothing will be created, because there is no local Upstash; the honest error message must appear rather than a blank state or a stuck spinner. That is the deliverable of this step: the failure path is correct. The success path is verified on the deployment, in Task 9, after the user has set the environment variables.

Do not click `New site` from an automation tool: it calls the native `confirm()` and blocks the whole Chrome extension.

- [ ] **Step 6: Commit**

```bash
git add src/app/Editor.tsx src/app/app.css test/editor-manage.test.ts
git commit -m "feat(editor): edit a site that already has a code on a van

A management link opens the live version, never the copy it was made
from, because a frozen copy is the bug this feature exists to fix. The
key lives in storage so the address bar can go on carrying the draft.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 9: Tell the truth about it, then verify on the deployment

**Files:**
- Modify: `README.md`
- Modify: `docs/superpowers/specs/2026-08-19-urlite-shortlink-design.md` (status line only)

**Interfaces:**
- Consumes: everything.
- Produces: nothing.

- [ ] **Step 1: Update the README**

The README states the site lives in the link and there is no backend, and that
sentence has to stay honest. Add this section after the one describing how the
link works, adjusting only the host name if Task 5 had to pick a different one:

```markdown
## Short links, if you need one on a van

The link a site lives in grows with the site, and past roughly 2.9 KB it stops
fitting in a QR code. The `app` and `shop` templates are both past that, which
made the two templates aimed at businesses the two you could not print.

So there is one optional exception to "no backend". Press "Make a short link I
can print" in the share dialog and you get `urlite-x.vercel.app/x/<id>`, which
answers a redirect into the ordinary viewer. Two things are stored against that
id: the same encoded site your long link already carries, and a SHA-256 of the
key you are given. Nothing else. No account, no email, no analytics, no cookie.

The key is a second link. Keep it. It is the only way to change what an already
printed code shows, and nobody can recover it for you.

Short links are served from a different host than urlite.app on purpose, so
pages made by strangers never render on the domain the editor lives on.

If you do not press that button, nothing changes. Your link is still the whole
site, still needs nothing from anybody, and still works if this project
disappears tomorrow.
```

- [ ] **Step 2: Run the full suite one more time**

Run: `npm test && npm run typecheck && npm run build`
Expected: all green. Record the test count.

- [ ] **Step 3: Ask before anything leaves the machine**

Ask the user for permission to push, and separately for permission to deploy. Neither happens without an explicit yes. Before deploying, confirm they have attached the short host to the project and set `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` and `SHORT_HOST`.

- [ ] **Step 4: Verify on production, in a real browser**

Only after a deploy the user approved:

1. In the editor on `urlite.app/app`, build a site from the `app` preset, which is the one that could not produce a QR code before. Open Share.
2. Press the button. A short link and a management link appear, and a QR code is now drawn where the `app` preset previously showed none.
3. Open the short link in a new tab. It lands on the viewer, on the short host, showing the site.
4. Copy the management link, open it in a fresh tab, change the business name, press `Update the printed link`.
5. Reload the short link from step 3. It shows the new name. This is the proof the whole feature exists for.
6. `curl -sI https://urlite-x.vercel.app/x/<id>` shows `302`, a relative `location` into `/s/#`, and `x-robots-tag: noindex`.
7. `curl -sI https://urlite.app/x/<id>` shows a redirect to the short host, so no user page renders on the brand domain.

- [ ] **Step 5: Commit the docs and report**

```bash
git add README.md docs/superpowers/specs/2026-08-19-urlite-shortlink-design.md
git commit -m "docs(links): say plainly what a short link stores

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

Report what was verified and what was not, with the test count and the production evidence from Step 4.

---

## Notes for whoever executes this

- Tasks 1 to 4 need no credentials and no network. If the environment has no Upstash variables, that is the expected state and the 503 test depends on it.
- Task 5 changes routing for the whole site. Run `npm run build` after it and read `vercel.json` back before committing.
- The long link and the codec are never modified. If a diff touches `src/site/codec.ts` or `src/viewer/`, something has gone wrong.

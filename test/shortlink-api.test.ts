import { describe, it, expect } from 'vitest';
import { handlePost, handleGet, keyOf, type Store, POST, GET, ALLOWED_ORIGIN, limited, storeUnavailableResponse } from '../api/link';
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

  it('hands back a short url on the host meant for it', async () => {
    const store = memoryStore();
    const out = await body(await handlePost({ payload: payloadA }, store, 1000));
    expect(out.url).toBe(`https://urlite-x.vercel.app/x/${out.id}`);
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

  it('write and read quotas are independent', () => {
    const ip = 'quota-test-' + Math.random();
    // Exhaust write quota for this IP
    for (let i = 0; i < 4; i++) expect(limited('w:' + ip, 4)).toBe(false);
    expect(limited('w:' + ip, 4)).toBe(true); // write limit hit
    // Read quota for same IP is still available
    expect(limited('r:' + ip, 30)).toBe(false);

    const ip2 = 'quota-test2-' + Math.random();
    // Exhaust read quota for this IP
    for (let i = 0; i < 30; i++) expect(limited('r:' + ip2, 30)).toBe(false);
    expect(limited('r:' + ip2, 30)).toBe(true); // read limit hit
    // Write quota for same IP is still available
    expect(limited('w:' + ip2, 4)).toBe(false);
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

describe('GET wrapper', () => {
  it('returns 503 when store is not configured', async () => {
    const res = await GET(
      new Request('https://urlite.app/api/link?id=zzzzzzzzzz', {
        method: 'GET',
        headers: { 'content-type': 'application/json' },
      }),
    );
    expect(res.status).toBe(503);
  });

  it('with go=1 redirects to /s/ when store is not configured', async () => {
    const res = await GET(
      new Request('https://urlite.app/api/link?id=zzzzzzzzzz&go=1', {
        method: 'GET',
        headers: { 'content-type': 'application/json' },
      }),
    );
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('/s/');
  });
});

describe('storeUnavailableResponse', () => {
  it('redirects to /s/ when go=true, regardless of status code', () => {
    const res503 = storeUnavailableResponse(true, 503);
    expect(res503.status).toBe(302);
    expect(res503.headers.get('location')).toBe('/s/');
    expect(res503.headers.get('cache-control')).toBe('no-store');

    const res502 = storeUnavailableResponse(true, 502);
    expect(res502.status).toBe(302);
    expect(res502.headers.get('location')).toBe('/s/');
    expect(res502.headers.get('cache-control')).toBe('no-store');
  });

  it('returns JSON error when go=false, with the appropriate status code', async () => {
    const res503 = storeUnavailableResponse(false, 503);
    expect(res503.status).toBe(503);
    expect(res503.headers.get('content-type')).toBe('application/json');
    const body503 = (await res503.json()) as Record<string, unknown>;
    expect(body503.error).toBe('short links unavailable');

    const res502 = storeUnavailableResponse(false, 502);
    expect(res502.status).toBe(502);
    expect(res502.headers.get('content-type')).toBe('application/json');
    const body502 = (await res502.json()) as Record<string, unknown>;
    expect(body502.error).toBe('store unavailable');
  });
});

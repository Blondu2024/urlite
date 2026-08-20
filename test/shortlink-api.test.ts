import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  handlePost,
  handleGet,
  keyOf,
  type Store,
  POST,
  GET,
  ALLOWED_ORIGIN,
  ID_ATTEMPTS,
  SWEEP_ABOVE,
  limited,
  rateLimitBuckets,
  cannotServeResponse,
  validPayload,
  storeConfigFromEnv,
} from '../api/link';
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

  /**
   * A repeated id would overwrite the record and its secretHash together,
   * handing somebody's printed site to whoever collided with them, with no
   * way to notice and no way back. Vanishingly unlikely, totally
   * unrecoverable, so it is checked rather than assumed.
   */
  describe('when the id it picked is already taken', () => {
    /** a store where the first `taken` ids offered already exist */
    function collidingStore(taken: number): Store & { map: Map<string, string>; seen: string[] } {
      const inner = memoryStore();
      const seen: string[] = [];
      return {
        map: inner.map,
        seen,
        async get(k) {
          seen.push(k);
          if (seen.length <= taken) return JSON.stringify({ payload: 'someone else' });
          return inner.get(k);
        },
        set: inner.set,
      };
    }

    it('picks another rather than overwriting the record that is there', async () => {
      const store = collidingStore(2);
      const out = await body(await handlePost({ payload: payloadA }, store, 1000));
      expect(out.ok).toBe(true);
      expect(store.seen).toHaveLength(3); // two taken, then a free one
      /* the two it walked away from are untouched */
      expect(store.map.size).toBe(1);
      expect(store.map.get(keyOf(out.id as string))).toContain(payloadA);
    });

    it('gives up loudly instead of writing over somebody', async () => {
      const store = collidingStore(Number.MAX_SAFE_INTEGER);
      const res = await handlePost({ payload: payloadA }, store, 1000);
      expect(res.status).toBe(503);
      expect(store.seen).toHaveLength(ID_ATTEMPTS);
      expect(store.map.size).toBe(0);
    });
  });
});

/**
 * atob implements forgiving-base64: it strips ASCII whitespace. A payload
 * carrying two CRLFs is four characters longer, which leaves the base64
 * length alignment intact, so it inflated cleanly and passed. It was
 * harmless only because undici rejected the location header it ended up in
 * and a catch turned that into a safe 302. Refuse the shape instead.
 */
describe('what counts as a payload', () => {
  const half = Math.floor(payloadA.length / 2);
  /* two CRLFs, not one: four characters keep the length modulo 4, which is
     exactly what let this through the old check */
  const smuggled = payloadA.slice(0, half) + '\r\n\r\n' + payloadA.slice(half);

  it('accepts a site the editor actually made', () => {
    expect(validPayload(payloadA)).toBe(true);
  });

  it('refuses a payload with CRLFs hidden inside it', () => {
    expect(validPayload(smuggled)).toBe(false);
  });

  it('refuses stray whitespace of every kind atob would have forgiven', () => {
    for (const ws of ['\r\n\r\n', '\t\t\t\t', '    ', '\f\f\f\f']) {
      expect(validPayload(payloadA + ws)).toBe(false);
      expect(validPayload('v1.' + ws + payloadA.slice(3))).toBe(false);
    }
  });

  it('refuses anything that is not v1. base64url from end to end', () => {
    expect(validPayload('v2.' + payloadA.slice(3))).toBe(false);
    expect(validPayload(payloadA.slice(3))).toBe(false);
    expect(validPayload('v1.')).toBe(false);
    expect(validPayload('v1.abc=def')).toBe(false);
    expect(validPayload('v1.abc/def')).toBe(false);
    expect(validPayload(42)).toBe(false);
  });

  it('will not store one either, through the ordinary public path', async () => {
    const store = memoryStore();
    expect((await handlePost({ payload: smuggled }, store, 1000)).status).toBe(422);
    expect(store.map.size).toBe(0);
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

  it('names the short url too, so a management link on a fresh machine can show it', async () => {
    const store = memoryStore();
    const out = await body(await handlePost({ payload: payloadA }, store, 1000));
    const read = await body(await handleGet({ id: out.id, go: false }, store));
    expect(read.url).toBe(`https://urlite-x.vercel.app/x/${out.id}`);
    expect(read.url).toBe(out.url);
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

/**
 * Host isolation, read off the routing table itself. Nothing legitimate ever
 * produces urlite.app/x/<id>: the API names only the short host and the share
 * dialog shows only that. A brand-host redirect would hand an abuser a
 * urlite.app URL that resolves to their page, so every abuse report would
 * then name the brand, which is the one thing this split exists to prevent.
 */
describe('routing: /x/ on the brand host', () => {
  const conf = JSON.parse(readFileSync(resolve(__dirname, '../vercel.json'), 'utf8')) as {
    redirects: { source: string; has?: { type: string; value: string }[]; destination: string }[];
    rewrites: { source: string; has?: { type: string; value: string }[]; destination: string }[];
  };

  it('is not redirected to the short host, it simply is not a route', () => {
    const brandX = conf.redirects.filter(
      (r) => r.source.startsWith('/x/') && r.has?.some((h) => h.value === 'urlite.app'),
    );
    expect(brandX).toEqual([]);
  });

  it('resolves only on the short host, and only there', () => {
    const rewrites = conf.rewrites.filter((r) => r.source.startsWith('/x/'));
    expect(rewrites).toHaveLength(1);
    expect(rewrites[0].has).toEqual([{ type: 'host', value: 'urlite-x.vercel.app' }]);
  });

  it('still sends somebody who lands on the short host home to the brand', () => {
    const home = conf.redirects.filter((r) =>
      r.has?.some((h) => h.type === 'host' && h.value === 'urlite-x.vercel.app'),
    );
    expect(home.map((r) => r.source).sort()).toEqual(['/', '/app']);
    for (const r of home) expect(r.destination).toContain('https://urlite.app');
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

describe('cannotServeResponse', () => {
  it('redirects to /s/ when go=true, regardless of status code', () => {
    for (const status of [429, 502, 503]) {
      const res = cannotServeResponse(true, status);
      expect(res.status).toBe(302);
      expect(res.headers.get('location')).toBe('/s/');
      expect(res.headers.get('cache-control')).toBe('no-store');
    }
  });

  it('returns JSON error when go=false, with the appropriate status code', async () => {
    const res503 = cannotServeResponse(false, 503);
    expect(res503.status).toBe(503);
    expect(res503.headers.get('content-type')).toBe('application/json');
    const body503 = (await res503.json()) as Record<string, unknown>;
    expect(body503.error).toBe('short links unavailable');

    const res502 = cannotServeResponse(false, 502);
    expect(res502.status).toBe(502);
    expect(res502.headers.get('content-type')).toBe('application/json');
    const body502 = (await res502.json()) as Record<string, unknown>;
    expect(body502.error).toBe('store unavailable');

    const res429 = cannotServeResponse(false, 429);
    expect(res429.status).toBe(429);
    const body429 = (await res429.json()) as Record<string, unknown>;
    expect(body429.error).toBe('slow down');
  });
});

/**
 * /x/:id rewrites into this GET, so a QR scan that trips the read limit,
 * which whole shared address pools do on a popular link, has to land in the
 * viewer. Showing a scanner raw JSON is the failure this feature exists to
 * remove.
 */
describe('a rate-limited GET', () => {
  const READ_LIMIT_PROBE = 32; // one past the 30 per minute the GET allows

  /* the limiter counts per address, so each case uses its own */
  const flood = async (ip: string, go: boolean) => {
    let last: Response | null = null;
    for (let i = 0; i < READ_LIMIT_PROBE; i++) {
      last = await GET(
        new Request(`https://urlite-x.vercel.app/api/link?id=zzzzzzzzzz${go ? '&go=1' : ''}`, {
          headers: { 'x-forwarded-for': ip },
        }),
      );
    }
    return last as Response;
  };

  it('sends a scan into the viewer rather than showing it JSON', async () => {
    const res = await flood('203.0.113.7', true);
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('/s/');
  });

  it('still answers the editor in JSON', async () => {
    const res = await flood('203.0.113.8', false);
    expect(res.status).toBe(429);
    expect((await body(res)).error).toBe('slow down');
  });
});

/**
 * Last in the file on purpose: the sweep is global, so it clears buckets the
 * tests above are done with. The exposure here is not the same as in
 * api/rewrite.ts, which this limiter was copied from: that one is Origin
 * gated, this GET is public and /x/:id rewrites into it, so every scanner on
 * the internet would otherwise leave a key behind for the life of the warm
 * instance.
 */
describe('the rate limiter does not grow forever', () => {
  it('drops the addresses that went quiet', () => {
    const base = Date.now();
    vi.useFakeTimers();
    try {
      vi.setSystemTime(base);
      for (let i = 0; i < SWEEP_ABOVE + 8; i++) limited('sweep-' + i, 30);
      expect(rateLimitBuckets()).toBeGreaterThan(SWEEP_ABOVE);

      /* a minute later every one of those windows is empty */
      vi.setSystemTime(base + 61_000);
      limited('sweep-after', 30);
      expect(rateLimitBuckets()).toBe(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps the addresses that are still knocking', () => {
    const base = Date.now();
    vi.useFakeTimers();
    try {
      vi.setSystemTime(base);
      for (let i = 0; i < SWEEP_ABOVE + 8; i++) limited('busy-' + i, 30);
      vi.setSystemTime(base + 30_000); // still inside the window
      limited('busy-again', 30);
      expect(rateLimitBuckets()).toBeGreaterThan(SWEEP_ABOVE);
      /* and the counting is unharmed */
      expect(limited('busy-0', 1)).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('storeConfigFromEnv', () => {
  const KV = { KV_REST_API_URL: 'https://kv.example', KV_REST_API_TOKEN: 'kv-token' };
  const UP = {
    UPSTASH_REDIS_REST_URL: 'https://up.example',
    UPSTASH_REDIS_REST_TOKEN: 'up-token',
  };

  it('reads the pair Vercel injects', () => {
    expect(storeConfigFromEnv({ ...KV })).toEqual({ url: 'https://kv.example', token: 'kv-token' });
  });

  it('reads the pair a hand-wired database carries', () => {
    expect(storeConfigFromEnv({ ...UP })).toEqual({ url: 'https://up.example', token: 'up-token' });
  });

  it('prefers the injected pair when both are present, and never mixes them', () => {
    expect(storeConfigFromEnv({ ...KV, ...UP })).toEqual({
      url: 'https://kv.example',
      token: 'kv-token',
    });
  });

  it('refuses a half pair rather than borrowing the other half', () => {
    /* the landmine: one database's url with another database's token */
    expect(storeConfigFromEnv({ KV_REST_API_URL: KV.KV_REST_API_URL, ...UP })).toEqual({
      url: 'https://up.example',
      token: 'up-token',
    });
    expect(
      storeConfigFromEnv({ KV_REST_API_URL: KV.KV_REST_API_URL, UPSTASH_REDIS_REST_TOKEN: 'x' }),
    ).toBeNull();
    expect(storeConfigFromEnv({ KV_REST_API_TOKEN: 'x' })).toBeNull();
  });

  it('is null when nothing is configured', () => {
    expect(storeConfigFromEnv({})).toBeNull();
  });
});

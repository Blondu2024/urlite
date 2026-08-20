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

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

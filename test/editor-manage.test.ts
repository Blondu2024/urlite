import { describe, it, expect, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';
import {
  MANAGE_KEY,
  clearManageKey,
  loadManageKey,
  saveManageKey,
  type ManageKey,
} from '../src/app/shortlink';
import { manageKeyFor, shouldForgetStoredKey, type ConfigSource } from '../src/app/Editor';
import { encodeSite } from '../src/site/codec';
import { buildPreset } from '../src/site/presets';
import type { SiteConfig } from '../src/site/types';

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

  it('keeps the printable url alongside the key', () => {
    saveManageKey({
      id: 'a7fq2m9k3p',
      secret: 'AbCdEfGhIjKlMnOpQrStUv',
      url: 'https://urlite-x.vercel.app/x/a7fq2m9k3p',
    });
    expect(loadManageKey()?.url).toBe('https://urlite-x.vercel.app/x/a7fq2m9k3p');
  });

  it('drops a url that is not a string rather than trusting it', () => {
    localStorage.setItem(
      MANAGE_KEY,
      JSON.stringify({ id: 'a7fq2m9k3p', secret: 'AbCdEfGhIjKlMnOpQrStUv', url: 7 }),
    );
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

/**
 * A stored management key only provably belongs to the config on screen
 * when that config is the draft it was saved alongside. A config that came
 * from a hash, whether an ordinary shared v1. link or a management link
 * still resolving, is somebody else's site (or not yet proven to be this
 * one), and must never inherit a key sitting in storage from before.
 */
describe('manageKeyFor: which config may keep the stored key', () => {
  const stored: ManageKey = { id: 'a7fq2m9k3p', secret: 'AbCdEfGhIjKlMnOpQrStUv' };

  it('restores the stored key for a config loaded from the draft', () => {
    expect(manageKeyFor('draft', stored)).toEqual(stored);
  });

  it('withholds the stored key for a config loaded from a shared hash (door two)', () => {
    expect(manageKeyFor('hash', stored)).toBeNull();
  });

  it('withholds the stored key when there is no config source at all', () => {
    expect(manageKeyFor(null, stored)).toBeNull();
  });

  it('returns null for the draft source when nothing was ever stored', () => {
    expect(manageKeyFor('draft', null)).toBeNull();
  });

  it('returns null for the hash source when nothing was ever stored', () => {
    expect(manageKeyFor('hash', null)).toBeNull();
  });

  it('returns null for no source when nothing was ever stored', () => {
    expect(manageKeyFor(null, null)).toBeNull();
  });
});

/**
 * Door three. manageKeyFor only withholds the key for one page load, but the
 * editor's debounce writes the draft on every tick whatever the config is, so
 * a foreign config that is allowed into the draft outlives the render that
 * withheld the key. The key has to leave storage, not just this render.
 */
describe('shouldForgetStoredKey: when the key stops belonging to the draft', () => {
  /* real payloads, so the byte-identity claim is actually exercised: the
     editor writes the draft and the address-bar hash from the same config in
     the same debounce tick, and encodeSite is deterministic */
  const mySite = encodeSite(buildPreset('garden', 'en'));
  const theirSite = encodeSite(buildPreset('salon', 'ro'));

  it('keeps it when the hash is your own site, byte for byte', () => {
    /* pressing F5 while editing your own printed site. Forgetting here would
       mean losing the only local copy of the key to a code already on a van */
    expect(shouldForgetStoredKey('hash', mySite, mySite)).toBe(false);
  });

  it('forgets it when the hash is a different site: this is the door', () => {
    expect(shouldForgetStoredKey('hash', theirSite, mySite)).toBe(true);
  });

  it('forgets it when there is no draft to compare against', () => {
    /* also the blocked or full storage case: the draft write failed, so the
       two differ, and forgetting is the safe direction */
    expect(shouldForgetStoredKey('hash', mySite, null)).toBe(true);
    expect(shouldForgetStoredKey('hash', null, mySite)).toBe(true);
  });

  it('tells two real sites apart rather than passing anything that decodes', () => {
    expect(mySite).not.toBe(theirSite);
    expect(mySite.startsWith('v1.')).toBe(true);
    expect(theirSite.startsWith('v1.')).toBe(true);
  });

  it('keeps it for the draft it was saved alongside', () => {
    expect(shouldForgetStoredKey('draft', null, mySite)).toBe(false);
    /* even a payload that differs cannot matter: the source is not a hash */
    expect(shouldForgetStoredKey('draft', theirSite, mySite)).toBe(false);
  });

  it('keeps it while a management link is still resolving', () => {
    /* source null is also the manage-link case, where the mount effect
       proves the key by fetching the payload; wiping here would break
       opening your own printed site */
    expect(shouldForgetStoredKey(null, null, mySite)).toBe(false);
    expect(shouldForgetStoredKey(null, theirSite, mySite)).toBe(false);
  });
});

/**
 * The whole three-step sequence, played out against real storage using only
 * the pure rules. No React, no DOM harness: each step is exactly what the
 * editor does at mount for that source.
 */
describe('the three-step door: short link, friend’s link, plain /app', () => {
  const mine: ManageKey = { id: 'a7fq2m9k3p', secret: 'AbCdEfGhIjKlMnOpQrStUv' };
  const DRAFT_KEY = 'urlite-draft';
  const mySite = buildPreset('garden', 'en');
  const theirSite = buildPreset('salon', 'ro');

  /** what the editor does at mount, for a config from `source` */
  const mount = (source: ConfigSource, hashPayload: string | null) => {
    const raw = localStorage.getItem(DRAFT_KEY);
    const draftPayload = raw ? encodeSite(JSON.parse(raw) as SiteConfig) : null;
    const key = manageKeyFor(source, loadManageKey());
    if (shouldForgetStoredKey(source, hashPayload, draftPayload)) clearManageKey();
    return key;
  };

  /** what the debounce does 250ms after that, from whatever is on screen */
  const debounce = (cfg: SiteConfig) => localStorage.setItem(DRAFT_KEY, JSON.stringify(cfg));

  it('does not offer the key over a friend’s site after a reload', () => {
    // 1. you made a short link, so the key is stored next to your draft
    debounce(mySite);
    saveManageKey(mine);
    expect(mount('draft', null)).toEqual(mine);

    // 2. you open a friend's editable link; no bar, but the debounce is
    //    about to write THEIR site into urlite-draft
    expect(mount('hash', encodeSite(theirSite))).toBeNull();
    debounce(theirSite);

    // 3. you open a plain /app: the draft is now their site
    expect(loadManageKey()).toBeNull();
    expect(mount('draft', null)).toBeNull();
  });

  it('survives pressing F5 on your own printed site', () => {
    /* the editor puts /app#<encoded> in the address bar on every debounce
       tick, so an ordinary reload boots from a v1. hash. That must not cost
       somebody the key to a code already printed on a van. */
    debounce(mySite);
    saveManageKey(mine);
    expect(mount('hash', encodeSite(mySite))).toBeNull(); // door two, no bar this load
    expect(loadManageKey()).toEqual(mine); // but the key is still yours
    expect(mount('draft', null)).toEqual(mine); // and comes back on a plain /app
  });

  it('still restores the key across an ordinary reload of your own draft', () => {
    debounce(mySite);
    saveManageKey(mine);
    expect(mount('draft', null)).toEqual(mine);
    expect(mount('draft', null)).toEqual(mine);
    expect(loadManageKey()).toEqual(mine);
  });
});

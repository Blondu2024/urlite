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
  it('forgets it when the config came from somebody else’s hash', () => {
    expect(shouldForgetStoredKey('hash')).toBe(true);
  });

  it('keeps it for the draft it was saved alongside', () => {
    expect(shouldForgetStoredKey('draft')).toBe(false);
  });

  it('keeps it while a management link is still resolving', () => {
    /* source null is also the manage-link case, where the mount effect
       proves the key by fetching the payload; wiping here would break
       opening your own printed site */
    expect(shouldForgetStoredKey(null)).toBe(false);
  });
});

/**
 * The whole three-step sequence, played out against real storage using only
 * the pure rules. No React, no DOM harness: each step is exactly what the
 * editor does at mount for that source.
 */
describe('the three-step door: short link, friend’s link, plain /app', () => {
  const mine: ManageKey = { id: 'a7fq2m9k3p', secret: 'AbCdEfGhIjKlMnOpQrStUv' };

  /** what the editor does at mount, for a config from `source` */
  const mount = (source: ConfigSource) => {
    const key = manageKeyFor(source, loadManageKey());
    if (shouldForgetStoredKey(source)) clearManageKey();
    return key;
  };

  it('does not offer the key over a friend’s site after a reload', () => {
    // 1. you made a short link, so the key is stored next to your draft
    saveManageKey(mine);
    expect(mount('draft')).toEqual(mine);

    // 2. you open a friend's editable link; no bar, but the debounce is
    //    about to write THEIR site into urlite-draft
    expect(mount('hash')).toBeNull();

    // 3. you open a plain /app: the draft is now their site
    expect(loadManageKey()).toBeNull();
    expect(mount('draft')).toBeNull();
  });

  it('still restores the key across an ordinary reload of your own draft', () => {
    saveManageKey(mine);
    expect(mount('draft')).toEqual(mine);
    expect(mount('draft')).toEqual(mine);
    expect(loadManageKey()).toEqual(mine);
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';
import {
  MANAGE_KEY,
  clearManageKey,
  loadManageKey,
  saveManageKey,
  type ManageKey,
} from '../src/app/shortlink';
import { manageKeyFor } from '../src/app/Editor';

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

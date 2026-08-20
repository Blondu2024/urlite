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

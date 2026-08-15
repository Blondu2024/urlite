import { describe, expect, it, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { JSDOM } from 'jsdom';

/**
 * Regression tests for two panel-layout bugs reported 15 Aug 2026 (Anthony
 * Lavizzo, desktop Chrome):
 *
 * 1. Theme swatches were not uniform — "Midnight & Coral" and "Forest & Honey"
 *    stood out. Root cause: long palette names wrapped to a second line inside
 *    the narrow grid cell, making those cards taller, and bare `1fr` columns
 *    let the longest word widen its column past an equal share.
 *
 * 2. The two phone fields sat misaligned — "Phone (with country code)" wraps
 *    to two label lines while "Phone, as shown" stays on one, so the inputs
 *    ended up at different heights inside `.f-row`.
 *
 * Both are made impossible by construction: swatch names may never wrap, and
 * fields inside a row pin their input to the bottom edge of the cell.
 */

const CSS = readFileSync(resolve(__dirname, '../src/app/app.css'), 'utf8');

/** The exact markup Editor.tsx renders for swatches and a phone `.f-row`. */
const MARKUP = `
  <div class="panel">
    <div class="acc open"><div class="acc-body">
      <div class="swatches">
        <button class="sw">
          <span class="sw-c"><i></i><i></i><i></i><i></i></span>
          <span>Espresso</span>
        </button>
        <button class="sw on">
          <span class="sw-c"><i></i><i></i><i></i><i></i></span>
          <span>Midnight &amp; Coral</span>
        </button>
      </div>
      <div class="f-row">
        <div class="f">
          <label>Phone (with country code)</label>
          <input type="text" />
        </div>
        <div class="f">
          <label>Phone, as shown</label>
          <input type="text" />
        </div>
      </div>
    </div></div>
  </div>`;

let dom: JSDOM;
let swatch: HTMLElement;
let swatchName: HTMLElement;
let rowField: HTMLElement;

beforeAll(() => {
  dom = new JSDOM(`<!doctype html><html><head><style>${CSS}</style></head><body>${MARKUP}</body></html>`);
  const d = dom.window.document;
  swatch = d.querySelector('.sw') as HTMLElement;
  swatchName = d.querySelector('.sw span:not(.sw-c)') as HTMLElement;
  rowField = d.querySelector('.f-row .f') as HTMLElement;
});

const css = (el: Element) => dom.window.getComputedStyle(el);

describe('theme swatches stay uniform', () => {
  it('never lets a palette name wrap to a second line', () => {
    // A wrapped name is what made "Midnight & Coral" taller than its peers.
    expect(css(swatchName).whiteSpace).toBe('nowrap');
    expect(css(swatchName).overflow).toBe('hidden');
    expect(css(swatchName).textOverflow).toBe('ellipsis');
  });

  it('lets the name area absorb any leftover height inside the card', () => {
    // Grid rows stretch cards to equal height; the name strip (paper
    // background) must fill the remainder so no card shows a bare gap.
    expect(css(swatch).display).toBe('flex');
    expect(css(swatch).flexDirection).toBe('column');
    expect(css(swatchName).flexGrow).toBe('1');
  });

  it('sizes the grid columns as equal shares, immune to content width', () => {
    // Bare `1fr` means minmax(auto, 1fr): the longest word can widen its
    // column. minmax(0, 1fr) makes every column exactly the same width.
    const rule = CSS.match(/\.swatches\s*\{[^}]*\}/)?.[0] ?? '';
    expect(rule).toContain('minmax(0, 1fr)');
  });
});

describe('paired fields align in a row', () => {
  it('pins each field to the bottom of its row cell', () => {
    // When one label wraps and its neighbour does not, the inputs only stay
    // level if the field column is bottom-justified.
    expect(css(rowField).display).toBe('flex');
    expect(css(rowField).flexDirection).toBe('column');
    expect(css(rowField).justifyContent).toBe('flex-end');
  });

  it('sizes the two row columns as equal shares', () => {
    const rule = CSS.match(/\.f-row\s*\{[^}]*\}/)?.[0] ?? '';
    expect(rule).toContain('minmax(0, 1fr)');
  });
});

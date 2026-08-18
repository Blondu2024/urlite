import { describe, expect, it, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { JSDOM } from 'jsdom';

/**
 * Regression test for the toggle switches in the editor panel.
 *
 * Reported 15 Aug 2026 (Anthony Lavizzo, Chrome/Windows): none of the on/off
 * switches could be operated — all that showed was a white dot sitting on top
 * of the label text. Root cause: `.f label { display: block }` (0,1,1) beat
 * `.toggle { display: flex }` (0,1,0), so the switch track `.tk` became an
 * inline box and collapsed to zero size, and the label rendered as a caption.
 *
 * These tests load the real stylesheet and the real Toggle markup, so they fail
 * if the cascade ever demotes the toggle back to a text label.
 */

const CSS = readFileSync(resolve(__dirname, '../src/app/app.css'), 'utf8');

/** The exact markup that fields.tsx `Toggle` renders, inside a `.f` wrapper. */
const MARKUP = `
  <div class="panel">
    <div class="acc open">
      <div class="acc-body">
        <div class="f">
          <label class="toggle">
            <input type="checkbox" checked />
            <span class="tk"></span>
            <span>Show the statement section</span>
          </label>
        </div>
        <div class="f">
          <label>Big line</label>
          <textarea></textarea>
        </div>
      </div>
    </div>
  </div>`;

let dom: JSDOM;
let label: HTMLLabelElement;
let input: HTMLInputElement;
let track: HTMLElement;
let plainLabel: HTMLLabelElement;

beforeAll(() => {
  dom = new JSDOM(`<!doctype html><html><head><style>${CSS}</style></head><body>${MARKUP}</body></html>`);
  const d = dom.window.document;
  label = d.querySelector('label.toggle') as HTMLLabelElement;
  input = d.querySelector('label.toggle input') as HTMLInputElement;
  track = d.querySelector('label.toggle .tk') as HTMLElement;
  plainLabel = d.querySelector('.f label:not(.toggle)') as HTMLLabelElement;
});

const css = (el: Element) => dom.window.getComputedStyle(el);

describe('toggle switch cascade', () => {
  it('lays the toggle label out as a flex row, not as a block caption', () => {
    // `.f label { display: block }` must not win over the toggle.
    expect(css(label).display).toBe('flex');
  });

  it('keeps the switch track a sized box so it is visible', () => {
    // An inline box ignores width/height — that is what collapsed the track.
    expect(css(track).display).not.toBe('inline');
    expect(css(track).width).toBe('40px');
    expect(css(track).height).toBe('24px');
  });

  it('does not render the toggle label with caption typography', () => {
    // The caption styling is what made the control read as a field title.
    expect(css(label).textTransform).not.toBe('uppercase');
    expect(css(plainLabel).textTransform).toBe('uppercase'); // ordinary field labels keep it
  });

  it('anchors the hidden checkbox to its own label, not to the viewport', () => {
    // Without a positioned ancestor the absolute checkbox is laid out against
    // the initial containing block: it stops scrolling with `.panel` and
    // inflates the document far beyond the 100svh app shell.
    expect(css(input).position).toBe('absolute');
    expect(css(label).position).toBe('relative');
  });
});

describe('toggle switch outside the editor panel (Share modal)', () => {
  // Reported 16 Aug 2026: the "Built with Urlite" toggle in the Share modal
  // rendered as a plain checkbox — the switch rules were scoped `.f .toggle`,
  // and the Share modal's toggle lives in `.share-actions`, not in a `.f`.
  const SHARE_MARKUP = `
    <div class="modal">
      <div class="share-actions">
        <label class="toggle">
          <input type="checkbox" checked />
          <span class="tk"></span>
          <span>“Built with Urlite” line in the footer</span>
        </label>
      </div>
    </div>`;

  let sdom: JSDOM;
  let sLabel: HTMLLabelElement;
  let sInput: HTMLInputElement;
  let sTrack: HTMLElement;
  const scss = (el: Element) => sdom.window.getComputedStyle(el);

  beforeAll(() => {
    sdom = new JSDOM(`<!doctype html><html><head><style>${CSS}</style></head><body>${SHARE_MARKUP}</body></html>`);
    const d = sdom.window.document;
    sLabel = d.querySelector('label.toggle') as HTMLLabelElement;
    sInput = d.querySelector('label.toggle input') as HTMLInputElement;
    sTrack = d.querySelector('label.toggle .tk') as HTMLElement;
  });

  it('lays the toggle out as a flex row in the Share modal too', () => {
    expect(scss(sLabel).display).toBe('flex');
  });

  it('keeps the track a sized 40×24 box, so it renders as a switch, not a checkbox', () => {
    expect(scss(sTrack).display).not.toBe('inline');
    expect(scss(sTrack).width).toBe('40px');
    expect(scss(sTrack).height).toBe('24px');
  });

  it('anchors the hidden checkbox to its own label', () => {
    expect(scss(sInput).position).toBe('absolute');
    expect(scss(sLabel).position).toBe('relative');
  });
});

describe('toggle stylesheet contract', () => {
  it('scopes the toggle rules at least as tightly as the field-label rules', () => {
    // `.f label` is (0,1,1). Every rule that styles the toggle label must match
    // or beat it, otherwise the caption rules silently take over again.
    const toggleRules = CSS.split('\n').filter(
      (line) => line.trimStart().startsWith('.toggle ') || line.trimStart().startsWith('.toggle{') || line.trimStart().startsWith('.toggle,') || /^\.toggle\s*\{/.test(line.trim()),
    );
    expect(toggleRules, 'bare `.toggle` selectors lose to `.f label`').toEqual([]);
  });
});

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Regression test for bug #5 reported 16 Aug 2026 (Anthony Lavizzo, mobile,
 * with screenshot): the editor's top bar did not wrap on narrow screens.
 *
 * Root cause: `.ed-top` is a fixed-height (60px) flex row with no `flex-wrap`,
 * and the `@media (max-width: 900px)` block restyled only `.ed-body`/`.panel`/
 * `.stage` — never the bar. Its children (logo, New site, device segment,
 * KB badge, Open, Share) have a combined min-content width wider than a phone
 * viewport, and flex items refuse to shrink below min-content, so the bar —
 * and with it the whole page — overflowed horizontally.
 *
 * jsdom has no layout engine and does not evaluate media queries, so like the
 * `minmax(0, 1fr)` checks in panel-layout.test.ts these assertions read the
 * mobile rule text itself.
 */

const CSS = readFileSync(resolve(__dirname, '../src/app/app.css'), 'utf8');

/** Everything from the 900px media query to the end of the stylesheet. */
const mobileBlock = CSS.slice(CSS.indexOf('@media (max-width: 900px)'));

const rule = (block: string, selector: string) =>
  block.match(new RegExp(selector.replace(/[.\\-]/g, '\\$&') + '\\s*\\{[^}]*\\}'))?.[0] ?? '';

describe('editor top bar on mobile', () => {
  it('has a mobile media block at all', () => {
    expect(mobileBlock).not.toBe('');
  });

  it('lets the bar wrap instead of forcing one overflowing row', () => {
    expect(rule(mobileBlock, '.ed-top')).toContain('flex-wrap: wrap');
  });

  it('releases the fixed 60px height so wrapped rows have room', () => {
    // With `height: 60px` kept, a second wrapped row would spill out of the
    // bar or be clipped; the bar must grow with its content on mobile.
    expect(rule(mobileBlock, '.ed-top')).toContain('height: auto');
  });

  it('keeps the desktop bar untouched: single 60px row', () => {
    const desktop = rule(CSS.slice(0, CSS.indexOf('@media (max-width: 900px)')), '.ed-top');
    expect(desktop).toContain('height: 60px');
    expect(desktop).not.toContain('flex-wrap');
  });
});

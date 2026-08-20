import { describe, expect, it } from 'vitest';
import { renderSiteHTML } from '../src/site/render';
import { buildPreset } from '../src/site/presets';

/**
 * Regression tests for the editor preview "strobing" reported 15 Aug 2026
 * (Damien Lavizzo — a distraction and a possible epilepsy trigger).
 *
 * The preview iframe already debounced updates (250 ms), but every refresh
 * swapped srcdoc → a full reload that replayed the ENTIRE first-visit
 * choreography: the hero riseIn entrance (~1.4 s of fade+rise), `.js .rv`
 * hiding everything below the fold until GSAP re-initialised, and the
 * before/after slider demo. Root cause: the preview rendered the "first
 * visit" experience instead of the settled document.
 *
 * Fix: `renderSiteHTML(cfg, { still: true })` renders the page already
 * settled — no entrance animations, no GSAP — while the viewer, the shared
 * link and the HTML export stay untouched.
 */

const cfg = buildPreset('garden', 'en');

const stripMotion = (html: string) =>
  html
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<style>[\s\S]*?<\/style>/g, '')
    .replace(/<html([^>]*?) class="still"/, '<html$1')
    .replace(/\n\s*\n+/g, '\n'); // blank lines left behind by removed tags don't count

describe('still preview mode', () => {
  const live = renderSiteHTML(cfg);
  const still = renderSiteHTML(cfg, { still: true });

  it('keeps the live document exactly as before', () => {
    expect(live).toContain("classList.add('js')");
    expect(live).toContain('gsap.min.js');
    expect(live).not.toContain('class="still"');
  });

  it('marks the settled document and neutralises the entrance animations', () => {
    expect(still).toContain('<html lang="en" class="still">');
    // riseIn must be switched off so the hero appears in its final state.
    expect(still).toMatch(/html\.still[^{]*\.rv-h[^{]*\{[^}]*animation:\s*none/);
  });

  it('never hides below-the-fold content behind the .js reveal gate', () => {
    // Without this, every keystroke blanked the page below the fold until
    // GSAP re-initialised inside the reloaded iframe.
    expect(still).not.toContain("classList.add('js')");
  });

  it('loads no GSAP at all — nothing left to replay the choreography', () => {
    expect(still).not.toContain('gsap.min.js');
    expect(still).not.toContain('ScrollTrigger');
  });

  it('keeps the page interactive: slider drag and the solid nav survive', () => {
    expect(still).toContain('data-slider');
    expect(still).toContain('pointerdown');
    expect(still).toContain("classList.toggle('solid'");
  });

  it('changes motion only — the visible content is identical to the live page', () => {
    expect(stripMotion(still)).toBe(stripMotion(live));
  });
});

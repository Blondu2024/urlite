import { describe, expect, it } from 'vitest';
import { normalizeConfig } from '../src/site/normalize';
import { renderSiteHTML } from '../src/site/render';
import { encodeSite, decodeSite } from '../src/site/codec';
import { buildPreset, PRESETS } from '../src/site/presets';

/**
 * The "app page" template promised publicly to Damien Lavizzo (16 Aug 2026):
 * the one-pager Apple/Google require for a store listing — what the app does,
 * plus the privacy policy and terms, on a single page.
 *
 * Two schema additions carry it, both backward-compatible (absent fields
 * normalize to "off"):
 *  - `legal`: long-prose sections (privacy policy, terms) with an anchor
 *  - `hero.ctaHref`: the primary button can link to a URL (the store listing)
 *    instead of dialling the phone
 */

const base = () => normalizeConfig({});

describe('legal section — normalization', () => {
  it('defaults to off for configs that predate it', () => {
    const c = normalizeConfig({ brandName: 'Old link' });
    expect(c.legal.on).toBe(false);
    expect(c.legal.sections).toEqual([]);
  });

  it('keeps well-formed sections and caps the arrays', () => {
    const c = normalizeConfig({
      legal: {
        on: true,
        headKicker: 'The fine print',
        headTitle: 'Privacy & terms',
        sections: Array.from({ length: 9 }, (_, i) => ({ title: `S${i}`, body: 'text' })),
      },
    });
    expect(c.legal.on).toBe(true);
    expect(c.legal.sections.length).toBeLessThanOrEqual(5);
    expect(c.legal.sections[0]).toEqual({ title: 'S0', body: 'text' });
  });

  it('lets a body be long enough for a real privacy policy', () => {
    const body = 'a'.repeat(5000);
    const c = normalizeConfig({ legal: { on: true, sections: [{ title: 'Privacy', body }] } });
    expect(c.legal.sections[0].body.length).toBe(5000);
  });
});

describe('legal section — rendering', () => {
  const withLegal = () => {
    const c = base();
    c.legal = {
      on: true,
      headKicker: 'The fine print',
      headTitle: 'Privacy & terms',
      sections: [
        { title: 'Privacy Policy', body: 'First paragraph.\n\nSecond paragraph.' },
        { title: 'Terms of Use', body: 'Only one.' },
      ],
    };
    return c;
  };

  it('renders an anchored section with every block', () => {
    const html = renderSiteHTML(withLegal());
    expect(html).toContain('id="legal"');
    expect(html).toContain('Privacy Policy');
    expect(html).toContain('Terms of Use');
  });

  it('splits blank-line-separated text into paragraphs', () => {
    const html = renderSiteHTML(withLegal());
    expect(html).toContain('<p>First paragraph.</p>');
    expect(html).toContain('<p>Second paragraph.</p>');
  });

  it('escapes hostile text in titles and bodies', () => {
    const c = base();
    c.legal = {
      on: true,
      headKicker: '',
      headTitle: '',
      sections: [{ title: '<script>alert(1)</script>', body: '<img src=x onerror=alert(1)>' }],
    };
    const html = renderSiteHTML(c);
    expect(html).not.toContain('<script>alert(1)');
    expect(html).not.toContain('<img src=x');
  });

  it('renders nothing when off or empty', () => {
    expect(renderSiteHTML(base())).not.toContain('id="legal"');
    const c = withLegal();
    c.legal.on = false;
    expect(renderSiteHTML(c)).not.toContain('id="legal"');
  });

  it('links the legal section from the nav when a label is set', () => {
    const c = withLegal();
    c.nav.legal = 'Privacy & terms';
    const html = renderSiteHTML(c);
    expect(html).toContain('href="#legal"');
  });
});

describe('hero primary CTA as a link', () => {
  it('uses ctaHref when there is no phone', () => {
    const c = base();
    c.hero.ctaPrimary = 'Get the app';
    c.hero.ctaHref = 'https://apps.apple.com/app/id0000000000';
    const html = renderSiteHTML(c);
    expect(html).toContain('href="https://apps.apple.com/app/id0000000000"');
    expect(html).toContain('Get the app');
  });

  it('drops unsafe schemes entirely', () => {
    const c = base();
    c.hero.ctaPrimary = 'Get the app';
    c.hero.ctaHref = 'javascript:alert(1)';
    const html = renderSiteHTML(c);
    expect(html).not.toContain('javascript:');
  });
});

describe('the app-page preset', () => {
  it('exists in all three languages', () => {
    const p = PRESETS.find((x) => x.id === 'app');
    expect(p).toBeDefined();
    for (const lang of ['en', 'ro', 'da'] as const) {
      expect(p!.copy[lang].brandName).toBeTruthy();
      expect(p!.label[lang]).toBeTruthy();
    }
  });

  it('ships with privacy policy and terms turned on', () => {
    const c = buildPreset('app', 'en');
    expect(c.legal.on).toBe(true);
    expect(c.legal.sections.length).toBeGreaterThanOrEqual(2);
    for (const s of c.legal.sections) {
      expect(s.title).toBeTruthy();
      expect(s.body.length).toBeGreaterThan(200);
    }
  });

  it('is an app page, not a call-us page', () => {
    const c = buildPreset('app', 'en');
    expect(c.hero.phone).toBe('');
    expect(c.hero.ctaHref).toMatch(/^https:/);
    expect(c.work.on).toBe(false);
  });

  it('survives the URL roundtrip with its legal text intact', () => {
    const c = buildPreset('app', 'en');
    const again = normalizeConfig(decodeSite('#' + encodeSite(c)));
    expect(again).toEqual(c);
  });
});

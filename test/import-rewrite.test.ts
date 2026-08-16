import { describe, expect, it, beforeAll } from 'vitest';
import { JSDOM } from 'jsdom';
import { buildPreset } from '../src/site/presets';
import { readableText } from '../src/import/extract';
import { applyBrief, type Brief } from '../src/import/rewrite';

/**
 * The AI finishing pass (approved by the user, 16 Aug 2026): heuristics can
 * only lift what a page declares (title, meta, photos) — the services, stats
 * and statement have to be WRITTEN in the business's own words. A cheap model
 * does that server-side; these tests cover the pure client pieces around it:
 * what we send (readable page text) and how a brief lands on the config.
 * The model call itself degrades gracefully — no brief, no changes.
 */

beforeAll(() => {
  globalThis.DOMParser = new JSDOM('').window.DOMParser as typeof DOMParser;
});

describe('readableText — what the model gets to read', () => {
  it('strips code and collapses whitespace', () => {
    const html = `<html><head><style>.x{color:red}</style><script>alert(1)</script></head>
      <body><h1>CreazaApp</h1>
      <p>Construiește   aplicații
      cu AI.</p><noscript>enable js</noscript></body></html>`;
    const t = readableText(html);
    expect(t).toContain('CreazaApp');
    expect(t).toContain('Construiește aplicații cu AI.');
    expect(t).not.toContain('alert(1)');
    expect(t).not.toContain('color:red');
    expect(t).not.toContain('enable js');
  });

  it('caps the length so token cost stays capped too', () => {
    const t = readableText(`<body>${'word '.repeat(5000)}</body>`);
    expect(t.length).toBeLessThanOrEqual(6000);
  });
});

describe('applyBrief — how the AI text lands on the template', () => {
  const brief: Brief = {
    tagline: 'AI app builder',
    kicker: 'Build apps with AI',
    heroTitle: 'Your app, *built by AI.*',
    lede: 'Describe your idea and get a working app.',
    stats: [
      { big: '5 min', small: 'From idea to app' },
      { big: 'AI', small: 'Writes the code' },
      { big: 'RO', small: 'Made in Romania' },
    ],
    ticker: ['No code needed', 'Deploy included'],
    statementBig: 'Software without the software team.',
    statementText: 'CreazaApp turns a plain-language description into a working product.',
    services: [
      { title: 'AI-generated sites', text: 'Describe it, get it.' },
      { title: 'Instant publishing', text: 'One click, live.' },
    ],
  };

  it('pours the brief into the config and keeps the template icons', () => {
    const base = buildPreset('business', 'en');
    const out = applyBrief(base, brief);
    expect(out.hero.title).toBe('Your app, *built by AI.*');
    expect(out.services.items[0].title).toBe('AI-generated sites');
    expect(out.services.items[0].icon).toBe(base.services.items[0].icon);
    expect(out.services.items.length).toBe(2);
    expect(out.hero.stats[0].big).toBe('5 min');
    expect(out.statement.big).toBe('Software without the software team.');
    expect(out.ticker.items).toEqual(['No code needed', 'Deploy included']);
  });

  it('ignores what the brief does not provide', () => {
    const base = buildPreset('business', 'ro');
    const out = applyBrief(base, { lede: 'Doar lede-ul.' });
    expect(out.hero.lede).toBe('Doar lede-ul.');
    expect(out.services.items).toEqual(base.services.items);
    expect(out.hero.title).toBe(base.hero.title);
  });

  it('refuses garbage: non-strings, oversize arrays, hostile lengths', () => {
    const base = buildPreset('business', 'en');
    const out = applyBrief(base, {
      heroTitle: 123 as unknown as string,
      lede: 'x'.repeat(9999),
      services: Array.from({ length: 20 }, (_, i) => ({ title: `S${i}`, text: 't' })),
      stats: [{ big: 'ok', small: 'ok' }, 'junk' as never],
    });
    expect(out.hero.title).toBe(base.hero.title); // non-string dropped
    expect(out.hero.lede.length).toBeLessThanOrEqual(340); // clamped
    expect(out.services.items.length).toBeLessThanOrEqual(8);
    expect(out.hero.stats.length).toBeLessThanOrEqual(3);
  });
});

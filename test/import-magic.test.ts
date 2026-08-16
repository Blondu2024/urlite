import { describe, expect, it, beforeAll } from 'vitest';
import { JSDOM } from 'jsdom';
import { buildPreset } from '../src/site/presets';
import { PALETTES } from '../src/site/palettes';
import { extractSite, nearestPalette } from '../src/import/extract';
import { isAllowedTarget } from '../api/fetch-site';

/**
 * The "magic import" (user's call, 16 Aug 2026: ease of use over features):
 * paste the link of an existing site → the editor opens with the business's
 * own words, photos and colours poured into a template.
 *
 * extractSite is pure heuristics over fetched HTML — no AI, no cost per use.
 * The serverless fetcher only proxies (CORS); everything here runs client-side.
 */

beforeAll(() => {
  // the extractor uses the browser's DOMParser; jsdom provides one for tests
  globalThis.DOMParser = new JSDOM('').window.DOMParser as typeof DOMParser;
});

const base = () => buildPreset('restaurant', 'en');

const RICH = `<!doctype html><html><head>
  <title>Bella Pizzeria | Best pizza in town</title>
  <meta property="og:title" content="Bella Pizzeria — Cluj">
  <meta name="description" content="Wood-fired pizza and fresh pasta in the heart of Cluj since 2011.">
  <meta property="og:image" content="https://bella.example/img/hero.jpg">
  <meta name="theme-color" content="#466E50">
  <script type="application/ld+json">{"@type":"Restaurant","name":"Bella Pizzeria",
    "telephone":"+40 264 000 000",
    "address":{"streetAddress":"Str. Memorandumului 12","addressLocality":"Cluj-Napoca"}}</script>
</head><body>
  <img src="/img/oven.jpg" width="1200" height="800">
  <img src="tiny.png" width="24" height="24">
  <img src="data:image/png;base64,AAAA">
  <a href="tel:+40264000000">0264 000 000</a>
  <a href="mailto:salut@bella.example">salut@bella.example</a>
</body></html>`;

describe('extractSite — heuristics', () => {
  it('pours the business into the template', () => {
    const { config, found } = extractSite(RICH, 'https://bella.example/meniu', base());
    expect(config.brandName).toBe('Bella Pizzeria — Cluj');
    expect(config.hero.lede).toContain('Wood-fired pizza');
    expect(config.hero.image).toBe('https://bella.example/img/hero.jpg');
    expect(config.gallery.images).toContain('https://bella.example/img/oven.jpg');
    expect(config.hero.phone).toBe('+40264000000');
    expect(found).toContain('title');
    expect(found).toContain('images');
    expect(found).toContain('phone');
  });

  it('routes phone, email and address into the contact rows', () => {
    const { config } = extractSite(RICH, 'https://bella.example/', base());
    const values = config.contact.rows.map((r) => r.value).join(' | ');
    expect(values).toContain('salut@bella.example');
    expect(values).toContain('Memorandumului');
  });

  it('skips tiny and data: images and resolves relative URLs', () => {
    const { config } = extractSite(RICH, 'https://bella.example/meniu', base());
    const all = [config.hero.image, ...config.gallery.images].join(' ');
    expect(all).not.toContain('tiny.png');
    expect(all).not.toContain('data:');
  });

  it('matches the site colour to the nearest palette', () => {
    // theme-color equals the forest brand exactly → forest must win
    const { config } = extractSite(RICH, 'https://bella.example/', base());
    const forest = PALETTES.find((p) => p.id === 'forest')!;
    expect(config.theme.brand).toBe(forest.brand);
  });

  it('drops hostile image URLs', () => {
    const html = `<html><head><meta property="og:image" content="javascript:alert(1)"></head><body></body></html>`;
    const b = base();
    const { config } = extractSite(html, 'https://x.example/', b);
    expect(config.hero.image).toBe(b.hero.image);
  });

  it('leaves the template untouched when the page offers nothing', () => {
    const b = base();
    const { config, found } = extractSite('<html><body>hi</body></html>', 'https://x.example/', b);
    expect(config).toEqual(b);
    expect(found).toEqual([]);
  });
});

describe('nearestPalette', () => {
  it('is exact on an exact brand colour', () => {
    expect(nearestPalette('#466E50')!.id).toBe('forest');
  });
  it('rejects garbage', () => {
    expect(nearestPalette('tomato')).toBeNull();
    expect(nearestPalette('')).toBeNull();
  });
});

describe('isAllowedTarget — the serverless fetcher must never reach inward', () => {
  const bad = [
    'ftp://example.com/x',
    'http://localhost:3000/',
    'https://127.0.0.1/admin',
    'https://10.0.0.4/',
    'https://192.168.1.5/router',
    'https://172.20.3.4/',
    'https://169.254.169.254/latest/meta-data',
    'https://[::1]/',
    'https://foo.internal/',
    'https://foo.local/',
    'not a url',
  ];
  const good = ['https://example.com', 'http://bella.example/meniu', 'https://172.32.0.1/'];

  for (const u of bad) it(`blocks ${u}`, () => expect(isAllowedTarget(u)).toBe(false));
  for (const u of good) it(`allows ${u}`, () => expect(isAllowedTarget(u)).toBe(true));
});

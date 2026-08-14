import { describe, it, expect } from 'vitest';
import { encodeSite, decodeSite } from '../src/site/codec';
import { normalizeConfig } from '../src/site/normalize';
import { renderSiteHTML } from '../src/site/render';
import { buildPreset, PRESETS } from '../src/site/presets';
import { escHtml, safeImageUrl, safeHref, telHref, safeColor } from '../src/site/sanitize';

const LANGS = ['en', 'ro', 'da'] as const;

describe('codec', () => {
  it('roundtrips every preset in every language', () => {
    for (const p of PRESETS) {
      for (const lang of LANGS) {
        const cfg = buildPreset(p.id, lang);
        const link = encodeSite(cfg);
        expect(link.startsWith('v1.')).toBe(true);
        const back = normalizeConfig(decodeSite(link));
        expect(back).toEqual(cfg);
      }
    }
  });

  it('rejects garbage payloads without throwing', () => {
    expect(decodeSite('')).toBeNull();
    expect(decodeSite('v1.!!!!not-base64!!!!')).toBeNull();
    expect(decodeSite('v2.AAAA')).toBeNull();
    expect(decodeSite('#v1.AAAA')).toBeNull(); // valid b64, invalid deflate
  });

  it('accepts a leading # (copied straight from location.hash)', () => {
    const cfg = buildPreset('garden', 'en');
    const link = encodeSite(cfg);
    expect(normalizeConfig(decodeSite('#' + link))).toEqual(cfg);
  });

  it('keeps a full preset link under 8 KB', () => {
    for (const p of PRESETS) {
      const link = encodeSite(buildPreset(p.id, 'en'));
      expect(link.length).toBeLessThan(8 * 1024);
    }
  });
});

describe('sanitising', () => {
  it('escapes HTML metacharacters', () => {
    expect(escHtml(`<script>alert("x")</script>`)).toBe(
      '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;',
    );
  });

  it('only allows http(s) image urls', () => {
    expect(safeImageUrl('https://images.unsplash.com/photo-1?x=1')).toContain('https://');
    expect(safeImageUrl('javascript:alert(1)')).toBe('');
    expect(safeImageUrl('data:image/png;base64,AAAA')).toBe('');
    expect(safeImageUrl('//evil.com/x.png')).toBe('');
  });

  it('restricts contact hrefs to http(s), tel:, mailto:', () => {
    expect(safeHref('tel:+40 700 000 000')).toBe('tel:+40700000000');
    expect(safeHref('mailto:a@b.com')).toBe('mailto:a@b.com');
    expect(safeHref('https://facebook.com/x')).toBe('https://facebook.com/x');
    expect(safeHref('javascript:alert(1)')).toBe('');
    expect(safeHref('vbscript:x')).toBe('');
  });

  it('builds tel: hrefs from free-typed numbers', () => {
    expect(telHref('+45 12 34 56 78')).toBe('tel:+4512345678');
    expect(telHref('abc')).toBe('');
  });

  it('validates colours strictly', () => {
    expect(safeColor('#AABBCC', '#000000')).toBe('#AABBCC');
    expect(safeColor('red', '#000000')).toBe('#000000');
    expect(safeColor('#AABBCC;background:url(x)', '#000000')).toBe('#000000');
  });
});

describe('XSS through the whole pipeline', () => {
  it('a hostile payload cannot inject markup into the rendered page', () => {
    const cfg = buildPreset('garden', 'en');
    cfg.brandName = '<img src=x onerror=alert(1)>';
    cfg.hero.title = '"><script>alert(2)</script>';
    cfg.hero.lede = "'; document.location='https://evil.com";
    cfg.theme.brand = '#123456;} body{background:url(javascript:1)' as never;
    cfg.hero.image = 'javascript:alert(3)';
    cfg.contact.rows = [{ label: 'x', value: 'y', href: 'javascript:alert(4)' }];

    const html = renderSiteHTML(normalizeConfig(JSON.parse(JSON.stringify(cfg))));
    expect(html).not.toContain('<img src=x');
    expect(html).not.toContain('<script>alert');
    expect(html).not.toContain('javascript:alert');
    // hostile colour got replaced by a valid palette colour
    expect(html).not.toContain('url(javascript');
  });

  it('survives a hostile payload crafted directly as a link', () => {
    const evil = { brandName: '<svg onload=alert(1)>', hero: { title: '<b>x</b>' } };
    const cfg = normalizeConfig(evil);
    const html = renderSiteHTML(cfg);
    expect(html).not.toContain('<svg onload');
    expect(html).not.toContain('<b>x</b>');
  });
});

describe('rendering', () => {
  it('renders every preset without empty-section artefacts', () => {
    for (const p of PRESETS) {
      for (const lang of LANGS) {
        const cfg = buildPreset(p.id, lang);
        const html = renderSiteHTML(cfg);
        expect(html).toContain(`<html lang="${lang}">`);
        expect(html).toContain(cfg.brandName.split(' ')[0]);
        // numbered rows, never card grids
        expect(html).toContain('>01<');
        expect(html).toContain('class="srow rv"');
        if (!cfg.work.on || cfg.work.items.length === 0) {
          expect(html).not.toContain('id="work"');
        }
        if (!cfg.ticker.on || cfg.ticker.items.length === 0) {
          expect(html).not.toContain('class="ticker"');
        }
      }
    }
  });

  it('turns *marks* into accent <em> in the hero title', () => {
    const cfg = buildPreset('garden', 'en');
    cfg.hero.title = 'We do it *properly.*';
    const html = renderSiteHTML(cfg);
    expect(html).toContain('We do it <em>properly.</em>');
  });

  it('omits sections that are switched off', () => {
    const cfg = buildPreset('garden', 'en');
    cfg.gallery.on = false;
    cfg.statement.on = false;
    cfg.band.on = false;
    cfg.work.on = false;
    const html = renderSiteHTML(cfg);
    expect(html).not.toContain('id="gallery"');
    expect(html).not.toContain('class="statement"');
    expect(html).not.toContain('class="emg"');
    expect(html).not.toContain('id="work"');
  });

  it('never gates the hero behind JS (approved-standard rule #1)', () => {
    const html = renderSiteHTML(buildPreset('garden', 'en'));
    // hero animates via CSS classes, reveal-gating applies only under .js
    expect(html).toContain('rv-h');
    expect(html).toContain("classList.remove('js')");
    expect(html).toMatch(/\.js \.rv\{/);
  });

  it('can render a bare export without the credit line', () => {
    const cfg = buildPreset('salon', 'ro');
    expect(renderSiteHTML(cfg)).toContain('class="credit"');
    expect(renderSiteHTML(cfg, { noCredit: true })).not.toContain('class="credit"');
  });
});

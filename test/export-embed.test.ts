import { describe, it, expect } from 'vitest';
import { buildPreset } from '../src/site/presets';
import { renderSiteHTML } from '../src/site/render';
import { collectImageUrls, embedImages } from '../src/site/embed';

/**
 * "The honest asterisk", closed: the shared link can only carry photo
 * *addresses* (the fragment is ~2.5 KB), but the downloaded HTML file has no
 * such limit — so at export time the photos themselves are fetched and packed
 * into the file as data: URIs. The link and codec are untouched; when a photo
 * cannot be fetched (CORS, network), the export falls back to its URL.
 */

const cfg = () => {
  const c = buildPreset('garden', 'en');
  c.hero.image = 'https://img.example/hero.jpg';
  c.statement.on = true;
  c.statement.image = 'https://img.example/statement.jpg';
  c.work.on = true;
  c.work.items = [
    { before: 'https://img.example/b1.jpg', after: 'https://img.example/a1.jpg', title: 'T', caption: 'C' },
  ];
  c.gallery.on = true;
  c.gallery.images = ['https://img.example/g1.jpg', 'https://img.example/hero.jpg'];
  return c;
};

describe('collectImageUrls', () => {
  it('gathers every image the page shows, deduped', () => {
    const urls = collectImageUrls(cfg());
    expect(urls.sort()).toEqual([
      'https://img.example/a1.jpg',
      'https://img.example/b1.jpg',
      'https://img.example/g1.jpg',
      'https://img.example/hero.jpg',
      'https://img.example/statement.jpg',
    ]);
  });

  it('drops non-http(s) values instead of trying to fetch them', () => {
    const c = cfg();
    c.hero.image = 'javascript:alert(1)';
    expect(collectImageUrls(c)).not.toContain('javascript:alert(1)');
  });
});

describe('renderSiteHTML imageData option', () => {
  const DATA = 'data:image/jpeg;base64,QUJD';

  it('substitutes the data URI for the URL in every image slot', () => {
    const c = cfg();
    const html = renderSiteHTML(c, {
      imageData: {
        'https://img.example/hero.jpg': DATA,
        'https://img.example/b1.jpg': DATA,
        'https://img.example/g1.jpg': DATA,
      },
    });
    expect(html).not.toContain('https://img.example/hero.jpg');
    expect(html).not.toContain('https://img.example/b1.jpg');
    expect(html).not.toContain('https://img.example/g1.jpg');
    expect(html).toContain(DATA);
    // unmapped images keep their URL — graceful fallback
    expect(html).toContain('https://img.example/a1.jpg');
    expect(html).toContain('https://img.example/statement.jpg');
  });

  it('ignores map values that are not data:image URIs', () => {
    const html = renderSiteHTML(cfg(), {
      imageData: { 'https://img.example/hero.jpg': 'javascript:alert(1)' },
    });
    expect(html).toContain('https://img.example/hero.jpg');
    expect(html).not.toContain('javascript:alert(1)');
  });

  it('renders byte-identically to before when the option is absent', () => {
    const c = cfg();
    expect(renderSiteHTML(c)).toBe(renderSiteHTML(c, { imageData: undefined }));
  });
});

describe('embedImages', () => {
  const png = (bytes: number[]) =>
    new Response(new Uint8Array(bytes), { status: 200, headers: { 'content-type': 'image/png' } });

  it('turns fetched images into data URIs keyed by URL', async () => {
    const map = await embedImages(['https://img.example/g1.png'], async () => png([65, 66, 67]));
    expect(map).toEqual({ 'https://img.example/g1.png': 'data:image/png;base64,QUJD' });
  });

  it('leaves out images whose fetch fails, so the export falls back to the URL', async () => {
    const map = await embedImages(['https://img.example/cors.png'], async () => {
      throw new TypeError('CORS');
    });
    expect(map).toEqual({});
  });

  it('leaves out non-OK responses and non-image content types', async () => {
    const map = await embedImages(
      ['https://img.example/404.png', 'https://img.example/page.html'],
      async (url) =>
        String(url).includes('404')
          ? new Response('nope', { status: 404 })
          : new Response('<html>', { status: 200, headers: { 'content-type': 'text/html' } }),
    );
    expect(map).toEqual({});
  });
});

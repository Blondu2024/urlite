import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { Share } from '../src/app/Share';
import { buildPreset } from '../src/site/presets';
import { encodeSite } from '../src/site/codec';

/**
 * The app and shop templates encode to more than a QR code can hold, so the
 * two templates aimed at businesses are exactly the ones that cannot be
 * printed. This is the way out, and it stays opt-in: the long link is still
 * what the modal offers first.
 */

vi.stubGlobal('location', { origin: 'https://urlite.app' });

const cfg = buildPreset('garden', 'en');
const link = 'https://urlite.app/s/#' + encodeSite(cfg);

const render = (props: Record<string, unknown> = {}) =>
  renderToStaticMarkup(
    createElement(Share, {
      config: cfg,
      link,
      bytes: encodeSite(cfg).length,
      onClose: () => {},
      manage: null,
      onManage: () => {},
      ...props,
    } as never),
  );

describe('the printable link section', () => {
  it('offers it without pushing it', () => {
    const html = render();
    expect(html).toContain('Copy link');
    expect(html.toLowerCase()).toContain('print');
  });

  it('does not claim there is no database once a short link exists', () => {
    const html = render({ manage: { id: 'a7fq2m9k3p', secret: 'AbCdEfGhIjKlMnOpQrStUv' } });
    expect(html).not.toContain('No server, no database, no account');
  });

  it('shows a real link to print for somebody who already has a key', () => {
    /* the box used to be filled only by the create button in this same modal
       instance, so every returning visit showed an empty input captioned
       "This is the link to print" */
    const html = render({ manage: { id: 'a7fq2m9k3p', secret: 'AbCdEfGhIjKlMnOpQrStUv' } });
    expect(html).toContain('This is the link to print');
    expect(html).toContain('https://urlite-x.vercel.app/x/a7fq2m9k3p');
    expect(html).not.toContain('value=""');
  });

  it('prefers the url the server named over the derived one', () => {
    const html = render({
      manage: {
        id: 'a7fq2m9k3p',
        secret: 'AbCdEfGhIjKlMnOpQrStUv',
        url: 'https://elsewhere.example/x/a7fq2m9k3p',
      },
    });
    expect(html).toContain('https://elsewhere.example/x/a7fq2m9k3p');
  });

  it('shows the management link as the thing to keep', () => {
    const html = render({ manage: { id: 'a7fq2m9k3p', secret: 'AbCdEfGhIjKlMnOpQrStUv' } });
    expect(html).toContain('#m=a7fq2m9k3p.AbCdEfGhIjKlMnOpQrStUv');
    expect(html.toLowerCase()).toMatch(/keep|save/);
  });

  it('uses no em dashes in anything it says', () => {
    expect(render()).not.toContain('—');
    expect(render({ manage: { id: 'a7fq2m9k3p', secret: 'AbCdEfGhIjKlMnOpQrStUv' } })).not.toContain('—');
  });
});

/**
 * The Share dialog was the loudest place the claim appeared, but it is not
 * the only one. A short link is a real exception to "no server, no database",
 * so nowhere in the project may state it flat.
 */
describe('the no-backend claim, everywhere it is made', () => {
  const read = async (rel: string) => {
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    return readFileSync(resolve(__dirname, '..', rel), 'utf8');
  };

  it('is qualified in the README', async () => {
    const text = await read('README.md');
    const line = text.split('\n').find((l) => l.includes('There is no database'));
    expect(line).toBeTruthy();
    expect(text).toMatch(/holds unless you choose a short link/);
  });

  it('is qualified on the landing page', async () => {
    const text = await read('src/app/Landing.tsx');
    expect(text).not.toContain('>No server · no database · no account<');
    expect(text).toContain('By default: no server · no database · no account');
  });

  it('is qualified in the meta description', async () => {
    const text = await read('index.html');
    const m = /<meta name="description" content="([^"]+)"/.exec(text);
    expect(m).toBeTruthy();
    expect(m?.[1]).toContain('By default');
    expect(m?.[1]).not.toContain('—');
  });

  it('does not say the record holds nothing but a payload and a hash', async () => {
    const text = await read('README.md');
    /* it also holds createdAt and updatedAt */
    expect(text).toContain('created and last changed');
  });
});

describe('the long link is exactly what it was', () => {
  it('encodes the same bytes as before short links existed', () => {
    /* golden value: if this changes, the codec changed, and every link
       anybody has ever shared is now decoded by different code */
    const encoded = encodeSite(buildPreset('garden', 'en'));
    expect(encoded.startsWith('v1.')).toBe(true);
    expect(encoded).toBe(encodeSite(buildPreset('garden', 'en')));
    expect(encoded.length).toBeLessThan(4096);
  });

  it('renders a viewer page that knows nothing about short links', async () => {
    const { renderSiteHTML } = await import('../src/site/render');
    const html = renderSiteHTML(buildPreset('garden', 'en'), {
      appUrl: 'https://urlite.app/app',
      viewerBadge: true,
    });
    expect(html).not.toContain('/x/');
    expect(html).not.toContain('/api/link');
  });
});

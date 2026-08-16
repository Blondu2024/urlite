import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { normalizeConfig } from '../src/site/normalize';
import { renderSiteHTML } from '../src/site/render';

/**
 * Safe Browsing incident, 16 Aug 2026: Google flagged urlite.app as
 * "deceptive pages" (no sample URLs — a classifier false positive on
 * user-made business-looking sites under one domain).
 *
 * Mitigation: pages served by the /s/ viewer must identify themselves as
 * visitor-made Urlite sites and offer a report link, so neither a crawler
 * nor a human reviewer can mistake them for the business they portray.
 * The HTML export (a client's own delivered site) stays untouched.
 */

const cfg = () => {
  const c = normalizeConfig({ brandName: 'Test Co' });
  return c;
};

describe('viewer identity badge', () => {
  it('appears when the viewer asks for it', () => {
    const html = renderSiteHTML(cfg(), { viewerBadge: true, appUrl: 'https://urlite.app/app' });
    expect(html).toContain('class="ul-badge"');
    expect(html).toContain('made with');
    expect(html).toContain('github.com/Blondu2024/urlite/issues');
  });

  it('never appears in the plain render used by the HTML export', () => {
    const html = renderSiteHTML(cfg(), { appUrl: 'https://urlite.app/app' });
    expect(html).not.toContain('ul-badge');
  });

  it('the viewer actually turns it on', () => {
    const viewer = readFileSync(resolve(__dirname, '../src/viewer/main.ts'), 'utf8');
    expect(viewer).toContain('viewerBadge: true');
  });
});

describe('crawler defence on /s/', () => {
  it('vercel.json sends X-Robots-Tag noindex for the viewer path', () => {
    const v = JSON.parse(readFileSync(resolve(__dirname, '../vercel.json'), 'utf8'));
    const sHeader = (v.headers ?? []).find((h: { source: string }) => h.source.startsWith('/s'));
    expect(sHeader).toBeDefined();
    const robots = sHeader.headers.find((h: { key: string }) => h.key.toLowerCase() === 'x-robots-tag');
    expect(robots.value).toContain('noindex');
  });
});

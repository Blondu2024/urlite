import type { SiteConfig } from '../site/types';
import { safeImageUrl } from '../site/sanitize';
import { PALETTES, type Palette } from '../site/palettes';

/**
 * The heuristic heart of the magic import: pour an existing page's essence
 * (words, photos, phone, colours) into a template config. Pure functions over
 * an HTML string — no AI, no network, fully testable. Anything not found on
 * the page keeps the template's copy, so the result is always complete.
 */

export interface Extracted {
  config: SiteConfig;
  /** which pieces were actually found — for honest UI messaging */
  found: string[];
}

const meta = (doc: Document, sel: string): string =>
  doc.querySelector(sel)?.getAttribute('content')?.trim() ?? '';

function absolute(src: string, baseUrl: string): string {
  if (!src.trim()) return ''; // new URL('', base) would resolve to the base itself
  try {
    return safeImageUrl(new URL(src, baseUrl).href);
  } catch {
    return '';
  }
}

/** "Bella Pizzeria | Best pizza in town" → "Bella Pizzeria" */
function trimTitle(t: string): string {
  return t.split(/\s+[|·]\s+/)[0].trim().slice(0, 80);
}

function hexToRgb(hex: string): [number, number, number] | null {
  const m = hex.trim().match(/^#([0-9a-f]{6})$/i);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Nearest curated palette to a page's colour, by distance to brand+accent. */
export function nearestPalette(color: string): Palette | null {
  const rgb = hexToRgb(color);
  if (!rgb) return null;
  let best: Palette | null = null;
  let bestD = Infinity;
  for (const p of PALETTES) {
    for (const candidate of [p.brand, p.accent, p.ink]) {
      const c = hexToRgb(candidate);
      if (!c) continue;
      const d = (rgb[0] - c[0]) ** 2 + (rgb[1] - c[1]) ** 2 + (rgb[2] - c[2]) ** 2;
      if (d < bestD) {
        bestD = d;
        best = p;
      }
    }
  }
  return best;
}

interface LdBusiness {
  name?: string;
  telephone?: string;
  email?: string;
  address?: { streetAddress?: string; addressLocality?: string } | string;
  image?: string | string[];
}

function readJsonLd(doc: Document): LdBusiness {
  for (const s of doc.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      const data = JSON.parse(s.textContent ?? '');
      for (const node of Array.isArray(data) ? data : [data]) {
        if (node && typeof node === 'object' && (node.name || node.telephone || node.address)) {
          return node as LdBusiness;
        }
      }
    } catch {
      /* malformed JSON-LD is common in the wild — skip it */
    }
  }
  return {};
}

function pageImages(doc: Document, baseUrl: string): string[] {
  const urls: string[] = [];
  const push = (u: string) => {
    if (u && !urls.includes(u)) urls.push(u);
  };
  push(absolute(meta(doc, 'meta[property="og:image"]'), baseUrl));
  for (const img of doc.querySelectorAll('img[src]')) {
    const w = Number(img.getAttribute('width') ?? NaN);
    const h = Number(img.getAttribute('height') ?? NaN);
    if ((w && w < 100) || (h && h < 100)) continue; // icons, spacers
    const src = img.getAttribute('src') ?? '';
    if (src.startsWith('data:')) continue;
    push(absolute(src, baseUrl));
  }
  return urls.filter(Boolean).slice(0, 7);
}

function isFacebook(baseUrl: string): boolean {
  try {
    return /(^|\.)facebook\.com$/i.test(new URL(baseUrl).hostname);
  } catch {
    return false;
  }
}

/** "Name. 1.234 likes · 12 talking about this. The actual about text." → about text */
function cleanFbDescription(desc: string, name: string): string {
  let d = desc.trim();
  if (name && d.startsWith(name)) d = d.slice(name.length).replace(/^[.\s]+/, '');
  d = d.replace(/^[\d., \s]+likes?[^.]*\.\s*/i, '');
  return d;
}

/** Visible page text, capped — this is all the rewrite model gets to read. */
export function readableText(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  for (const el of doc.querySelectorAll('script,style,noscript,svg,iframe,template')) el.remove();
  return (doc.body?.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 6000);
}

export function extractSite(html: string, baseUrl: string, template: SiteConfig): Extracted {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const config: SiteConfig = JSON.parse(JSON.stringify(template));
  const found: string[] = [];
  const ld = readJsonLd(doc);
  const fb = isFacebook(baseUrl);

  /* ---- name ---- */
  const title =
    meta(doc, 'meta[property="og:title"]') ||
    (typeof ld.name === 'string' ? ld.name : '') ||
    trimTitle(doc.querySelector('title')?.textContent ?? '');
  if (title) {
    config.brandName = title.slice(0, 80);
    config.logoText = title.trim().slice(0, 1).toUpperCase();
    found.push('title');
  }

  /* ---- description ---- */
  let desc =
    meta(doc, 'meta[property="og:description"]') || meta(doc, 'meta[name="description"]');
  if (fb) desc = cleanFbDescription(desc, title);
  if (desc.length >= 30) {
    config.hero.lede = desc.slice(0, 340);
    found.push('description');
  }

  /* ---- images ---- */
  // On Facebook only the og:image (profile photo) is the business's own —
  // everything else in the no-JS page is UI sprites.
  const imgs = fb
    ? [absolute(meta(doc, 'meta[property="og:image"]'), baseUrl)].filter(Boolean)
    : pageImages(doc, baseUrl);
  if (imgs.length) {
    config.hero.image = imgs[0];
    if (imgs.length > 1) config.gallery.images = imgs.slice(1);
    if (config.statement.on && imgs.length > 2) config.statement.image = imgs[1];
    found.push('images');
  }

  /* ---- phone ---- */
  const telA = doc.querySelector('a[href^="tel:"]');
  const tel = (telA?.getAttribute('href') ?? 'tel:').slice(4).replace(/[^+0-9]/g, '') ||
    (ld.telephone ?? '').replace(/[^+0-9]/g, '');
  if (tel.length >= 6) {
    config.hero.phone = tel;
    config.hero.phoneDisplay = telA?.textContent?.trim() || ld.telephone?.trim() || tel;
    for (const row of config.contact.rows) {
      if (row.href?.startsWith('tel:')) {
        row.value = config.hero.phoneDisplay;
        row.href = 'tel:' + tel;
      }
    }
    found.push('phone');
  }

  /* ---- email ---- */
  const mail = (doc.querySelector('a[href^="mailto:"]')?.getAttribute('href') ?? '')
    .slice(7)
    .split('?')[0]
    .trim();
  if (mail.includes('@')) {
    for (const row of config.contact.rows) {
      if (row.href?.startsWith('mailto:')) {
        row.value = mail;
        row.href = 'mailto:' + mail;
      }
    }
    found.push('email');
  }

  /* ---- address ---- */
  const addr =
    typeof ld.address === 'string'
      ? ld.address
      : [ld.address?.streetAddress, ld.address?.addressLocality].filter(Boolean).join(', ');
  if (addr) {
    const row = config.contact.rows.find((r) => !r.href);
    if (row) row.value = addr.slice(0, 160);
    config.footer.line = addr.slice(0, 160);
    found.push('address');
  }

  /* ---- colour ---- */
  const pal = nearestPalette(meta(doc, 'meta[name="theme-color"]'));
  if (pal) {
    config.theme = {
      brand: pal.brand,
      ink: pal.ink,
      accent: pal.accent,
      paper: pal.paper,
      paper2: pal.paper2,
      onAccent: pal.onAccent,
    };
    found.push('color');
  }

  return { config, found };
}

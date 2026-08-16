import type { BeforeAfter, ContactRow, HeroStat, LegalSection, Service, SiteConfig, Theme } from './types';
import { PALETTES } from './palettes';
import { ICONS } from './icons';
import { safeColor } from './sanitize';

/**
 * Coerces an untrusted decoded payload into a well-formed SiteConfig.
 * Strings are capped, arrays are capped, colours validated, icon ids checked.
 * Escaping happens later, in the renderer — here we only guarantee shape.
 */

const S = (v: unknown, cap = 400): string => (typeof v === 'string' ? v.slice(0, cap) : '');
const B = (v: unknown, dflt: boolean): boolean => (typeof v === 'boolean' ? v : dflt);
const A = (v: unknown, cap: number): unknown[] => (Array.isArray(v) ? v.slice(0, cap) : []);
const O = (v: unknown): Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};

function theme(raw: unknown): Theme {
  const o = O(raw);
  const d = PALETTES[0];
  return {
    brand: safeColor(S(o.brand, 9), d.brand),
    ink: safeColor(S(o.ink, 9), d.ink),
    accent: safeColor(S(o.accent, 9), d.accent),
    paper: safeColor(S(o.paper, 9), d.paper),
    paper2: safeColor(S(o.paper2, 9), d.paper2),
    onAccent: safeColor(S(o.onAccent, 9), d.onAccent),
  };
}

function stat(raw: unknown): HeroStat {
  const o = O(raw);
  return { big: S(o.big, 40), small: S(o.small, 80) };
}

function service(raw: unknown): Service {
  const o = O(raw);
  const icon = S(o.icon, 30);
  return { title: S(o.title, 90), text: S(o.text, 240), icon: icon in ICONS ? icon : 'sparkle' };
}

function ba(raw: unknown): BeforeAfter {
  const o = O(raw);
  return {
    before: S(o.before, 600),
    after: S(o.after, 600),
    title: S(o.title, 90),
    caption: S(o.caption, 200),
  };
}

function legalSection(raw: unknown): LegalSection {
  const o = O(raw);
  // A real privacy policy is long prose — the cap is per section, and deflate
  // shrinks legal boilerplate hard, so the link stays shareable.
  return { title: S(o.title, 90), body: S(o.body, 6000) };
}

function contactRow(raw: unknown): ContactRow {
  const o = O(raw);
  const row: ContactRow = { label: S(o.label, 40), value: S(o.value, 160) };
  const href = S(o.href, 400);
  const sub = S(o.sub, 120);
  if (href) row.href = href;
  if (sub) row.sub = sub;
  return row;
}

export function normalizeConfig(raw: unknown): SiteConfig {
  const o = O(raw);
  const hero = O(o.hero);
  const ticker = O(o.ticker);
  const statement = O(o.statement);
  const services = O(o.services);
  const work = O(o.work);
  const band = O(o.band);
  const gallery = O(o.gallery);
  const legal = O(o.legal);
  const contact = O(o.contact);
  const footer = O(o.footer);
  const nav = O(o.nav);
  const lang = ['en', 'ro', 'da'].includes(S(o.lang, 4)) ? (S(o.lang, 4) as SiteConfig['lang']) : 'en';

  return {
    v: 1,
    lang,
    theme: theme(o.theme),
    brandName: S(o.brandName, 80),
    tagline: S(o.tagline, 160),
    logoText: S(o.logoText, 3) || undefined,
    nav: {
      services: S(nav.services, 30),
      work: S(nav.work, 30),
      gallery: S(nav.gallery, 30),
      contact: S(nav.contact, 30),
      legal: S(nav.legal, 30) || undefined,
    },
    hero: {
      image: S(hero.image, 600),
      kicker: S(hero.kicker, 90),
      title: S(hero.title, 140),
      lede: S(hero.lede, 340),
      ctaPrimary: S(hero.ctaPrimary, 50),
      ctaHref: S(hero.ctaHref, 400) || undefined,
      phone: S(hero.phone, 30),
      phoneDisplay: S(hero.phoneDisplay, 30),
      ctaSecondary: S(hero.ctaSecondary, 50),
      stats: A(hero.stats, 3).map(stat),
    },
    ticker: { on: B(ticker.on, false), items: A(ticker.items, 6).map((x) => S(x, 90)) },
    statement: {
      on: B(statement.on, false),
      big: S(statement.big, 220),
      text: S(statement.text, 500),
      image: S(statement.image, 600),
    },
    services: {
      headKicker: S(services.headKicker, 60),
      headTitle: S(services.headTitle, 90),
      headLede: S(services.headLede, 260),
      items: A(services.items, 8).map(service),
      extrasLabel: S(services.extrasLabel, 80),
      extras: A(services.extras, 10).map((x) => S(x, 40)),
    },
    work: {
      on: B(work.on, false),
      headKicker: S(work.headKicker, 60),
      headTitle: S(work.headTitle, 90),
      headLede: S(work.headLede, 260),
      labelBefore: S(work.labelBefore, 20) || 'Before',
      labelAfter: S(work.labelAfter, 20) || 'After',
      items: A(work.items, 4).map(ba),
    },
    band: {
      on: B(band.on, false),
      kicker: S(band.kicker, 60),
      title: S(band.title, 120),
      text: S(band.text, 400),
      ctaBig: S(band.ctaBig, 40),
      ctaSmallTop: S(band.ctaSmallTop, 60),
      ctaSmallBottom: S(band.ctaSmallBottom, 60),
    },
    gallery: {
      on: B(gallery.on, true),
      headKicker: S(gallery.headKicker, 60),
      headTitle: S(gallery.headTitle, 90),
      images: A(gallery.images, 6).map((x) => S(x, 600)),
    },
    legal: {
      on: B(legal.on, false),
      headKicker: S(legal.headKicker, 60),
      headTitle: S(legal.headTitle, 90),
      sections: A(legal.sections, 5).map(legalSection),
    },
    contact: {
      headKicker: S(contact.headKicker, 60),
      headTitle: S(contact.headTitle, 120),
      lede: S(contact.lede, 300),
      cta: S(contact.cta, 50),
      rows: A(contact.rows, 6).map(contactRow),
    },
    footer: { line: S(footer.line, 160), note: S(footer.note, 260) },
  };
}

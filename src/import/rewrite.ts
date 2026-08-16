import type { SiteConfig } from '../site/types';

/**
 * The AI finishing pass, client side. The server (/api/rewrite) asks a cheap
 * model to describe the business in the template's language; what comes back
 * is a Brief — plain strings, never markup. applyBrief pours it onto the
 * config defensively: only well-typed, length-clamped values land, everything
 * else keeps the template copy. No brief (model down, budget cap, abuse
 * guard) means no changes at all.
 */

export interface Brief {
  tagline?: string;
  kicker?: string;
  heroTitle?: string;
  lede?: string;
  stats?: { big: string; small: string }[];
  ticker?: string[];
  statementBig?: string;
  statementText?: string;
  servicesKicker?: string;
  servicesTitle?: string;
  servicesLede?: string;
  services?: { title: string; text: string }[];
  extrasLabel?: string;
  extras?: string[];
  bandKicker?: string;
  bandTitle?: string;
  bandText?: string;
  galleryKicker?: string;
  galleryTitle?: string;
  contactKicker?: string;
  contactTitle?: string;
  contactLede?: string;
}

const S = (v: unknown, cap: number): string | undefined =>
  typeof v === 'string' && v.trim() ? v.trim().slice(0, cap) : undefined;

export function applyBrief(template: SiteConfig, brief: Brief): SiteConfig {
  const c: SiteConfig = JSON.parse(JSON.stringify(template));
  const set = (target: (v: string) => void, v: unknown, cap: number) => {
    const s = S(v, cap);
    if (s !== undefined) target(s);
  };

  set((v) => (c.tagline = v), brief.tagline, 160);
  set((v) => (c.hero.kicker = v), brief.kicker, 90);
  set((v) => (c.hero.title = v), brief.heroTitle, 140);
  set((v) => (c.hero.lede = v), brief.lede, 340);
  set((v) => (c.statement.big = v), brief.statementBig, 220);
  set((v) => (c.statement.text = v), brief.statementText, 500);
  set((v) => (c.services.headKicker = v), brief.servicesKicker, 60);
  set((v) => (c.services.headTitle = v), brief.servicesTitle, 90);
  set((v) => (c.services.headLede = v), brief.servicesLede, 260);
  set((v) => (c.services.extrasLabel = v), brief.extrasLabel, 80);
  set((v) => (c.band.kicker = v), brief.bandKicker, 60);
  set((v) => (c.band.title = v), brief.bandTitle, 120);
  set((v) => (c.band.text = v), brief.bandText, 400);
  set((v) => (c.gallery.headKicker = v), brief.galleryKicker, 60);
  set((v) => (c.gallery.headTitle = v), brief.galleryTitle, 90);
  set((v) => (c.contact.headKicker = v), brief.contactKicker, 60);
  set((v) => (c.contact.headTitle = v), brief.contactTitle, 120);
  set((v) => (c.contact.lede = v), brief.contactLede, 300);

  if (Array.isArray(brief.stats)) {
    const stats = brief.stats
      .filter((s): s is { big: string; small: string } => !!s && typeof s === 'object')
      .map((s) => ({ big: S(s.big, 40) ?? '', small: S(s.small, 80) ?? '' }))
      .filter((s) => s.big || s.small)
      .slice(0, 3);
    if (stats.length) c.hero.stats = stats;
  }

  if (Array.isArray(brief.ticker)) {
    const items = brief.ticker.map((t) => S(t, 90)).filter((t): t is string => !!t).slice(0, 6);
    if (items.length) c.ticker.items = items;
  }

  if (Array.isArray(brief.services)) {
    const items = brief.services
      .filter((s): s is { title: string; text: string } => !!s && typeof s === 'object')
      .map((s, i) => ({
        title: S(s.title, 90) ?? '',
        text: S(s.text, 240) ?? '',
        icon: template.services.items[i]?.icon ?? 'sparkle',
      }))
      .filter((s) => s.title)
      .slice(0, 8);
    if (items.length) c.services.items = items;
  }

  if (Array.isArray(brief.extras)) {
    const extras = brief.extras.map((e) => S(e, 40)).filter((e): e is string => !!e).slice(0, 10);
    if (extras.length) c.services.extras = extras;
  }

  return c;
}

import { describe, expect, it } from 'vitest';
import { buildPreset, PRESETS } from '../src/site/presets';
import { normalizeConfig } from '../src/site/normalize';
import { decodeSite, encodeSite } from '../src/site/codec';

/**
 * The catch-all template (user feedback, 16 Aug 2026): the five industry
 * cards can't fit a financial firm, an agency, a consultant — anyone outside
 * those trades had no card to pick after importing their site. "Any business"
 * is the neutral professional-services skeleton that fits them all.
 */

describe('the any-business preset', () => {
  it('exists in all three languages', () => {
    const p = PRESETS.find((x) => x.id === 'business');
    expect(p).toBeDefined();
    for (const lang of ['en', 'ro', 'da'] as const) {
      expect(p!.label[lang]).toBeTruthy();
      expect(p!.copy[lang].brandName).toBeTruthy();
      expect(p!.copy[lang].services.length).toBe(6);
    }
  });

  it('carries no trade-specific baggage', () => {
    const c = buildPreset('business', 'en');
    expect(c.work.on).toBe(false); // before/after sliders are for trades
    const words = JSON.stringify(c).toLowerCase();
    for (const w of ['garden', 'pizza', 'salon', 'engine', 'paint']) {
      expect(words).not.toContain(w);
    }
  });

  it('survives the URL roundtrip', () => {
    const c = buildPreset('business', 'ro');
    expect(normalizeConfig(decodeSite('#' + encodeSite(c)))).toEqual(c);
  });
});

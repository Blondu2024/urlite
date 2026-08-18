import { describe, expect, it } from 'vitest';
import { normalizeConfig } from '../src/site/normalize';
import { renderSiteHTML } from '../src/site/render';
import { encodeSite, decodeSite } from '../src/site/codec';
import { buildPreset, PRESETS } from '../src/site/presets';
import { collectImageUrls } from '../src/site/embed';

/**
 * The mini-shop (decided 16 Aug 2026, built 18 Aug): a product catalogue with
 * a client-side cart that lives entirely in the page — zero backend, true to
 * the Urlite identity. Checkout is honest about what a URL can do:
 *  - the cart composes a pre-filled order message → wa.me / mailto
 *  - each product can carry an optional payment link (Stripe Payment Link,
 *    PayPal.me, MobilePay) pasted by the seller
 * It is a "catalogue + order on chat", never presented as a full web store:
 * no card checkout, no stock, no order history.
 */

const base = () => normalizeConfig({});

const withShop = () => {
  const c = base();
  c.shop = {
    on: true,
    headKicker: 'The counter',
    headTitle: 'Order for pickup',
    headLede: 'Pick what you want — the order arrives as a message.',
    currency: 'lei',
    whatsapp: '+40 700 000 000',
    orderEmail: 'orders@example.com',
    products: [
      { name: 'Sourdough loaf', price: '18', desc: 'Baked every morning.', image: 'https://example.com/a.jpg' },
      { name: 'Cinnamon knot', price: '9', desc: '', image: 'https://example.com/b.jpg', payLink: 'https://buy.stripe.com/abc' },
    ],
  };
  return c;
};

describe('shop — normalization', () => {
  it('defaults to off for configs that predate it', () => {
    const c = normalizeConfig({ brandName: 'Old link' });
    expect(c.shop.on).toBe(false);
    expect(c.shop.products).toEqual([]);
  });

  it('keeps well-formed products and caps the array at 24', () => {
    const c = normalizeConfig({
      shop: {
        on: true,
        currency: 'kr.',
        products: Array.from({ length: 30 }, (_, i) => ({
          name: `P${i}`,
          price: '10',
          desc: 'd',
          image: 'https://example.com/p.jpg',
        })),
      },
    });
    expect(c.shop.on).toBe(true);
    expect(c.shop.products.length).toBe(24);
    expect(c.shop.products[0]).toEqual({
      name: 'P0',
      price: '10',
      desc: 'd',
      image: 'https://example.com/p.jpg',
    });
  });

  it('keeps a payLink only when one is given', () => {
    const c = normalizeConfig({
      shop: {
        on: true,
        products: [
          { name: 'A', price: '1', desc: '', image: '' },
          { name: 'B', price: '2', desc: '', image: '', payLink: 'https://buy.stripe.com/x' },
        ],
      },
    });
    expect(c.shop.products[0].payLink).toBeUndefined();
    expect(c.shop.products[1].payLink).toBe('https://buy.stripe.com/x');
  });
});

describe('shop — rendering', () => {
  it('renders an anchored section with every product', () => {
    const html = renderSiteHTML(withShop());
    expect(html).toContain('id="shop"');
    expect(html).toContain('Sourdough loaf');
    expect(html).toContain('Cinnamon knot');
    expect(html).toContain('The counter');
  });

  it('renders nothing when off or empty', () => {
    expect(renderSiteHTML(base())).not.toContain('id="shop"');
    const c = withShop();
    c.shop.on = false;
    expect(renderSiteHTML(c)).not.toContain('id="shop"');
    const d = withShop();
    d.shop.products = [];
    expect(renderSiteHTML(d)).not.toContain('id="shop"');
  });

  it('links the shop from the nav when a label is set', () => {
    const c = withShop();
    c.nav.shop = 'Shop';
    const html = renderSiteHTML(c);
    expect(html).toContain('href="#shop"');
    expect(renderSiteHTML(withShop())).not.toContain('href="#shop"');
  });

  it('carries the order channels as data attributes, digits only for WhatsApp', () => {
    const html = renderSiteHTML(withShop());
    expect(html).toContain('data-wa="40700000000"');
    expect(html).toContain('data-mail="orders@example.com"');
    expect(html).toContain('data-cur="lei"');
  });

  it('puts name and price on the add button, escaped', () => {
    const c = withShop();
    c.shop.products[0].name = '"><script>alert(1)</script>';
    const html = renderSiteHTML(c);
    expect(html).not.toContain('<script>alert(1)');
    expect(html).toContain('data-price="18"');
  });

  it('keeps an https payLink as a buy link and drops unsafe schemes', () => {
    const c = withShop();
    const html = renderSiteHTML(c);
    expect(html).toContain('href="https://buy.stripe.com/abc"');
    c.shop.products[1].payLink = 'javascript:alert(1)';
    expect(renderSiteHTML(c)).not.toContain('javascript:alert(1)');
  });

  it('drops tel: and mailto: payLinks — only http(s) buys', () => {
    const c = withShop();
    c.shop.products[1].payLink = 'mailto:x@y.com';
    const html = renderSiteHTML(c);
    expect(html).not.toContain('href="mailto:x@y.com"');
  });

  it('hides the cart when there is no order channel, but still shows payLinks', () => {
    const c = withShop();
    c.shop.whatsapp = '';
    c.shop.orderEmail = undefined;
    const html = renderSiteHTML(c);
    expect(html).not.toContain('data-add');
    expect(html).toContain('href="https://buy.stripe.com/abc"');
  });

  it('speaks the page language in the cart chrome', () => {
    const ro = withShop();
    ro.lang = 'ro';
    expect(renderSiteHTML(ro)).toContain('WhatsApp');
    expect(renderSiteHTML(ro)).toContain('Trimite comanda');
    const da = withShop();
    da.lang = 'da';
    expect(renderSiteHTML(da)).toContain('Send bestillingen');
  });

  it('escapes hostile text in section head and descriptions', () => {
    const c = withShop();
    c.shop.headTitle = '<img src=x onerror=alert(1)>';
    c.shop.products[0].desc = '<script>alert(2)</script>';
    const html = renderSiteHTML(c);
    expect(html).not.toContain('<img src=x');
    expect(html).not.toContain('<script>alert(2)');
  });
});

describe('shop — the empty cart is really invisible', () => {
  // Regression: `.cart-fab{display:grid}` beat the UA rule `[hidden]{display:none}`,
  // so the fab showed a "0" bubble before anything was added (18 Aug 2026).
  it('ships an author-level [hidden] guard that outranks the display rules', () => {
    const html = renderSiteHTML(withShop());
    expect(html).toContain('id="cartFab" hidden');
    expect(html).toContain('id="cartPanel" hidden');
    // jsdom's cascade can't catch this (it resolved [hidden] correctly even
    // when Chrome didn't), so assert the guard rule itself is in the CSS.
    expect(html).toMatch(/\.cart-fab\[hidden\][^{]*\{[^}]*display:none/);
    expect(html).toMatch(/\.cart\[hidden\][^{]*\{[^}]*display:none/);
  });
});

describe('shop — the inline cart script is valid JavaScript', () => {
  // Regression: a \n inside the render template literal became a real newline
  // in the generated script, splitting a string mid-literal (18 Aug 2026).
  it('every inline script in the page parses', () => {
    const html = renderSiteHTML(withShop());
    const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
    expect(scripts.length).toBeGreaterThan(0);
    for (const src of scripts) {
      expect(() => new Function(src)).not.toThrow();
    }
  });
});

describe('shop — export embeds the product photos', () => {
  it('collects product image urls alongside the rest', () => {
    const urls = collectImageUrls(withShop());
    expect(urls).toContain('https://example.com/a.jpg');
    expect(urls).toContain('https://example.com/b.jpg');
  });
});

describe('the shop preset', () => {
  it('exists in all three languages', () => {
    const p = PRESETS.find((x) => x.id === 'shop');
    expect(p).toBeDefined();
    for (const lang of ['en', 'ro', 'da'] as const) {
      expect(p!.copy[lang].brandName).toBeTruthy();
      expect(p!.label[lang]).toBeTruthy();
    }
  });

  it('ships with a stocked counter in every language', () => {
    for (const lang of ['en', 'ro', 'da'] as const) {
      const c = buildPreset('shop', lang);
      expect(c.shop.on).toBe(true);
      expect(c.shop.products.length).toBeGreaterThanOrEqual(6);
      expect(c.shop.currency).toBeTruthy();
      expect(c.shop.whatsapp).toBeTruthy();
      expect(c.nav.shop).toBeTruthy();
      for (const prod of c.shop.products) {
        expect(prod.name).toBeTruthy();
        expect(prod.price).toMatch(/^[0-9]+([.,][0-9]+)?$/);
        expect(prod.image).toMatch(/^https:/);
      }
    }
  });

  it('survives the URL roundtrip with the counter intact', () => {
    const c = buildPreset('shop', 'ro');
    const again = normalizeConfig(decodeSite('#' + encodeSite(c)));
    expect(again).toEqual(c);
  });
});

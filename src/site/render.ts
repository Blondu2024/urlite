import type { SiteConfig } from './types';
import { escHtml, safeImageUrl, safeHref, telHref } from './sanitize';
import { iconSvg } from './icons';

/**
 * The single source of truth: turns a SiteConfig into one complete, standalone
 * HTML document. Used identically by the editor preview (iframe srcdoc), the
 * /s viewer, and the "Download HTML" export — WYSIWYG by construction.
 *
 * Design system = the approved editorial standard: numbered service rows (no
 * card grids), full-colour sections, big display serif, CSS-animated hero
 * (never gated behind JS), GSAP reveals + parallax + self-demonstrating
 * before/after sliders, inline SVG icons at stroke 1.6.
 */

export interface RenderOptions {
  /** absolute URL of the Urlite app, for the small credit line */
  appUrl?: string;
  /** when true, the credit line is omitted (bare export) */
  noCredit?: boolean;
  /**
   * Render the page already settled: no entrance animations, no GSAP.
   * Used by the editor preview so a keystroke never replays the first-visit
   * choreography (the "strobing" Damien reported, 15 Aug 2026). The viewer,
   * the shared link and the HTML export never set this.
   */
  still?: boolean;
  /**
   * Small fixed badge naming the page as a visitor-made Urlite site, with a
   * report link. Set ONLY by the /s/ viewer — pages under urlite.app must
   * declare what they are (Safe Browsing "deceptive pages" incident, 16 Aug
   * 2026); a client's exported HTML on their own host stays clean.
   */
  viewerBadge?: boolean;
  /**
   * URL → `data:image/…` map, produced by `embedImages()` at export time: the
   * downloaded file has no link-size limit, so the photos travel inside it.
   * Images missing from the map keep their URL. Only the HTML export sets
   * this — preview, viewer and link stay on plain URLs.
   */
  imageData?: Record<string, string>;
}

const esc = escHtml;

/** `*words*` inside the hero title become the accent-coloured <em>. */
function accentise(escaped: string): string {
  return escaped.replace(/\*([^*]+)\*/g, '<em>$1</em>');
}

function imgTag(src: string, alt: string, extra = ''): string {
  if (!src) return '';
  return `<img src="${esc(src)}" alt="${esc(alt)}"${extra ? ' ' + extra : ''}>`;
}

function faviconSvg(c: SiteConfig): string {
  const letter = (c.logoText || c.brandName || 'U').trim().slice(0, 2).toUpperCase();
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'>` +
    `<rect width='32' height='32' rx='8' fill='${c.theme.ink}'/>` +
    `<text x='16' y='21.5' font-family='Georgia,serif' font-size='15' fill='${c.theme.accent}' text-anchor='middle'>${letter}</text>` +
    `</svg>`;
  return 'data:image/svg+xml,' + encodeURIComponent(svg);
}

/**
 * Cart chrome in the page's language. These strings are part of the page
 * furniture (like aria labels), not the owner's copy — so they live here,
 * not in the config, and cost the link nothing.
 */
const SHOP_LABELS: Record<SiteConfig['lang'], {
  add: string;
  buy: string;
  cartTitle: string;
  total: string;
  sendWa: string;
  sendMail: string;
  note: string;
  cartAria: string;
  close: string;
}> = {
  en: {
    add: 'Add to order',
    buy: 'Buy now',
    cartTitle: 'Your order',
    total: 'Total',
    sendWa: 'Send the order on WhatsApp',
    sendMail: 'Send the order by email',
    note: 'The order opens as a message — nothing is charged on this page.',
    cartAria: 'Your order',
    close: 'Close',
  },
  ro: {
    add: 'Adaugă la comandă',
    buy: 'Cumpără acum',
    cartTitle: 'Comanda ta',
    total: 'Total',
    sendWa: 'Trimite comanda pe WhatsApp',
    sendMail: 'Trimite comanda pe email',
    note: 'Comanda se deschide ca mesaj — pe pagina asta nu se plătește nimic.',
    cartAria: 'Comanda ta',
    close: 'Închide',
  },
  da: {
    add: 'Læg i bestillingen',
    buy: 'Køb nu',
    cartTitle: 'Din bestilling',
    total: 'I alt',
    sendWa: 'Send bestillingen på WhatsApp',
    sendMail: 'Send bestillingen på e-mail',
    note: 'Bestillingen åbner som en besked — der betales ikke noget på denne side.',
    cartAria: 'Din bestilling',
    close: 'Luk',
  },
};

const GALLERY_PATTERNS: Record<number, string[]> = {
  1: ['x6'],
  2: ['x3', 'x3'],
  3: ['x4', 'x2', 'x6w'],
  4: ['x4', 'x2', 'x2', 'x4'],
  5: ['x4', 'x2', 'x2', 'x4', 'x6w'],
  6: ['x4', 'x2', 'x2', 'x4', 'x3', 'x3'],
};

export function renderSiteHTML(c: SiteConfig, opts: RenderOptions = {}): string {
  const t = c.theme;
  const tel = telHref(c.hero.phone);
  const appUrl = opts.appUrl ?? 'https://urlite.app';

  /* sanitised URL, swapped for its packed data: URI when the export carries one */
  const resolveImg = (url: string): string => {
    const src = safeImageUrl(url);
    if (!src) return '';
    const packed = opts.imageData?.[src];
    return packed && packed.startsWith('data:image/') ? packed : src;
  };

  const hasServices = c.services.items.length > 0;
  const workItems = c.work.items.filter((w) => safeImageUrl(w.before) && safeImageUrl(w.after));
  const hasWork = c.work.on && workItems.length > 0;
  const galleryImages = c.gallery.images.map(resolveImg).filter(Boolean);
  const hasGallery = c.gallery.on && galleryImages.length > 0;
  const legalSections = c.legal.sections.filter((s) => s.title || s.body);
  const hasLegal = c.legal.on && legalSections.length > 0;
  const shopProducts = c.shop.products.filter((p) => p.name);
  const hasShop = c.shop.on && shopProducts.length > 0;

  /* ---------- nav ---------- */
  const navLinks = [
    hasServices && c.nav.services ? `<a class="nlink" href="#services">${esc(c.nav.services)}</a>` : '',
    hasShop && c.nav.shop ? `<a class="nlink" href="#shop">${esc(c.nav.shop)}</a>` : '',
    hasWork && c.nav.work ? `<a class="nlink" href="#work">${esc(c.nav.work)}</a>` : '',
    hasGallery && c.nav.gallery ? `<a class="nlink" href="#gallery">${esc(c.nav.gallery)}</a>` : '',
    hasLegal && c.nav.legal ? `<a class="nlink" href="#legal">${esc(c.nav.legal)}</a>` : '',
    c.nav.contact ? `<a class="nlink" href="#contact">${esc(c.nav.contact)}</a>` : '',
  ]
    .filter(Boolean)
    .join('\n      ');

  const phonePill =
    tel && c.hero.phoneDisplay
      ? `<a class="tel" href="${tel}">${iconSvg('phone')}<span class="tab-num">${esc(c.hero.phoneDisplay)}</span></a>`
      : '';

  /* ---------- hero ---------- */
  const heroImg = imgTag(resolveImg(c.hero.image), '', 'fetchpriority="high"');
  const stats = c.hero.stats
    .filter((s) => s.big || s.small)
    .map((s) => `<div class="cell rv-h"><b>${esc(s.big)}</b><small>${esc(s.small)}</small></div>`)
    .join('\n      ');
  /* the primary CTA can point at a URL (app store listing); the phone is the fallback */
  const primaryHref = safeHref(c.hero.ctaHref ?? '') || tel;
  const heroCtas = [
    primaryHref && c.hero.ctaPrimary ? `<a class="btn btn-y" href="${esc(primaryHref)}">${esc(c.hero.ctaPrimary)}</a>` : '',
    c.hero.ctaSecondary
      ? `<a class="btn btn-g" href="#${hasWork ? 'work' : hasGallery ? 'gallery' : 'contact'}">${esc(c.hero.ctaSecondary)}</a>`
      : '',
  ]
    .filter(Boolean)
    .join('\n      ');

  /* ---------- ticker ---------- */
  const tickerItems = c.ticker.items.filter(Boolean);
  const tickerSpan = tickerItems.map((i) => `${esc(i)} <i></i>`).join(' ');
  const ticker =
    c.ticker.on && tickerItems.length
      ? `<div class="ticker" aria-hidden="false"><div class="tick-track">
    <span>${tickerSpan}</span><span aria-hidden="true">${tickerSpan}</span>
  </div></div>`
      : '';

  /* ---------- statement ---------- */
  const stImg = imgTag(resolveImg(c.statement.image), '');
  const statement =
    c.statement.on && (c.statement.big || c.statement.text)
      ? `<section class="statement"><div class="wrap st-grid${stImg ? '' : ' st-solo'}">
    <div>
      ${c.statement.big ? `<p class="rv">${esc(c.statement.big)}</p>` : ''}
      ${c.statement.text ? `<p class="rv">${esc(c.statement.text)}</p>` : ''}
    </div>
    ${stImg ? `<div class="sign rv-i">${stImg}</div>` : ''}
  </div></section>`
      : '';

  /* ---------- services ---------- */
  const serviceRows = c.services.items
    .map(
      (s, i) => `<article class="srow rv">
        <div class="snum tab-num">${String(i + 1).padStart(2, '0')}</div>
        <h3>${esc(s.title)}</h3>
        <p>${esc(s.text)}</p>
        <div class="sico" aria-hidden="true">${iconSvg(s.icon)}</div>
      </article>`,
    )
    .join('\n');
  const extras = c.services.extras.filter(Boolean);
  const servicesSec = hasServices
    ? `<section id="services"><div class="wrap">
    <div class="sec-head">
      <div>
        <p class="kicker rv">${esc(c.services.headKicker)}</p>
        <h2 class="d2 rv" style="margin-top:20px">${accentise(esc(c.services.headTitle))}</h2>
      </div>
      <p class="lede rv">${esc(c.services.headLede)}</p>
    </div>
    <div class="svc">
${serviceRows}
    </div>
    ${
      extras.length
        ? `<div class="extras rv"><b>${esc(c.services.extrasLabel)}</b>${extras
            .map((e) => `<span class="chip">${esc(e)}</span>`)
            .join('')}</div>`
        : ''
    }
  </div></section>`
    : '';

  /* ---------- shop (catalogue + chat-order cart, zero backend) ---------- */
  const L = SHOP_LABELS[c.lang];
  const waDigits = c.shop.whatsapp.replace(/[^0-9]/g, '');
  const orderMail = /^[^\s<>"']+@[^\s<>"']+$/.test((c.shop.orderEmail ?? '').trim())
    ? (c.shop.orderEmail ?? '').trim()
    : '';
  const hasCart = hasShop && (waDigits.length >= 5 || !!orderMail);
  const productCards = shopProducts
    .map((p) => {
      const img = resolveImg(p.image);
      const pay = safeHref(p.payLink ?? '');
      const payOk = /^https?:/i.test(pay) ? pay : '';
      const price = p.price
        ? `<span class="p-price tab-num">${esc(p.price)}${c.shop.currency ? ' ' + esc(c.shop.currency) : ''}</span>`
        : '';
      return `<article class="pcard rv-i">
      ${img ? `<figure>${imgTag(img, p.name, 'loading="lazy"')}</figure>` : ''}
      <div class="p-body">
        <div class="p-line"><h3>${esc(p.name)}</h3>${price}</div>
        ${p.desc ? `<p>${esc(p.desc)}</p>` : ''}
        <div class="p-act">
          ${hasCart ? `<button class="p-add" data-add data-name="${esc(p.name)}" data-price="${esc(p.price)}">${L.add}</button>` : ''}
          ${payOk ? `<a class="p-buy" href="${esc(payOk)}" target="_blank" rel="noopener">${L.buy}</a>` : ''}
        </div>
      </div>
    </article>`;
    })
    .join('\n');
  const cartUi = hasCart
    ? `<button class="cart-fab" id="cartFab" hidden aria-label="${L.cartAria}">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 7h12l-1.2 12.2a1.8 1.8 0 0 1-1.8 1.6H9a1.8 1.8 0 0 1-1.8-1.6L6 7Z"/><path d="M9 10V6a3 3 0 0 1 6 0v4"/></svg>
      <b id="cartCount" class="tab-num">0</b>
    </button>
    <div class="cart" id="cartPanel" hidden role="dialog" aria-label="${L.cartAria}">
      <div class="cart-head"><b>${L.cartTitle}</b><button id="cartClose" aria-label="${L.close}">✕</button></div>
      <div class="cart-list" id="cartList"></div>
      <div class="cart-total"><span>${L.total}</span><b id="cartTotal" class="tab-num"></b></div>
      <a class="cart-send" id="cartSend" href="#" target="_blank" rel="noopener">${waDigits.length >= 5 ? L.sendWa : L.sendMail}</a>
      <p class="cart-note">${L.note}</p>
    </div>`
    : '';
  const shopSec = hasShop
    ? `<section id="shop" class="shop" data-wa="${esc(waDigits)}" data-mail="${esc(orderMail)}" data-cur="${esc(c.shop.currency)}" data-brand="${esc(c.brandName)}">
  <div class="wrap">
    <div class="sec-head">
      <div>
        <p class="kicker rv">${esc(c.shop.headKicker)}</p>
        <h2 class="d2 rv" style="margin-top:20px">${accentise(esc(c.shop.headTitle))}</h2>
      </div>
      <p class="lede rv">${esc(c.shop.headLede)}</p>
    </div>
    <div class="pgrid">
${productCards}
    </div>
  </div>
${cartUi}
</section>`
    : '';

  /* ---------- work / before-after ---------- */
  const sliders = workItems
    .map(
      (w) => `<div class="ba rv-i">
      <div class="slider" style="aspect-ratio:14/9" data-slider>
        <img class="before" src="${esc(resolveImg(w.before))}" alt="${esc(c.work.labelBefore)}: ${esc(w.title)}" draggable="false">
        <img class="after" src="${esc(resolveImg(w.after))}" alt="${esc(c.work.labelAfter)}: ${esc(w.title)}" draggable="false">
        <span class="lab b">${esc(c.work.labelBefore)}</span><span class="lab a">${esc(c.work.labelAfter)}</span>
        <i class="handle" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6 4 12l5 6M15 6l5 6-5 6"/></svg></i>
      </div>
      <div class="ba-cap"><h3>${esc(w.title)}</h3><span>${esc(w.caption)}</span></div>
    </div>`,
    )
    .join('\n');
  const workSec = hasWork
    ? `<section id="work" class="work"><div class="wrap">
    <div class="sec-head">
      <div>
        <p class="kicker rv">${esc(c.work.headKicker)}</p>
        <h2 class="d2 rv" style="margin-top:20px">${accentise(esc(c.work.headTitle))}</h2>
      </div>
      <p class="lede rv">${esc(c.work.headLede)}</p>
    </div>
${sliders}
  </div></section>`
    : '';

  /* ---------- accent band ---------- */
  const bandSec =
    c.band.on && (c.band.title || c.band.text)
      ? `<section class="emg"><div class="wrap emg-grid">
    <div>
      <p class="kicker rv">${esc(c.band.kicker)}</p>
      <h2 class="d2 rv" style="margin-top:20px">${accentise(esc(c.band.title))}</h2>
      <p class="rv">${esc(c.band.text)}</p>
    </div>
    ${
      tel && c.band.ctaBig
        ? `<a class="big-tel rv-i" href="${tel}">
      <small>${esc(c.band.ctaSmallTop)}</small>
      <b class="tab-num">${esc(c.band.ctaBig)}</b>
      <small>${esc(c.band.ctaSmallBottom)}</small>
    </a>`
        : ''
    }
  </div></section>`
      : '';

  /* ---------- gallery ---------- */
  const pattern = GALLERY_PATTERNS[galleryImages.length] ?? GALLERY_PATTERNS[6];
  const galleryFigs = galleryImages
    .map(
      (src, i) =>
        `<figure class="g-${pattern[i]} rv-i"><img src="${esc(src)}" alt="" loading="lazy"></figure>`,
    )
    .join('\n      ');
  const gallerySec = hasGallery
    ? `<section id="gallery"><div class="wrap">
    <div class="sec-head"><div>
      <p class="kicker rv">${esc(c.gallery.headKicker)}</p>
      <h2 class="d2 rv" style="margin-top:20px">${esc(c.gallery.headTitle)}</h2>
    </div></div>
    <div class="gal">
      ${galleryFigs}
    </div>
  </div></section>`
    : '';

  /* ---------- legal (privacy policy / terms — the app-store one-pager) ---------- */
  const legalBlocks = legalSections
    .map((s) => {
      const paras = s.body
        .split(/\n{2,}/)
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`)
        .join('\n        ');
      return `<article class="lg rv">
      <h3>${esc(s.title)}</h3>
      <div class="lg-body">
        ${paras}
      </div>
    </article>`;
    })
    .join('\n');
  const legalSec = hasLegal
    ? `<section id="legal" class="legal"><div class="wrap">
    <div class="sec-head"><div>
      <p class="kicker rv">${esc(c.legal.headKicker)}</p>
      <h2 class="d2 rv" style="margin-top:20px">${accentise(esc(c.legal.headTitle))}</h2>
    </div></div>
${legalBlocks}
  </div></section>`
    : '';

  /* ---------- contact ---------- */
  const contactRows = c.contact.rows
    .filter((r) => r.label || r.value)
    .map((r) => {
      const href = r.href ? safeHref(r.href) : '';
      const value = href
        ? `<a href="${esc(href)}">${esc(r.value)}</a>`
        : esc(r.value);
      return `<div class="crow rv"><div class="ck">${esc(r.label)}</div>
        <div class="cv">${value}${r.sub ? `<small>${esc(r.sub)}</small>` : ''}</div></div>`;
    })
    .join('\n      ');
  const contactSec = `<section id="contact" class="contact"><div class="wrap c-grid">
    <div>
      <p class="kicker rv">${esc(c.contact.headKicker)}</p>
      <h2 class="d2 rv" style="margin-top:20px">${accentise(esc(c.contact.headTitle))}</h2>
      <p class="lede rv" style="color:rgba(255,255,255,.72);margin-top:22px">${esc(c.contact.lede)}</p>
      ${
        tel && c.contact.cta
          ? `<div class="hero-cta rv" style="margin-top:32px"><a class="btn btn-y" href="${tel}">${esc(c.contact.cta)}</a></div>`
          : ''
      }
    </div>
    <div>
      ${contactRows}
    </div>
  </div></section>`;

  const credit = opts.noCredit
    ? ''
    : `<span class="credit">Built with <a href="${esc(appUrl)}" rel="noopener">Urlite</a> — this entire website lives inside its link.</span>`;

  return `<!doctype html>
<html lang="${c.lang}"${opts.still ? ' class="still"' : ''}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(c.brandName)}${c.tagline ? ' — ' + esc(c.tagline) : ''}</title>
<meta name="description" content="${esc(c.hero.lede || c.tagline)}">
<meta name="robots" content="noindex">
<link rel="icon" href="${faviconSvg(c)}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif&family=Instrument+Sans:wght@400;500;600&display=swap" rel="stylesheet">
<style>
:root{
  --brand:${t.brand};
  --ink-deep:${t.ink};
  --accent:${t.accent};
  --paper:${t.paper};
  --paper-2:${t.paper2};
  --surface:#FFFFFF;
  --on-accent:${t.onAccent};
  --ink:#141414;
  --ink-2:color-mix(in srgb,var(--ink-deep) 72%,#5A5A5A);
  --line:color-mix(in srgb,var(--ink-deep) 15%,transparent);
  --line-on-dark:rgba(255,255,255,.16);
  --sans:'Instrument Sans',system-ui,-apple-system,'Segoe UI',sans-serif;
  --serif:'Instrument Serif',Georgia,serif;
  --pad:clamp(20px,5vw,64px);
  --wrap:1320px;
  --e-out:cubic-bezier(.16,1,.3,1);
}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--paper);color:var(--ink);font-family:var(--sans);
  font-size:17px;line-height:1.6;-webkit-font-smoothing:antialiased;overflow-x:hidden}
img{max-width:100%;display:block}
a{color:inherit;text-decoration:none}
:focus-visible{outline:3px solid var(--accent);outline-offset:3px;border-radius:4px}
.wrap{width:min(100% - (var(--pad)*2),var(--wrap));margin-inline:auto}
h1,h2,h3{margin:0;font-weight:400;font-family:var(--serif);letter-spacing:-.02em;line-height:.98}
.d1{font-size:clamp(3rem,10.5vw,8.2rem)}
.d2{font-size:clamp(2.3rem,6.4vw,5rem)}
.kicker{font-family:var(--sans);font-size:.7rem;font-weight:600;letter-spacing:.22em;
  text-transform:uppercase;color:var(--brand);display:flex;align-items:center;gap:12px;margin:0}
.kicker::before{content:'';width:26px;height:1px;background:currentColor;flex:none}
.lede{font-size:clamp(1.06rem,1.55vw,1.3rem);line-height:1.55;color:var(--ink-2);max-width:46ch}
.tab-num{font-variant-numeric:tabular-nums}
h2 em,h1 em{font-style:normal;color:var(--accent)}

/* hero never depends on JS: pure CSS entrance. Below-the-fold reveals are gated
   on the .js class, which removes itself after 2.5s if GSAP never arrives. */
.js .rv{opacity:0;transform:translateY(26px)}
.js .rv-i{opacity:0}
@media(prefers-reduced-motion:reduce){
  .js .rv,.js .rv-i{opacity:1!important;transform:none!important}
}
@media(prefers-reduced-motion:no-preference){
  .rv-h{animation:riseIn .85s cubic-bezier(.16,1,.3,1) backwards}
  .rv-h:nth-of-type(1){animation-delay:.05s}
  .hero h1.rv-h{animation-delay:.14s}
  .hero .lede.rv-h{animation-delay:.23s}
  .hero-cta.rv-h{animation-delay:.32s}
  .hstrip .cell:nth-child(1){animation-delay:.40s}
  .hstrip .cell:nth-child(2){animation-delay:.47s}
  .hstrip .cell:nth-child(3){animation-delay:.54s}
}
@keyframes riseIn{from{opacity:0;transform:translateY(26px)}to{opacity:1;transform:none}}
${opts.still ? `/* settled preview: everything sits in its final state, nothing replays */
html.still .rv-h,html.still .hstrip .cell{animation:none!important}
html.still .tick-track{animation:none}
` : ''}

.nav{position:fixed;inset:0 0 auto;z-index:80;transition:background .3s var(--e-out),
  border-color .3s var(--e-out),backdrop-filter .3s;border-bottom:1px solid transparent}
.nav.solid{background:color-mix(in srgb,var(--paper) 90%,transparent);backdrop-filter:blur(14px);border-color:var(--line)}
.nav .wrap{display:flex;align-items:center;gap:18px;height:74px}
.mark{display:flex;align-items:center;gap:11px;margin-right:auto;min-height:44px}
.mono{width:38px;height:38px;border-radius:9px;background:var(--accent);color:var(--on-accent);
  display:grid;place-items:center;font-family:var(--serif);font-size:1.05rem;flex:none}
/* over the dark hero photo the menu is WHITE; it turns dark only on .solid */
.mark span{font-family:var(--serif);font-size:1.12rem;letter-spacing:-.01em;line-height:1;
  color:#fff;white-space:nowrap;text-shadow:0 1px 12px rgba(0,0,0,.5)}
.nlinks{display:flex;gap:30px}
.nlink{font-size:.86rem;font-weight:500;color:rgba(255,255,255,.88);min-height:44px;
  display:flex;align-items:center;transition:color .2s;text-shadow:0 1px 12px rgba(0,0,0,.5)}
.nlink:hover{color:#fff}
.nav.solid .mark span{color:var(--ink);text-shadow:none}
.nav.solid .nlink{color:var(--ink-2);text-shadow:none}
.nav.solid .nlink:hover{color:var(--brand)}
.tel{display:inline-flex;align-items:center;gap:9px;background:var(--ink-deep);color:#fff;
  padding:0 22px;height:46px;border-radius:99px;font-weight:600;font-size:.9rem;white-space:nowrap;
  transition:transform .2s var(--e-out),background .2s}
.tel:hover{background:var(--brand);transform:translateY(-1px)}
.tel svg{width:16px;height:16px;flex:none}
@media(max-width:960px){.nlinks{display:none}}
@media(max-width:520px){.mark span{display:none}}

.hero{position:relative;min-height:100svh;display:flex;flex-direction:column;
  justify-content:flex-end;overflow:clip;background:var(--ink-deep)}
.hero-media{position:absolute;inset:-8% 0 -8%;z-index:0;will-change:transform}
.hero-media img{width:100%;height:100%;object-fit:cover}
.hero::after{content:'';position:absolute;inset:0;z-index:1;pointer-events:none;
  background:linear-gradient(178deg,rgba(0,0,0,.6)0%,rgba(0,0,0,.16)30%,
    rgba(0,0,0,.5)70%,rgba(0,0,0,.85)100%)}
.hero::before{content:'';position:absolute;inset:0;z-index:1;pointer-events:none;
  background:linear-gradient(97deg,rgba(0,0,0,.8)0%,rgba(0,0,0,.5)38%,
    rgba(0,0,0,.08)64%,transparent 78%)}
@media(max-width:820px){
  .hero::before{background:linear-gradient(180deg,rgba(0,0,0,.32)0%,rgba(0,0,0,.68)55%,rgba(0,0,0,.82)100%)}
}
.hero .wrap{position:relative;z-index:2;padding-block:120px 0;color:#fff}
.hero h1{color:#fff;max-width:13ch;margin-top:26px}
.hero .kicker{color:var(--accent)}
.hero .lede{color:rgba(255,255,255,.9);margin-top:26px}
.hero-cta{display:flex;flex-wrap:wrap;gap:12px;margin-top:38px}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;min-height:56px;
  padding:0 30px;border-radius:99px;font-weight:600;font-size:1rem;
  transition:transform .2s var(--e-out),background .2s,color .2s}
.btn:active{transform:scale(.97)}
.btn-y{background:var(--accent);color:var(--on-accent)}
.btn-y:hover{filter:brightness(1.07);transform:translateY(-2px)}
.btn-g{border:1px solid rgba(255,255,255,.42);color:#fff}
.btn-g:hover{background:rgba(255,255,255,.12)}
.hstrip{position:relative;z-index:2;margin-top:60px;border-top:1px solid var(--line-on-dark)}
.hstrip .wrap{display:grid;grid-template-columns:repeat(3,1fr);padding-block:0}
.hstrip .cell{padding:26px 0 30px;color:#fff}
.hstrip .cell+.cell{border-left:1px solid var(--line-on-dark);padding-left:28px}
.hstrip b{display:block;font-family:var(--serif);font-size:clamp(1.3rem,2.3vw,1.9rem);line-height:1;font-weight:400}
.hstrip small{display:block;margin-top:9px;font-size:.79rem;letter-spacing:.1em;
  text-transform:uppercase;color:rgba(255,255,255,.62)}
@media(max-width:760px){
  .hstrip .wrap{grid-template-columns:1fr}
  .hstrip .cell+.cell{border-left:0;border-top:1px solid var(--line-on-dark);padding-left:0}
  .hstrip .cell{padding:18px 0}
}

.ticker{background:var(--accent);color:var(--on-accent);overflow:hidden;padding:15px 0;
  border-block:1px solid rgba(0,0,0,.12)}
.tick-track{display:flex;gap:56px;width:max-content;animation:tick 34s linear infinite}
.ticker:hover .tick-track,.ticker:focus-within .tick-track{animation-play-state:paused}
@media(prefers-reduced-motion:reduce){.tick-track{animation:none}}
@keyframes tick{to{transform:translateX(-50%)}}
.tick-track span{display:flex;align-items:center;gap:56px;font-weight:600;font-size:.95rem;
  white-space:nowrap;letter-spacing:.01em}
.tick-track i{width:6px;height:6px;border-radius:50%;background:currentColor;flex:none;opacity:.5}

section{padding-block:clamp(72px,10vw,144px);scroll-margin-top:80px}
.sec-head{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,.85fr);
  gap:clamp(24px,5vw,72px);align-items:end;margin-bottom:clamp(40px,6vw,80px)}
@media(max-width:860px){.sec-head{grid-template-columns:1fr;align-items:start}}

.statement{background:var(--paper-2)}
.st-grid{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,.95fr);
  gap:clamp(28px,5vw,76px);align-items:center}
.st-grid.st-solo{grid-template-columns:minmax(0,1fr)}
.st-grid p{font-family:var(--serif);font-size:clamp(1.45rem,2.9vw,2.35rem);line-height:1.16;
  letter-spacing:-.015em;margin:0}
.st-grid p+p{margin-top:1.1em;font-family:var(--sans);font-size:1.02rem;line-height:1.65;
  letter-spacing:0;color:var(--ink-2);max-width:44ch}
.sign{border-radius:14px;overflow:hidden;box-shadow:0 26px 60px -28px rgba(0,0,0,.5)}
.sign img{aspect-ratio:4/3;object-fit:cover;width:100%}
@media(max-width:860px){.st-grid{grid-template-columns:1fr}}

/* services — numbered editorial rows, never cards */
.svc{border-top:1px solid var(--line)}
.srow{display:grid;grid-template-columns:88px minmax(0,1fr) minmax(0,1fr) 52px;
  gap:clamp(12px,2.4vw,36px);align-items:center;padding:clamp(22px,3vw,34px) 0;
  border-bottom:1px solid var(--line);position:relative;transition:padding-left .35s var(--e-out)}
.srow::before{content:'';position:absolute;inset:0;background:var(--surface);
  transform:scaleY(0);transform-origin:bottom;transition:transform .4s var(--e-out);z-index:0}
.srow:hover::before{transform:scaleY(1)}
.srow>*{position:relative;z-index:1}
.srow:hover{padding-left:clamp(10px,2vw,26px)}
.snum{font-family:var(--serif);font-size:1.5rem;color:var(--brand);opacity:.55}
.srow h3{font-size:clamp(1.25rem,2.2vw,1.72rem)}
.srow p{margin:0;color:var(--ink-2);font-size:.97rem;max-width:44ch}
.sico{width:46px;height:46px;border-radius:50%;border:1px solid var(--line);
  display:grid;place-items:center;color:var(--brand);justify-self:end;
  transition:background .3s var(--e-out),color .3s,border-color .3s}
.sico svg{width:22px;height:22px}
.srow:hover .sico{background:var(--brand);color:#fff;border-color:var(--brand)}
@media(max-width:820px){
  .srow{grid-template-columns:54px minmax(0,1fr) 46px;row-gap:8px}
  .srow p{grid-column:2/4}
}
.extras{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-top:34px}
.extras b{font-family:var(--serif);font-size:1.15rem;margin-right:8px;font-weight:400}
.chip{border:1px solid var(--line);border-radius:99px;padding:9px 18px;font-size:.9rem;
  color:var(--ink-2);background:var(--surface)}

.work{background:var(--ink-deep);color:#fff}
.work .kicker{color:var(--accent)}
.work .d2{color:#fff}
.work .lede{color:rgba(255,255,255,.72)}
.ba{margin-top:clamp(26px,4vw,46px)}
.ba+.ba{margin-top:clamp(34px,5vw,64px)}
.slider{position:relative;overflow:hidden;border-radius:16px;background:#000;
  user-select:none;touch-action:pan-y;cursor:ew-resize}
.slider img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.slider .after{clip-path:inset(0 0 0 var(--pos,50%))}
.lab{position:absolute;bottom:16px;z-index:4;background:rgba(0,0,0,.72);color:#fff;
  font-size:.68rem;font-weight:700;letter-spacing:.16em;text-transform:uppercase;
  padding:7px 14px;border-radius:99px;pointer-events:none;backdrop-filter:blur(6px)}
.lab.b{left:16px}.lab.a{right:16px}
.handle{position:absolute;top:0;bottom:0;left:var(--pos,50%);width:2px;
  background:rgba(255,255,255,.95);z-index:5;pointer-events:none}
.handle::after{content:'';position:absolute;top:50%;left:50%;translate:-50% -50%;
  width:54px;height:54px;border-radius:50%;background:#fff;box-shadow:0 6px 26px rgba(0,0,0,.45)}
.handle svg{position:absolute;top:50%;left:50%;translate:-50% -50%;width:22px;height:22px;
  z-index:2;color:var(--ink-deep)}
.ba-cap{display:flex;flex-wrap:wrap;align-items:baseline;gap:8px 16px;padding-top:18px}
.ba-cap h3{font-size:1.3rem;color:#fff}
.ba-cap span{color:rgba(255,255,255,.6);font-size:.94rem}

.emg{background:var(--accent);color:var(--on-accent)}
.emg-grid{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr);
  gap:clamp(28px,5vw,72px);align-items:center}
.emg .kicker{color:var(--on-accent)}
.emg .d2{color:var(--on-accent)}
.emg p{color:color-mix(in srgb,var(--on-accent) 78%,transparent);margin:20px 0 0;max-width:44ch;font-size:1.05rem}
.big-tel{display:inline-flex;flex-direction:column;gap:6px;padding:30px 34px;border-radius:18px;
  background:var(--ink-deep);color:#fff;transition:transform .25s var(--e-out)}
.big-tel:hover{transform:translateY(-3px)}
.big-tel b{font-family:var(--serif);font-size:clamp(2rem,4.6vw,3.3rem);line-height:1;
  letter-spacing:-.02em;font-weight:400}
.big-tel small{font-size:.78rem;letter-spacing:.14em;text-transform:uppercase;
  color:rgba(255,255,255,.62)}
@media(max-width:860px){.emg-grid{grid-template-columns:1fr}}

.gal{display:grid;grid-template-columns:repeat(6,1fr);gap:clamp(8px,1.2vw,14px)}
.gal figure{margin:0;overflow:hidden;border-radius:12px;background:var(--ink-deep)}
.gal img{width:100%;height:100%;object-fit:cover;transition:transform .7s var(--e-out)}
.gal figure:hover img{transform:scale(1.05)}
.g-x4{grid-column:span 4;aspect-ratio:16/10}
.g-x2{grid-column:span 2;aspect-ratio:4/5}
.g-x3{grid-column:span 3;aspect-ratio:3/2}
.g-x6{grid-column:span 6;aspect-ratio:16/9}
.g-x6w{grid-column:span 6;aspect-ratio:21/9}
@media(max-width:820px){
  .gal{grid-template-columns:repeat(2,1fr)}
  .gal figure{grid-column:span 1!important;aspect-ratio:4/5!important}
}

/* legal prose — editorial two-column rows, same skeleton as the service list */
.legal{background:var(--paper-2)}
.lg{display:grid;grid-template-columns:minmax(0,.5fr) minmax(0,1fr);
  gap:clamp(16px,3vw,56px);padding:clamp(26px,4vw,44px) 0;border-top:1px solid var(--line)}
.lg h3{font-size:clamp(1.35rem,2.4vw,1.9rem)}
.lg-body p{margin:0 0 1em;color:var(--ink-2);font-size:.95rem;line-height:1.7;max-width:70ch}
.lg-body p:last-child{margin-bottom:0}
@media(max-width:820px){.lg{grid-template-columns:1fr}}

/* shop — catalogue grid + the chat-order cart */
.shop{background:var(--paper-2)}
.pgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));
  gap:clamp(14px,2vw,26px)}
.pcard{background:var(--surface);border:1px solid var(--line);border-radius:14px;
  overflow:hidden;display:flex;flex-direction:column;
  transition:transform .3s var(--e-out),box-shadow .3s var(--e-out)}
.pcard:hover{transform:translateY(-3px);box-shadow:0 22px 44px -26px rgba(0,0,0,.35)}
.pcard figure{margin:0;background:var(--ink-deep)}
.pcard figure img{width:100%;aspect-ratio:4/3;object-fit:cover}
.p-body{display:flex;flex-direction:column;gap:10px;padding:18px 18px 20px;flex:1}
.p-line{display:flex;align-items:baseline;justify-content:space-between;gap:12px}
.p-line h3{font-size:1.22rem}
.p-price{font-weight:600;font-size:1rem;color:var(--brand);white-space:nowrap}
.p-body p{margin:0;color:var(--ink-2);font-size:.9rem;line-height:1.5}
.p-act{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-top:auto;padding-top:6px}
.p-add{border:0;cursor:pointer;font:inherit;font-weight:600;font-size:.87rem;
  background:var(--ink-deep);color:#fff;border-radius:99px;min-height:42px;padding:0 20px;
  transition:background .2s,transform .2s var(--e-out)}
.p-add:hover{background:var(--brand)}
.p-add:active{transform:scale(.96)}
.p-buy{font-weight:600;font-size:.87rem;color:var(--brand);
  border-bottom:1px solid var(--line);padding-bottom:2px}
.p-buy:hover{color:var(--accent);border-color:var(--accent)}
.cart-fab{position:fixed;right:18px;bottom:18px;z-index:90;border:0;cursor:pointer;
  width:60px;height:60px;border-radius:50%;background:var(--accent);color:var(--on-accent);
  display:grid;place-items:center;box-shadow:0 12px 34px -8px rgba(0,0,0,.45);
  transition:transform .2s var(--e-out)}
.cart-fab:hover{transform:translateY(-2px)}
.cart-fab svg{width:26px;height:26px}
.cart-fab b{position:absolute;top:-4px;right:-4px;min-width:24px;height:24px;padding:0 6px;
  border-radius:99px;background:var(--ink-deep);color:#fff;font-size:.75rem;font-weight:600;
  display:grid;place-items:center}
.cart{position:fixed;right:18px;bottom:90px;z-index:91;width:min(360px,calc(100vw - 36px));
  background:var(--surface);color:var(--ink);border:1px solid var(--line);border-radius:16px;
  box-shadow:0 30px 70px -20px rgba(0,0,0,.45);padding:18px;font-size:.92rem}
.cart-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}
.cart-head b{font-family:var(--serif);font-size:1.2rem;font-weight:400}
.cart-head button{border:0;background:none;cursor:pointer;font-size:1rem;color:var(--ink-2);
  min-width:36px;min-height:36px}
.cart-row{display:flex;align-items:center;gap:10px;padding:9px 0;border-top:1px solid var(--line)}
.cart-row .cr-name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cart-row .cr-qty{display:flex;align-items:center;gap:2px}
.cart-row .cr-qty button{border:1px solid var(--line);background:none;cursor:pointer;
  width:28px;height:28px;border-radius:8px;font-size:.95rem;line-height:1;color:var(--ink)}
.cart-row .cr-qty button:hover{border-color:var(--brand);color:var(--brand)}
.cart-row .cr-qty b{min-width:24px;text-align:center;font-weight:600}
.cart-row .cr-price{white-space:nowrap;color:var(--ink-2)}
.cart-total{display:flex;justify-content:space-between;align-items:baseline;
  padding:12px 0 4px;border-top:1px solid var(--line);margin-top:2px}
.cart-total b{font-family:var(--serif);font-size:1.25rem;font-weight:400}
.cart-send{display:flex;align-items:center;justify-content:center;min-height:50px;
  margin-top:10px;border-radius:99px;background:var(--accent);color:var(--on-accent);
  font-weight:600;font-size:.95rem;transition:filter .2s,transform .2s var(--e-out)}
.cart-send:hover{filter:brightness(1.07);transform:translateY(-1px)}
.cart-note{margin:10px 0 0;font-size:.76rem;color:var(--ink-2);text-align:center;line-height:1.45}
/* the display rules above outrank the UA [hidden] style — restate it at author level */
.cart-fab[hidden],.cart[hidden]{display:none}
@media(max-width:520px){.cart{right:10px;left:10px;width:auto;bottom:86px}.cart-fab{right:12px;bottom:12px}}

.contact{background:var(--ink-deep);color:#fff}
.contact .kicker{color:var(--accent)}
.contact .d2{color:#fff}
.c-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);
  gap:clamp(30px,5vw,80px);align-items:start}
.crow{display:flex;gap:20px;padding:20px 0;border-bottom:1px solid var(--line-on-dark);align-items:flex-start}
.crow:first-child{border-top:1px solid var(--line-on-dark)}
.ck{font-size:.7rem;letter-spacing:.16em;text-transform:uppercase;color:rgba(255,255,255,.5);
  width:96px;flex:none;padding-top:5px}
.cv{font-size:1.06rem;font-weight:500;word-break:break-word}
.cv small{display:block;font-weight:400;font-size:.86rem;color:rgba(255,255,255,.55);margin-top:4px}
.cv a{border-bottom:1px solid rgba(255,255,255,.28);padding-bottom:2px}
.cv a:hover{border-color:var(--accent);color:var(--accent)}
@media(max-width:860px){.c-grid{grid-template-columns:1fr}}

footer{background:var(--ink-deep);color:rgba(255,255,255,.4);font-size:.82rem;
  padding-block:26px 34px;border-top:1px solid var(--line-on-dark)}
footer .wrap{display:flex;flex-wrap:wrap;gap:10px 26px;align-items:baseline}
footer b{font-family:var(--serif);color:#fff;font-weight:400;font-size:1.05rem}
footer .note{margin-left:auto;font-size:.76rem;color:rgba(255,255,255,.3);max-width:56ch}
footer .credit{flex-basis:100%;font-size:.72rem;color:rgba(255,255,255,.28)}
footer .credit a{border-bottom:1px solid rgba(255,255,255,.2)}
footer .credit a:hover{color:rgba(255,255,255,.7)}
${opts.viewerBadge ? `.ul-badge{position:fixed;bottom:12px;left:12px;z-index:99;display:flex;gap:6px;align-items:center;
  background:rgba(20,20,20,.82);color:rgba(255,255,255,.85);backdrop-filter:blur(8px);
  font-size:.7rem;line-height:1;padding:7px 11px;border-radius:99px;
  box-shadow:0 4px 18px rgba(0,0,0,.3)}
.ul-badge a{color:inherit;border-bottom:1px solid rgba(255,255,255,.3)}
.ul-badge a:hover{color:#fff}
.ul-badge i{font-style:normal;opacity:.45}
` : ''}
</style>
</head>
<body>
${opts.still ? '' : `<script>
(function(){
  if(matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var r=document.documentElement; r.classList.add('js');
  setTimeout(function(){ if(!window.gsap) r.classList.remove('js'); },2500);
})();
</script>`}

<header class="nav" id="nav">
  <div class="wrap">
    <a class="mark" href="#top">
      <span class="mono">${esc((c.logoText || c.brandName || 'U').trim().slice(0, 2).toUpperCase())}</span>
      <span>${esc(c.brandName)}</span>
    </a>
    <nav class="nlinks" aria-label="Main">
      ${navLinks}
    </nav>
    ${phonePill}
  </div>
</header>

<div id="top" class="hero">
  ${heroImg ? `<div class="hero-media" id="heroMedia">${heroImg}</div>` : ''}
  <div class="wrap">
    <p class="kicker rv-h">${esc(c.hero.kicker)}</p>
    <h1 class="d1 rv-h">${accentise(esc(c.hero.title))}</h1>
    <p class="lede rv-h">${esc(c.hero.lede)}</p>
    <div class="hero-cta rv-h">
      ${heroCtas}
    </div>
  </div>
  ${stats ? `<div class="hstrip"><div class="wrap">\n      ${stats}\n  </div></div>` : '<div style="height:60px"></div>'}
</div>

${ticker}
${statement}
${servicesSec}
${shopSec}
${workSec}
${bandSec}
${gallerySec}
${legalSec}
${contactSec}

<footer>
  <div class="wrap">
    <b>${esc(c.brandName)}</b>
    <span>${esc(c.footer.line)}</span>
    ${c.footer.note ? `<span class="note">${esc(c.footer.note)}</span>` : ''}
    ${credit}
  </div>
</footer>

${
  opts.viewerBadge
    ? `<div class="ul-badge">a visitor-made site, made with <a href="${esc(appUrl)}" rel="noopener">Urlite</a><i>·</i><a href="https://github.com/Blondu2024/urlite/issues" rel="noopener">report</a></div>`
    : ''
}
${opts.still ? '' : `<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js" defer></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/ScrollTrigger.min.js" defer></script>`}
<script>
document.querySelectorAll('[data-slider]').forEach(function(el){
  var down=false;
  function set(x){var r=el.getBoundingClientRect();
    el.style.setProperty('--pos',Math.max(0,Math.min(100,(x-r.left)/r.width*100))+'%');}
  el.addEventListener('pointerdown',function(e){down=true;el.setPointerCapture(e.pointerId);set(e.clientX);});
  el.addEventListener('pointermove',function(e){if(down)set(e.clientX);});
  el.addEventListener('pointerup',function(){down=false;});
  el.addEventListener('pointercancel',function(){down=false;});
});
var nav=document.getElementById('nav');
addEventListener('scroll',function(){nav.classList.toggle('solid',scrollY>60);},{passive:true});
${hasCart ? `(function(){
  var shop=document.getElementById('shop');
  var fab=document.getElementById('cartFab');
  var panel=document.getElementById('cartPanel'),list=document.getElementById('cartList'),
      totalEl=document.getElementById('cartTotal'),countEl=document.getElementById('cartCount'),
      send=document.getElementById('cartSend'),
      wa=shop.getAttribute('data-wa')||'',mail=shop.getAttribute('data-mail')||'',
      cur=shop.getAttribute('data-cur')||'',brand=shop.getAttribute('data-brand')||'';
  var items=[]; /* {name, price, qty} — lives only in this page view */
  function num(p){var v=parseFloat(String(p).replace(',','.'));return isNaN(v)?null:v;}
  function money(v){var s=(Math.round(v*100)/100).toString();return cur?s+' '+cur:s;}
  function line(it){return it.qty+'× '+it.name+(it.price?' — '+it.price+(cur?' '+cur:''):'');}
  function message(){
    var out=[brand,''].concat(items.map(line));
    var sum=total(); if(sum!==null) out.push('','Total: '+money(sum));
    return out.join('\\n');
  }
  function total(){
    var sum=0;
    for(var i=0;i<items.length;i++){var v=num(items[i].price);if(v===null)return null;sum+=v*items[i].qty;}
    return sum;
  }
  function render(){
    var n=items.reduce(function(a,it){return a+it.qty;},0);
    countEl.textContent=String(n);
    fab.hidden=n===0;
    if(n===0){panel.hidden=true;return;}
    list.textContent='';
    items.forEach(function(it,idx){
      var row=document.createElement('div');row.className='cart-row';
      var name=document.createElement('span');name.className='cr-name';name.textContent=it.name;
      var qty=document.createElement('span');qty.className='cr-qty';
      var minus=document.createElement('button');minus.type='button';minus.textContent='−';
      minus.addEventListener('click',function(){it.qty--;if(it.qty<1)items.splice(idx,1);render();});
      var q=document.createElement('b');q.className='tab-num';q.textContent=String(it.qty);
      var plus=document.createElement('button');plus.type='button';plus.textContent='+';
      plus.addEventListener('click',function(){it.qty++;render();});
      qty.appendChild(minus);qty.appendChild(q);qty.appendChild(plus);
      var price=document.createElement('span');price.className='cr-price tab-num';
      var v=num(it.price);price.textContent=v===null?it.price:money(v*it.qty);
      row.appendChild(name);row.appendChild(qty);row.appendChild(price);
      list.appendChild(row);
    });
    var sum=total();
    totalEl.textContent=sum===null?String(n):money(sum);
    send.href=wa?'https://wa.me/'+wa+'?text='+encodeURIComponent(message())
      :'mailto:'+mail+'?subject='+encodeURIComponent(brand)+'&body='+encodeURIComponent(message());
  }
  shop.addEventListener('click',function(e){
    var btn=e.target&&e.target.closest?e.target.closest('[data-add]'):null;
    if(!btn)return;
    var name=btn.getAttribute('data-name')||'';
    var found=null;
    for(var i=0;i<items.length;i++)if(items[i].name===name)found=items[i];
    if(found)found.qty++;else items.push({name:name,price:btn.getAttribute('data-price')||'',qty:1});
    render();panel.hidden=false;
  });
  fab.addEventListener('click',function(){panel.hidden=!panel.hidden;});
  document.getElementById('cartClose').addEventListener('click',function(){panel.hidden=true;});
})();` : ''}
${opts.still ? '' : `addEventListener('load',function(){
  var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(reduce||!window.gsap||!window.ScrollTrigger){
    document.documentElement.classList.remove('js'); return; }
  gsap.registerPlugin(ScrollTrigger);
  gsap.utils.toArray('.rv').forEach(function(el){
    gsap.to(el,{opacity:1,y:0,duration:.75,ease:'power3.out',
      scrollTrigger:{trigger:el,start:'top 88%'}});
  });
  gsap.utils.toArray('.rv-i').forEach(function(el){
    gsap.to(el,{opacity:1,duration:.9,ease:'power2.out',
      scrollTrigger:{trigger:el,start:'top 90%'}});
  });
  if(document.getElementById('heroMedia')){
    gsap.to('#heroMedia',{yPercent:14,ease:'none',
      scrollTrigger:{trigger:'.hero',start:'top top',end:'bottom top',scrub:true}});
  }
  gsap.utils.toArray('[data-slider]').forEach(function(el){
    ScrollTrigger.create({trigger:el,start:'top 72%',once:true,onEnter:function(){
      gsap.fromTo(el,{'--pos':'88%'},{'--pos':'42%',duration:1.5,ease:'power2.inOut',delay:.25});
    }});
  });
});`}
</script>
</body>
</html>`;
}

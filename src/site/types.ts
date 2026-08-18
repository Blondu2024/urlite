/** The whole website. This object IS the site — it travels inside the URL. */

export interface Theme {
  /** main brand colour (dark-ish, used for icons, kicker, hovers) */
  brand: string;
  /** near-black tinted with brand — dark sections, nav pill */
  ink: string;
  /** the single accent (CTA + one full-colour band) */
  accent: string;
  /** page background */
  paper: string;
  /** slightly darker paper — statement band */
  paper2: string;
  /** ink colour of text placed on the accent */
  onAccent: string;
}

export interface HeroStat {
  big: string;
  small: string;
}

export interface Service {
  title: string;
  text: string;
  /** id from the icon library */
  icon: string;
}

export interface BeforeAfter {
  before: string; // image url
  after: string; // image url
  title: string;
  caption: string;
}

export interface LegalSection {
  title: string;
  /** long prose; blank lines split paragraphs */
  body: string;
}

export interface ShopProduct {
  name: string;
  /** free-typed number ("18", "4.50") — the cart sums what parses */
  price: string;
  desc: string;
  image: string;
  /** optional per-product payment link (Stripe Payment Link, PayPal.me…) — http(s) only */
  payLink?: string;
}

export interface ContactRow {
  label: string;
  value: string;
  /** optional href; only tel:, mailto:, http(s): survive sanitising */
  href?: string;
  sub?: string;
}

export interface SiteConfig {
  v: 1;
  /** UI language of the generated page chrome (aria labels, before/after labels) */
  lang: 'en' | 'ro' | 'da';
  theme: Theme;
  brandName: string;
  tagline: string; // small line used in <title> / meta
  logoText?: string; // 1-2 letters for the generated favicon monogram

  nav: { services: string; work: string; gallery: string; contact: string; legal?: string; shop?: string };

  hero: {
    image: string;
    kicker: string;
    /** words wrapped in *asterisks* become the accent-coloured <em> */
    title: string;
    lede: string;
    ctaPrimary: string;
    /** optional URL for the primary CTA (app store listing etc.); wins over tel */
    ctaHref?: string;
    /** tel number the primary CTA and phone pill dial */
    phone: string;
    phoneDisplay: string;
    ctaSecondary: string;
    stats: HeroStat[]; // exactly 3 look best
  };

  ticker: { on: boolean; items: string[] };

  statement: { on: boolean; big: string; text: string; image: string };

  services: {
    headKicker: string;
    headTitle: string;
    headLede: string;
    items: Service[];
    extrasLabel: string;
    extras: string[];
  };

  work: {
    on: boolean;
    headKicker: string;
    headTitle: string;
    headLede: string;
    labelBefore: string;
    labelAfter: string;
    items: BeforeAfter[];
  };

  band: {
    on: boolean;
    kicker: string;
    title: string;
    text: string;
    ctaBig: string;
    ctaSmallTop: string;
    ctaSmallBottom: string;
  };

  gallery: { on: boolean; headKicker: string; headTitle: string; images: string[] };

  /** long-prose blocks (privacy policy, terms) — the app-store one-pager */
  legal: { on: boolean; headKicker: string; headTitle: string; sections: LegalSection[] };

  /**
   * The mini-shop: a catalogue with a client-side cart. Checkout is a
   * pre-filled chat message (wa.me / mailto) or a pasted payment link —
   * never a card form; the page stays zero-backend.
   */
  shop: {
    on: boolean;
    headKicker: string;
    headTitle: string;
    headLede: string;
    /** shown after the number: "18 lei", "45 kr." */
    currency: string;
    /** WhatsApp number orders are sent to (free-typed; digits are extracted) */
    whatsapp: string;
    /** fallback order channel when there is no WhatsApp */
    orderEmail?: string;
    products: ShopProduct[];
  };

  contact: {
    headKicker: string;
    headTitle: string;
    lede: string;
    cta: string;
    rows: ContactRow[];
  };

  footer: { line: string; note: string };
}

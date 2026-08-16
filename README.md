# Urlite — the website that lives inside the link

**Live: [urlite.app](https://urlite.app)**

Urlite is a one-page website builder with **zero backend**. The entire site — every word,
colour, section and photo address — is compressed into the URL fragment itself:

```
https://urlite.app/s/#v1.<deflate → base64url of the site's JSON>
```

The fragment never reaches any server. There is no database, no account, no analytics.
The link **is** the website: whoever holds it holds the site. A typical finished site
weighs **~3 KB** — about 800× lighter than the average web page — and small enough that
the whole website fits inside a QR code.

## What you get

- **Live editor** at [`/app`](https://urlite.app/app) — edit on the left,
  WYSIWYG preview on the right. Your draft autosaves into the link in the address bar.
- **Templates** for real small businesses (garden care, painter, restaurant, salon,
  auto service) plus an **app page** — the one-pager Apple/Google expect for a store
  listing: what the app does, privacy policy and terms, on one page.
- **Three languages** (English, Romanian, Danish) — switch and the whole site rewrites.
- **8 colour themes**, ~30 hand-drawn SVG line icons, editorial typography.
- **Share**: copy the link, scan the QR (the site travels inside it), or
  **download the site as a single standalone HTML file** and host it anywhere.

## How it works

One function is the single source of truth: `renderSiteHTML(config)` in
[`src/site/render.ts`](src/site/render.ts). The editor preview, the `/s/` viewer and the
HTML export all call it — what you see is what ships, by construction.

The codec ([`src/site/codec.ts`](src/site/codec.ts)) packs the site's JSON with
deflate (fflate) into a base64url payload prefixed `v1.`. The viewer decodes, normalizes
and renders it client-side.

### Security

Everything in the link is untrusted input from a URL anyone can craft, so:

- all text is HTML-escaped at render time,
- colours are validated as strict hex,
- image URLs must be absolute `http(s)`,
- contact links are whitelisted to `tel:` / `mailto:` / `http(s)`,
- the test suite includes explicit XSS round-trips ([`test/`](test/)).

### SEO, honestly

Content in a URL fragment is **not indexable** — search engines never see it. Urlite is
built for sites that live in a message: demos, menus, one-pagers sent over chat or QR,
app-store legal pages. When you want Google, use **Download HTML** and host the file on
any static host (Netlify, Vercel, GitHub Pages — free): that copy is fully indexable.
A hosted, indexable stub that redirects to the fragment link is another workable pattern.

## Prior art

After building Urlite we learned of [itty.bitty](https://github.com/alcor/itty.bitty),
which pioneered self-contained sites in the URL fragment — we arrived at the idea
independently, and it's a lovely piece of prior art. Urlite's take: a full visual editor,
business-grade templates in three languages, themes, QR sharing and standalone HTML export.

## Development

```bash
npm install
npm run dev        # editor on http://localhost:5173
npm test           # vitest — codec roundtrips, XSS, layout regressions
npm run typecheck
npm run build
```

## License

[MIT](LICENSE) © 2026 [Cristian Tănase](https://github.com/Blondu2024). Built in the
open with Claude Code.

# Urlite — the website that lives inside the link

**Live: [urlite.app](https://urlite.app)**

Urlite is a one-page website builder with **zero backend**. The entire site — every word,
colour, section and photo address — is compressed into the URL fragment itself:

```
https://urlite.app/s/#v1.<deflate → base64url of the site's JSON>
```

The fragment never reaches any server. There is no database, no account, no analytics.
That holds unless you choose a short link, the one opt-in exception, described below.
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
The download also packs your photos into the file as data URIs, so it works offline
and survives expiring image links.

### The SEO stub pattern

If you want to keep editing through the Urlite link but still be findable, host a tiny
**stub page**: a real, crawlable HTML file that carries your name, description and
contact details, and sends human visitors on to the fragment link. Search engines index
the stub; people land on the full site.

Save this as `index.html`, fill in your details, and put it on any free static host:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Greenline Gardens — garden care in Dublin</title>
  <meta name="description" content="Lawns, hedges and seasonal clean-ups in Dublin. Call +353 00 000 0000.">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <!-- humans continue to the full site; crawlers read this page -->
  <script>location.replace("https://urlite.app/s/#v1.YOUR-LINK-HERE");</script>
</head>
<body>
  <h1>Greenline Gardens</h1>
  <p>Garden care in Dublin: lawns, hedges, seasonal clean-ups.</p>
  <p>Phone: <a href="tel:+35300000000">+353 00 000 0000</a> ·
     Email: <a href="mailto:hello@example.com">hello@example.com</a></p>
  <noscript><p><a href="https://urlite.app/s/#v1.YOUR-LINK-HERE">Open the full site</a></p></noscript>
</body>
</html>
```

Two honest notes: the stub is what search engines rank, so put your real keywords and
contact details in its text, not just in the redirect; and if the site stops changing,
hosting the full downloaded HTML instead of a stub is the stronger SEO move.

## Short links, if you need one on a van

The link a site lives in grows with the site, and past roughly 2.9 KB it stops
fitting in a QR code. The `app` and `shop` templates are both past that, which
made the two templates aimed at businesses the two you could not print.

So there is one optional exception to "no backend". Press "Make a short link I
can print" in the share dialog and you get `urlite-x.vercel.app/x/<id>`, which
answers a redirect into the ordinary viewer. Four things are stored against that
id: the same encoded site your long link already carries, a SHA-256 of the key
you are given, and the times that record was created and last changed. Nothing
else. No account, no email, no analytics, no cookie.

The key is a second link. Keep it. It is the only way to change what an already
printed code shows, and nobody can recover it for you.

Short links are served from a different host than urlite.app on purpose, so
pages made by strangers never render on the domain the editor lives on.

If you do not press that button, nothing changes. Your link is still the whole
site, still needs nothing from anybody, and still works if this project
disappears tomorrow.

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

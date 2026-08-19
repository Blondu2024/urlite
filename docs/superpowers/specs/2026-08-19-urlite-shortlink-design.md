# Design: stable short links (printable QR codes)

Date: 2026-08-19
Status: approved for planning

## The problem

Two reports from real use, one root cause.

1. **The QR code disappears on bigger sites.** The whole site rides in the URL
   fragment, so the link grows with the content. The `app` preset encodes to
   ~3.6 KB and the `shop` preset to ~3.0 KB, both past what a QR code can hold
   even at the most permissive error-correction level. `src/app/Share.tsx`
   already handles this gracefully (`errorCorrectionLevel: 'L'`, and on
   rejection it sets `qrOk = false` so the code and the sentence about it both
   disappear), but graceful is not the same as useful: the two templates aimed
   at businesses are exactly the ones that cannot be printed on a window, a
   van or a business card.

2. **A printed QR code cannot follow edits.** Editing a site produces a new
   link, so anything already printed points at the old version forever.

Both are the same missing piece: a short, stable indirection that survives a
change of content. Better compression would buy margin on (1) and does nothing
at all for (2).

## Non-goals

Deliberately excluded, so the feature stays one feature:

- scan analytics
- user-chosen custom slugs
- expiry or renewal
- deleting a link from the UI
- accounts of any kind

## Architecture

**A short link does not host the site. It remembers which link the site is.**

`GET /x/<id>` looks the payload up and answers `302` to `/s/#v1.<payload>`.

Consequences that make this the cheap option:

- no new rendering path on the server, so no new XSS surface
- `src/viewer/`, `src/site/codec.ts` and `renderSiteHTML()` are untouched
- the product's story survives honestly: the site still travels in a link, and
  the short link only remembers which one

### Host isolation

Short links are served from a **separate host on the same Vercel project**
(`urlite-x.vercel.app`, or whatever is free at build time), never from
`urlite.app`.

Reason: on 2026-08-16 Google Safe Browsing flagged `urlite.app` for "social
engineering" while the site hosted no user content at all; it was cleared on
2026-08-18. Storing and serving user-submitted pages is the most abused
category on the web, and the blast radius of a future flag should not include
the editor, the landing page and the brand.

That same incident is also the evidence the isolation works: `urlite.app` was
flagged while `urlite-app.vercel.app` stayed clean, from one deployment.
Safe Browsing acts per host.

**The redirect target must stay on the short host** (`urlite-x.vercel.app/s/#…`,
not `urlite.app/s/#…`). Sending the browser back to the brand domain to render
the content would make the isolation decorative.

`urlite-app.vercel.app` keeps its existing 308 to `urlite.app` untouched, so no
old link changes behaviour.

Routing, in `vercel.json`:

- on the short host: serve `/x/*` and `/s/*`; redirect everything else to
  `urlite.app`
- `/x/*` carries `X-Robots-Tag: noindex`, matching what `/s/*` already does
- `/x/:id` requested on `urlite.app` redirects to the short host rather than
  resolving there

## Data model

One key per link, in Upstash Redis, reached over its REST API with `fetch`.
No npm client, no new runtime dependency, matching the self-contained style of
`api/rewrite.ts`.

Key `x:<id>`, value JSON:

```
{ payload: string, secretHash: string, createdAt: number, updatedAt: number }
```

- `id` — 10 characters from an unambiguous alphabet
  (`23456789abcdefghjkmnpqrstuvwxyz`, no `0/o/1/l/i`), from
  `crypto.getRandomValues`, ~49 bits. Short enough to print, wide enough that
  enumeration is not worth the rate limit.
- `secret` — 16 random bytes, base64url. Stored only as its SHA-256.
- `payload` — the existing encoded string, `v1.…`, byte-identical to what the
  long link carries.

At ~4 KB a site, the free tier holds tens of thousands of links.

## API

One function file, `api/link.ts`, self-contained. Relative imports into `../src`
fail at runtime on Vercel's builder (see the note in `api/fetch-site.ts`), so
the pure helpers live in that same file and are exported by name; the tests
import them from there, Vercel imports the default handler. No cross-file
runtime import is introduced.

The store is an injected interface, `{ get(key), set(key, value) }`. The default
handler builds an Upstash-backed one from the environment; tests pass a
Map-backed one. That is what makes the handler testable without network.

**Create** — `POST /api/link` with `{ payload }` → `{ id, secret }`

**Update** — `POST /api/link` with `{ id, secret, payload }` → `{ ok: true }`
Wrong or missing secret answers `403`. Unknown id answers `404`.

**Resolve** — `GET /x/:id` (rewritten to `api/x.ts`) → `302` to
`/s/#<payload>` on the same host, `Cache-Control: no-store` so an update is
visible on the next scan. An unknown id redirects to `/s/` with no fragment,
which lands on the viewer's existing "this link doesn't seem to have a website
inside it" fallback rather than on a bare 404.

### Abuse guards

Carried over from `api/rewrite.ts`: browser-origin allowlist, per-IP rate limit
per warm instance (4/min for create, 10/min for update), hard size cap on the
payload (64 KB).

New, and the important one: **the payload must inflate and look like a
`SiteConfig`** — it must start with the `v1.` prefix, inflate, parse as JSON,
be a plain object, and carry `v === 1`, a string `brandName`, and objects at
`theme` and `hero` (the fields `src/site/types.ts` marks as required and the
renderer reads unconditionally). Anything else is refused. This stops the endpoint being
used as storage for arbitrary text, which is the actual phishing vector. The
shape check is hand-written in `api/link.ts`, since the types in `src/site/`
cannot be imported at runtime. `fflate` is already a dependency, so
`inflateSync` is available to the function.

## Client

Opt-in throughout. The long link stays the default and stays self-contained.

**Share modal.** Below the QR code, a new section: an explanation plus a button
for the case where the link has to go on a sign, a van or a business card.
After creation it shows the short link, the QR code regenerated from it (which
now always fits), and the management link, with the warning that this one is
the key to the site.

**Editor.** Opened as `/app#m=<id>.<secret>`, it loads the site and shows a bar
saying this site has a printed link, with an `Update the printed link` button.
The pair is also kept in `localStorage` so the same device does not need the
management link, but the link is presented as the thing to save, because
`localStorage` does not travel between devices.

**Copy.** The modal currently reads "No server, no database, no account." That
sentence becomes false for anyone who takes a short link. It is rewritten so it
is true in both cases, as part of this work rather than after it.

## Testing

TDD, `vitest`, no network.

- `id` alphabet, length and uniqueness under repeated generation
- secret hashing, and that the secret itself is never stored
- create: returns id and secret, writes the payload unchanged
- update: right secret rewrites the payload and bumps `updatedAt`
- update: wrong secret answers 403 and leaves the stored payload untouched
- update: unknown id answers 404
- payload refused when it is not deflate-decodable, not JSON, not a config
  shape, or over the size cap
- rate limit trips at the configured number of requests
- resolve: 302 with the fragment, `no-store`, and the short host preserved
- an identity test that `src/site/codec.ts` and the rendered viewer output are
  unchanged byte-for-byte, in the manner of `test/export-embed.test.ts`

## Operations

New environment variables on the Vercel project:
`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `SHORT_HOST`.

Deploy stays manual: `npx vercel deploy --prod --yes`. Pushing to GitHub does
not deploy, and both push and deploy are asked for first.

## Risks

- **Abuse leading to a Safe Browsing flag on the short host.** Accepted and
  contained by the host isolation, `noindex`, the visitor badge already on
  `/s/`, the report link, the rate limit and the config-shape check.
- **A lost management link cannot be recovered.** Accepted: there is no account
  system and no user data at stake, so the recovery path is building a new site
  and printing a new code. The UI has to say this plainly at creation time.
- **Upstash free-tier limits.** Payloads are kilobytes; if the tier is ever
  reached, that is a signal of real use, not a failure to design around now.

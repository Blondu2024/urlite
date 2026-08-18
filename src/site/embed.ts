import type { SiteConfig } from './types';
import { safeImageUrl } from './sanitize';

/**
 * Photo embedding for the HTML export.
 *
 * The shared link can only ever carry photo *addresses* — the whole site has
 * to fit in a ~2.5 KB URL fragment. The downloaded file has no such limit, so
 * at export time the photos are fetched and packed into the document as
 * data: URIs. The link and the codec are untouched; any photo that cannot be
 * fetched (CORS, network, not an image) simply keeps its URL in the export.
 */

/** One image is capped so a mistyped URL can't balloon the file. */
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 15_000;

/** Every http(s) image URL the rendered page can show, deduped. */
export function collectImageUrls(c: SiteConfig): string[] {
  const urls = [
    c.hero.image,
    c.statement.image,
    ...c.work.items.flatMap((w) => [w.before, w.after]),
    ...c.gallery.images,
  ];
  return [...new Set(urls.map(safeImageUrl).filter(Boolean))];
}

/**
 * Fetches each URL and returns `{ url: 'data:image/…;base64,…' }` for the ones
 * that came back as images. Failures are left out of the map — never thrown.
 */
export async function embedImages(
  urls: string[],
  fetchFn: typeof fetch = (...args) => fetch(...args),
): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  await Promise.all(
    urls.map(async (url) => {
      try {
        const res = await fetchFn(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
        if (!res.ok) return;
        const type = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
        if (!type.startsWith('image/')) return;
        const bytes = new Uint8Array(await res.arrayBuffer());
        if (bytes.byteLength === 0 || bytes.byteLength > MAX_IMAGE_BYTES) return;
        out[url] = `data:${type};base64,${toBase64(bytes)}`;
      } catch {
        /* CORS, network, timeout — the export falls back to the URL */
      }
    }),
  );
  return out;
}

function toBase64(bytes: Uint8Array): string {
  let bin = '';
  const CHUNK = 0x8000; // String.fromCharCode blows the stack on huge arrays
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin);
}

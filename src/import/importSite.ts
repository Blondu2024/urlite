import type { SiteConfig } from '../site/types';
import { extractSite, type Extracted } from './extract';

/** Client side of the magic import: fetch through our proxy, extract locally. */
export async function importSite(rawUrl: string, template: SiteConfig): Promise<Extracted> {
  const url = /^https?:\/\//i.test(rawUrl) ? rawUrl : 'https://' + rawUrl;
  const res = await fetch('/api/fetch-site?url=' + encodeURIComponent(url));
  const data = (await res.json()) as { ok: boolean; url?: string; html?: string; error?: string };
  if (!data.ok || !data.html) throw new Error(data.error ?? 'Could not read that page.');
  return extractSite(data.html, data.url ?? url, template);
}

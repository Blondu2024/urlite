import type { SiteConfig } from '../site/types';
import { extractSite, readableText, type Extracted } from './extract';
import { applyBrief, type Brief } from './rewrite';

/**
 * Client side of the magic import: fetch through our proxy, extract locally,
 * then let the AI pass write the copy in the business's own words. The AI
 * step is best-effort — if it fails (budget cap, model down, thin page) the
 * heuristic result stands on its own.
 */
export async function importSite(rawUrl: string, template: SiteConfig): Promise<Extracted> {
  const url = /^https?:\/\//i.test(rawUrl) ? rawUrl : 'https://' + rawUrl;
  const res = await fetch('/api/fetch-site?url=' + encodeURIComponent(url));
  const data = (await res.json()) as { ok: boolean; url?: string; html?: string; error?: string };
  if (!data.ok || !data.html) throw new Error(data.error ?? 'Could not read that page.');
  const extracted = extractSite(data.html, data.url ?? url, template);

  if (extracted.found.length) {
    try {
      const r = await fetch('/api/rewrite', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text: readableText(data.html), lang: template.lang }),
      });
      const j = (await r.json()) as { ok: boolean; brief?: Brief };
      if (j.ok && j.brief) {
        extracted.config = applyBrief(extracted.config, j.brief);
        extracted.found.push('ai');
      }
    } catch {
      /* the heuristic import is already a complete site */
    }
  }
  return extracted;
}

import { decodeSite } from '../site/codec';
import { normalizeConfig } from '../site/normalize';
import { renderSiteHTML } from '../site/render';

/**
 * The viewer: takes the URL fragment (which never touches any server),
 * unfolds it, and becomes the website that was travelling inside the link.
 */

function appUrl(): string {
  return location.origin;
}

function show(): void {
  const raw = decodeSite(location.hash);
  if (raw === null) {
    const el = document.getElementById('fallback');
    if (el) {
      el.innerHTML =
        '<p>This link doesn’t seem to have a website inside it.</p>' +
        `<p><a href="${appUrl()}/app">Build one — it takes five minutes.</a></p>`;
    }
    return;
  }
  const html = renderSiteHTML(normalizeConfig(raw), { appUrl: appUrl() + '/app', viewerBadge: true });
  document.open();
  document.write(html);
  document.close();
}

addEventListener('hashchange', () => location.reload());
show();

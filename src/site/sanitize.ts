/** Everything in a SiteConfig arrives from a URL anyone can craft. Trust nothing. */

export function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Image sources: only absolute http(s). Anything else renders as no image. */
export function safeImageUrl(url: string): string {
  const t = url.trim();
  if (/^https?:\/\/[^\s]+$/i.test(t)) return t;
  return '';
}

/** Contact hrefs: http(s), tel:, mailto: — everything else is dropped. */
export function safeHref(url: string): string {
  const t = url.trim();
  if (/^https?:\/\/[^\s]+$/i.test(t)) return t;
  if (/^tel:\+?[0-9 ().-]{3,24}$/i.test(t)) return 'tel:' + t.slice(4).replace(/[^+0-9]/g, '');
  if (/^mailto:[^\s<>"']+@[^\s<>"']+$/i.test(t)) return t;
  return '';
}

/** Builds a tel: href from a free-typed phone number. */
export function telHref(phone: string): string {
  const digits = phone.replace(/[^+0-9]/g, '');
  return digits.length >= 3 ? 'tel:' + digits : '';
}

export function safeColor(c: string, fallback: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(c.trim()) ? c.trim() : fallback;
}

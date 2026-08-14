/**
 * Inline SVG icon library for generated sites.
 * Rules from the approved standard: constant stroke-width 1.6, 24-unit viewBox,
 * drawn line icons — never glyphs (✦ ★) and never emoji.
 * Only the inner paths are stored; the renderer wraps them in a fixed <svg>.
 */

export const ICONS: Record<string, string> = {
  tree: '<path d="M12 3 6.5 11h3.2L5 18h14l-4.7-7h3.2z"/><path d="M12 18v3"/>',
  leaf: '<path d="M5 19C5 9 12 4 20 4c0 8-5 15-15 15z"/><path d="M5 19c3-5 7-8 11-10"/>',
  scissors:
    '<circle cx="7" cy="18" r="2.4"/><circle cx="17" cy="18" r="2.4"/><path d="M8.6 16.2 18 4M15.4 16.2 6 4"/>',
  hedge:
    '<path d="M3 9h18v9H3z"/><path d="M3 9c2-3 5-4 9-4s7 1 9 4"/><path d="M8 18v3M16 18v3"/>',
  stump:
    '<ellipse cx="12" cy="9" rx="6" ry="3"/><path d="M6 9v5c0 1.7 2.7 3 6 3s6-1.3 6-3V9"/><path d="M3 20h18"/>',
  spray:
    '<path d="M4 6h6v4H4z"/><path d="M10 8h4l6-3v10l-6-3h-4"/><path d="M6 10v9"/>',
  brush:
    '<path d="M4 3h12v6H4z"/><path d="M16 5h4v3a2 2 0 0 1-2 2h-8v3"/><path d="M9 13h2v8H9z"/>',
  roller:
    '<rect x="3" y="4" width="13" height="5" rx="1.5"/><path d="M16 6h4v4h-9v3"/><path d="M10 13h2v7h-2z"/>',
  ladder: '<path d="M8 3v18M16 3v18"/><path d="M8 7h8M8 12h8M8 17h8"/>',
  home: '<path d="M4 11 12 4l8 7"/><path d="M6 10v10h12V10"/><path d="M10 20v-6h4v6"/>',
  wall: '<path d="M3 6h18v12H3z"/><path d="M3 12h18M9 6v6M15 12v6"/>',
  hammer:
    '<path d="M14 5 5 14l3 3 9-9"/><path d="M12 3h5l3 3-2 4-6-6z"/><path d="M5 14l-1 6 6-1"/>',
  wrench:
    '<path d="M14 7a4 4 0 0 1 5-4l-3 3 2 2 3-3a4 4 0 0 1-4 5L8 19a2 2 0 0 1-3-3z"/>',
  bolt: '<path d="M13 2 4 14h6l-1 8 9-12h-6z"/>',
  car: '<path d="M4 15l1.5-5.5A2 2 0 0 1 7.4 8h9.2a2 2 0 0 1 1.9 1.5L20 15"/><path d="M3 15h18v4h-2.5M3 19h2.5"/><circle cx="7.5" cy="19" r="1.8"/><circle cx="16.5" cy="19" r="1.8"/>',
  gauge:
    '<path d="M4 18a8 8 0 1 1 16 0"/><path d="M12 14l4-5"/><circle cx="12" cy="15" r="1.4"/>',
  plate:
    '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><path d="M12 1.5V4M12 20v2.5"/>',
  chef: '<path d="M8 8a4 4 0 0 1 8 0 3 3 0 0 1 1 5.8V19H7v-5.2A3 3 0 0 1 8 8z"/><path d="M7 22h10"/>',
  coffee:
    '<path d="M4 8h12v7a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z"/><path d="M16 9h2a2.5 2.5 0 0 1 0 5h-2"/><path d="M7 3.5v2M11 3.5v2"/>',
  cake: '<path d="M5 12h14v8H5z"/><path d="M5 15c1.5 1.6 3 1.6 4.5 0s3-1.6 4.5 0 3 1.6 4.5 0"/><path d="M12 8v4M12 4.5v.01"/>',
  flower:
    '<circle cx="12" cy="9" r="2.5"/><path d="M12 6.5a3 3 0 1 1 3 2.5 3 3 0 1 1-1 4 3 3 0 1 1-4 0 3 3 0 1 1-1-4 3 3 0 1 1 3-2.5z"/><path d="M12 14v7"/>',
  sparkle:
    '<path d="M12 3c.7 4 2.3 5.6 6.5 6.5-4.2.9-5.8 2.5-6.5 6.5-.7-4-2.3-5.6-6.5-6.5C9.7 8.6 11.3 7 12 3z"/><path d="M19 15l.6 2.4L22 18l-2.4.6L19 21l-.6-2.4L16 18l2.4-.6z"/>',
  camera:
    '<path d="M4 8h4l2-2.5h4L16 8h4v11H4z"/><circle cx="12" cy="13" r="3.4"/>',
  cart: '<path d="M4 5h2l2.4 10.5a1.6 1.6 0 0 0 1.6 1.2h6.9a1.6 1.6 0 0 0 1.6-1.2L20.5 9H7"/><circle cx="10" cy="20" r="1.6"/><circle cx="17" cy="20" r="1.6"/>',
  gift: '<path d="M4 10h16v10H4z"/><path d="M4 7h16v3H4zM12 7v13"/><path d="M12 7c-3 0-4.5-1-4.5-2.5S9.5 2 12 7c2.5-5 4.5-4 4.5-2.5S15 7 12 7z"/>',
  truck:
    '<path d="M3 7h11v10H3z"/><path d="M14 11h4l3 3v3h-7"/><circle cx="7" cy="17" r="1.8"/><circle cx="17" cy="17" r="1.8"/>',
  clock:
    '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3.5 2"/>',
  shield:
    '<path d="M12 3 5 6v5c0 5 3 8.4 7 10 4-1.6 7-5 7-10V6z"/><path d="M9 12l2.2 2.2L15.5 10"/>',
  star: '<path d="M12 4l2.3 4.9 5.2.7-3.8 3.7.9 5.2L12 16l-4.6 2.5.9-5.2L4.5 9.6l5.2-.7z"/>',
  phone:
    '<path d="M6.5 3h3l1.5 4-2 1.5a13 13 0 0 0 6.5 6.5l1.5-2 4 1.5v3a2 2 0 0 1-2.2 2A17.5 17.5 0 0 1 4.5 5.2 2 2 0 0 1 6.5 3z"/>',
  pin: '<path d="M12 21s-6.5-5.6-6.5-10.5a6.5 6.5 0 0 1 13 0C18.5 15.4 12 21 12 21z"/><circle cx="12" cy="10.5" r="2.3"/>',
  scent:
    '<path d="M9 3h6"/><path d="M10.5 3v4L6 13a6.5 6.5 0 1 0 12 0l-4.5-6V3"/><path d="M8 15h8"/>',
};

export const ICON_IDS = Object.keys(ICONS);

/** Renders one library icon as a full inline SVG string. */
export function iconSvg(id: string, cls = ''): string {
  const paths = ICONS[id] ?? ICONS.sparkle;
  const c = cls ? ` class="${cls}"` : '';
  return (
    `<svg${c} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" ` +
    `stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`
  );
}

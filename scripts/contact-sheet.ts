/** QA: one page with every preset image + its Unsplash id, for visual audit. */
import { writeFileSync } from 'fs';
import { PRESETS } from '../src/site/presets';

const id = (u: string) => (u.match(/photo-([0-9a-f-]+)\?/) ?? [])[1] ?? u;
let cells = '';
for (const p of PRESETS) {
  const imgs: [string, string][] = [
    ['hero', p.images.hero],
    ['statement', p.images.statement],
    ...p.images.work.flatMap((w, i): [string, string][] => [
      [`work${i} before`, w[0]],
      [`work${i} after`, w[1]],
    ]),
    ...p.images.gallery.map((g, i): [string, string] => [`gal${i + 1}`, g]),
  ];
  cells += `<h2>${p.id}</h2><div class="g">`;
  for (const [label, url] of imgs) {
    cells += `<figure><img src="${url.replace(/w=\d+/, 'w=320')}"><figcaption>${label}<br>${id(url)}</figcaption></figure>`;
  }
  cells += '</div>';
}
writeFileSync(
  '_qa/sheet.html',
  `<!doctype html><meta charset="utf-8"><style>
  body{font:12px system-ui;margin:20px}h2{margin:18px 0 6px}
  .g{display:grid;grid-template-columns:repeat(8,1fr);gap:8px}
  img{width:100%;aspect-ratio:4/3;object-fit:cover}figure{margin:0}
  figcaption{font-size:9px;word-break:break-all}
  </style>${cells}`,
);
console.log('sheet written');

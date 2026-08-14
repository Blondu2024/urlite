/**
 * QA helper (CITESTE.md method): renders presets to _qa review copies with
 * 100svh flattened, JS reveal-gating removed and GSAP stripped, so a headless
 * screenshot sees the whole page. Never deployed — _qa is gitignored.
 */
import { mkdirSync, writeFileSync } from 'fs';
import { renderSiteHTML } from '../src/site/render';
import { buildPreset } from '../src/site/presets';
import { encodeSite } from '../src/site/codec';

mkdirSync('_qa', { recursive: true });

const targets: [string, 'en' | 'ro' | 'da'][] = [
  ['garden', 'en'],
  ['restaurant', 'ro'],
  ['salon', 'da'],
  ['auto', 'en'],
  ['painter', 'ro'],
];

for (const [id, lang] of targets) {
  let html = renderSiteHTML(buildPreset(id, lang));
  html = html
    .replace(/min-height:100svh/g, 'min-height:860px')
    .replace(/r\.classList\.add\('js'\)/, '/* qa: no gating */')
    .replace(/<script src="https:\/\/cdn\.jsdelivr[^>]+><\/script>/g, '');
  writeFileSync(`_qa/${id}-${lang}.html`, html);
}

// also emit a real link for editor/viewer QA
writeFileSync('_qa/link.txt', encodeSite(buildPreset('garden', 'en')));
console.log('review copies written to _qa/');

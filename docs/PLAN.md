# URLITE — planul intern (nu se arată userului până la final)

## Ce este
**Urlite** — un builder de site-uri one-page în care ÎNTREGUL site trăiește în link.
Zero backend, zero bază de date, zero cont. Configul site-ului e JSON → deflate (fflate)
→ base64url → fragmentul URL-ului (`/s#v1.<payload>`). Viewerul decodează și randează.

Pitch: „The entire website lives inside the link. ~3 KB. No server. No account."

## De ce asta
- Uimește tehnic (dev-ii de pe LinkedIn: „site-ul E linkul") și practic (clienții văd
  site-ul lor instant, îl pot chiar edita).
- Utilitate directă pentru pipeline-ul de servicii: demo nou = 5 minute în editor,
  trimis ca link. Export „Download HTML" = exact fișierul autonom din pipeline-ul
  actual de deploy (`~/clienti/_deploy`).
- Cost: 0. Vercel static + Unsplash hotlink + GSAP CDN.

## Arhitectura
- Vite + React + TS. Două pagini: `/` (landing + editor SPA, rută `/app`) și `/s/`
  (viewer vanilla, minuscul: decode hash → scrie documentul generat).
- **O singură funcție-sursă de adevăr**: `renderSiteHTML(config): string` — folosită de
  preview-ul din editor (iframe srcdoc), de viewer (`/s#...`) și de exportul HTML.
  WYSIWYG garantat prin construcție.
- Design system al site-urilor generate = ȘABLONUL APROBAT 13 aug (listă numerotată
  01–06, secțiuni pe culoare plină, Instrument Serif display ~8rem, GSAP reveals +
  parallax + slider before/after care se șterge singur, iconițe SVG inline stroke 1.6,
  hero animat din CSS nu din JS, nav alb pe hero → închis pe .solid).
- Fonturi în site-urile generate: Google Fonts (Instrument Serif + Sans). GSAP: CDN.

## Securitate (suprafața = configul vine din URL, de la oricine)
- TOT textul escapat HTML. Culori validate hex strict. URL-uri imagine: doar http(s).
- Linkuri contact construite doar din câmpuri validate (tel:/mailto: cu whitelist de caractere).
- Test XSS explicit în suită.

## Feature-list (v1)
1. Editor: secțiuni colapsabile (Brand, Hero, Ticker, Statement, Services 01–06,
   Before/After, Bandă accent, Galerie, Contact), toggle on/off pe secțiuni.
2. Teme: ~8 palete curate (semantic tokens), aplicate live.
3. Iconițe: bibliotecă ~24 SVG inline, picker per serviciu.
4. Presets pe industrii (grădinărit, zugrav/renovări, restaurant, salon, auto, magazin)
   × 3 limbi (EN / RO / DA) — schimbi limba, tot site-ul se rescrie.
5. Share: copy link + QR + „site-ul tău are X KB" (vs ~2,4 MB media web) + Download HTML.
6. Landing: aceeași estetică editorială; demonstrează conceptul cu linkuri-exemplu.

## Teste (Vitest) — înainte de deploy
- codec roundtrip (config → link → config), stabilitate versiune (`v1.`).
- XSS: `<script>` în orice câmp text nu ajunge ca tag în HTML.
- sanitizare URL imagini (javascript: respins), culori invalide respinse.
- render: secțiuni on/off apar/dispar; bugetul de mărime al linkului (preset plin < 8 KB).
- typecheck verde.

## QA vizual
Headless Chrome (F:\Program Files\Google\Chrome\Application\chrome.exe), metoda din
CITESTE.md (copie de verificare cu 100svh→820px, fără gating .js, benzi cu PIL).

## Deploy
`npx vercel --prod --yes` — proiect NOU, nume `urlite` (fallback urlite-app). Fără git push
(nu există remote). Commit local cu autorul Blondu2024@users.noreply.github.com.

## Pași
1. ✅ Recon (vercel auth, șablon aprobat citit)
2. Schelet Vite MPA + deps
3. site/: types, palettes, icons, presets (6×3 limbi), render.ts, codec.ts
4. Teste codec+render+XSS
5. Viewer /s/
6. Editor /app
7. Landing /
8. QA screenshots + fixuri
9. Deploy + verificare live
10. Memorie + reveal către user

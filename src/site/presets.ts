import type { SiteConfig } from './types';
import { paletteById } from './palettes';

/**
 * Industry starter presets in three languages. Every image URL below was
 * verified live (HTTP 200) against images.unsplash.com on 2026-08-14.
 */

export type Lang = SiteConfig['lang'];

const U = (id: string, w = 1600) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=72`;

/** Everything language-dependent in one flat pack. */
interface CopyPack {
  brandName: string;
  tagline: string;
  nav: [string, string, string, string]; // services, work, gallery, contact
  kicker: string;
  title: string; // *accent* marks the coloured words
  lede: string;
  ctaPrimary: string;
  ctaSecondary: string;
  stats: [string, string][];
  ticker: string[];
  stBig: string;
  stText: string;
  svcKicker: string;
  svcTitle: string;
  svcLede: string;
  services: [string, string][];
  extrasLabel: string;
  extras: string[];
  workKicker: string;
  workTitle: string;
  workLede: string;
  labelBefore: string;
  labelAfter: string;
  workItems: [string, string][];
  bandKicker: string;
  bandTitle: string;
  bandText: string;
  bandTop: string;
  bandBottom: string;
  galKicker: string;
  galTitle: string;
  cKicker: string;
  cTitle: string;
  cLede: string;
  cCta: string;
  rows: { label: string; value: string; href?: string; sub?: string }[];
  footLine: string;
  footNote: string;
  /* app-page extras: long-prose legal blocks + their nav label */
  navLegal?: string;
  legalKicker?: string;
  legalTitle?: string;
  legalSections?: [string, string][]; // [title, body]
}

interface PresetImages {
  hero: string;
  statement: string;
  work: [string, string][]; // [before, after]
  gallery: string[];
}

export interface Preset {
  id: string;
  paletteId: string;
  label: Record<Lang, string>;
  icons: string[];
  images: PresetImages;
  ticker: boolean;
  work: boolean;
  band: boolean;
  copy: Record<Lang, CopyPack>;
  phone: Record<Lang, [string, string]>; // [tel, display]
  /** primary hero CTA links here instead of dialling (app store listing) */
  ctaHref?: string;
}

function assemble(p: Preset, lang: Lang): SiteConfig {
  const c = p.copy[lang];
  const pal = paletteById(p.paletteId);
  const [phone, phoneDisplay] = p.phone[lang];
  return {
    v: 1,
    lang,
    theme: {
      brand: pal.brand,
      ink: pal.ink,
      accent: pal.accent,
      paper: pal.paper,
      paper2: pal.paper2,
      onAccent: pal.onAccent,
    },
    brandName: c.brandName,
    tagline: c.tagline,
    logoText: c.brandName.slice(0, 1),
    nav: { services: c.nav[0], work: c.nav[1], gallery: c.nav[2], contact: c.nav[3], legal: c.navLegal },
    hero: {
      image: p.images.hero,
      kicker: c.kicker,
      title: c.title,
      lede: c.lede,
      ctaPrimary: c.ctaPrimary,
      ctaHref: p.ctaHref,
      phone,
      phoneDisplay,
      ctaSecondary: c.ctaSecondary,
      stats: c.stats.map(([big, small]) => ({ big, small })),
    },
    ticker: { on: p.ticker, items: c.ticker },
    statement: { on: true, big: c.stBig, text: c.stText, image: p.images.statement },
    services: {
      headKicker: c.svcKicker,
      headTitle: c.svcTitle,
      headLede: c.svcLede,
      items: c.services.map(([title, text], i) => ({
        title,
        text,
        icon: p.icons[i % p.icons.length],
      })),
      extrasLabel: c.extrasLabel,
      extras: c.extras,
    },
    work: {
      on: p.work,
      headKicker: c.workKicker,
      headTitle: c.workTitle,
      headLede: c.workLede,
      labelBefore: c.labelBefore,
      labelAfter: c.labelAfter,
      items: p.images.work.map(([before, after], i) => ({
        before,
        after,
        title: c.workItems[i]?.[0] ?? '',
        caption: c.workItems[i]?.[1] ?? '',
      })),
    },
    band: {
      on: p.band,
      kicker: c.bandKicker,
      title: c.bandTitle,
      text: c.bandText,
      ctaBig: phoneDisplay,
      ctaSmallTop: c.bandTop,
      ctaSmallBottom: c.bandBottom,
    },
    gallery: { on: true, headKicker: c.galKicker, headTitle: c.galTitle, images: p.images.gallery },
    legal: {
      on: (c.legalSections ?? []).length > 0,
      headKicker: c.legalKicker ?? '',
      headTitle: c.legalTitle ?? '',
      sections: (c.legalSections ?? []).map(([title, body]) => ({ title, body })),
    },
    contact: { headKicker: c.cKicker, headTitle: c.cTitle, lede: c.cLede, cta: c.cCta, rows: c.rows },
    footer: { line: c.footLine, note: c.footNote },
  };
}

/* ================================ GARDEN ================================ */

const garden: Preset = {
  id: 'garden',
  paletteId: 'forest',
  label: { en: 'Garden & tree care', ro: 'Grădinărit & toaletare', da: 'Have & træpleje' },
  icons: ['tree', 'hedge', 'scissors', 'stump', 'spray', 'leaf'],
  images: {
    hero: U('1416879595882-3373a0480b5b'),
    statement: U('1523348837708-15d4a09cfac2', 1200),
    work: [[U('1516253593875-bd7ba052fbc5', 1400), U('1591857177580-dc82b9ac4e1e', 1400)]],
    gallery: [
      U('1501004318641-b39e6451bec6', 1200),
      U('1589923188900-85dae523342b', 900),
      U('1461354464878-ad92f492a5a0', 900),
      U('1558904541-efa843a96f01', 1200),
      U('1524247108137-732e0f642303', 1000),
      U('1466692476868-aef1dfb1e735', 1000),
    ],
  },
  ticker: true,
  work: true,
  band: true,
  phone: {
    en: ['+353 85 000 0000', '085 000 0000'],
    ro: ['+40 700 000 000', '0700 000 000'],
    da: ['+45 00 00 00 00', '00 00 00 00'],
  },
  copy: {
    en: {
      brandName: 'Rowan & Root',
      tagline: 'Garden & tree care',
      nav: ['Services', 'Our work', 'Gallery', 'Contact'],
      kicker: 'Gardening & tree surgery',
      title: 'We quote any size job, *big or small.*',
      lede: 'Tree work, hedges, garden clearance and pressure washing — with a free quotation before anything starts.',
      ctaPrimary: 'Call for a free quote',
      ctaSecondary: 'See the work',
      stats: [
        ['24 hours', 'Emergency call-outs'],
        ['Free', 'Quotations, any size job'],
        ['Fully', 'Insured & equipped'],
      ],
      ticker: ['Free quotations', '24-hour emergency call-outs', 'Fully insured crew'],
      stBig: 'Looking for skilled hands for your garden?',
      stText:
        'Everything on this page is work we take on ourselves. If what you need is not listed, ask anyway — we quote any size job.',
      svcKicker: 'What we do',
      svcTitle: 'Garden work, done properly.',
      svcLede: 'From a single overhanging branch to a garden that has gone back to nature. We come out and look at it first.',
      services: [
        ['Tree removal & felling', 'Tree removal, felling and processing — including trees that have become unsafe.'],
        ['Hedge trimming', 'Hedges trimmed to shape, or removed entirely where they have taken over.'],
        ['Pruning', 'Pruning trees and shrubs to keep them healthy and in shape.'],
        ['Stump removal', 'Stump removal and grinding, so the ground can be used again.'],
        ['Pressure washing', 'Driveways, paths and patios washed back to their original colour.'],
        ['Garden clearance', 'Overgrown gardens cleared, cut back and made usable again.'],
      ],
      extrasLabel: 'And all your garden needs:',
      extras: ['Planting', 'Weeding', 'Fencing', 'Lawn care'],
      workKicker: 'Our work',
      workTitle: 'Before, and after.',
      workLede: 'Drag the handle across the photograph — these are our own jobs, nothing staged.',
      labelBefore: 'Before',
      labelAfter: 'After',
      workItems: [['Garden clearance', 'Same corner, same trees — overgrowth out, lawn back.']],
      bandKicker: 'Emergency',
      bandTitle: 'Unstable trees or dangerous overhangs?',
      bandText:
        'Don’t wait. If a tree has moved, split, or is leaning over something it should not be leaning over, ring and we will come and look at it.',
      bandTop: 'Ring, any hour',
      bandBottom: 'And surrounding areas',
      galKicker: 'More jobs',
      galTitle: 'Recent work',
      cKicker: 'Get in touch',
      cTitle: 'Free quotation, any size job.',
      cLede: 'Ring or send a message and tell us what needs doing. We quote before any work starts.',
      cCta: 'Call now',
      rows: [
        { label: 'Phone', value: '085 000 0000', href: 'tel:+353850000000' },
        { label: 'Email', value: 'hello@rowanandroot.ie', href: 'mailto:hello@rowanandroot.ie' },
        { label: 'Area', value: 'Dublin & surrounding areas' },
        { label: 'Hours', value: 'Mon–Sat, 8:00–18:00', sub: '24-hour emergency call-outs' },
      ],
      footLine: 'Dublin, Ireland',
      footNote: 'Demo website — replace every word with your own before sending.',
    },
    ro: {
      brandName: 'Grădina Verde',
      tagline: 'Grădinărit & toaletare pomi',
      nav: ['Servicii', 'Lucrări', 'Galerie', 'Contact'],
      kicker: 'Grădinărit & toaletare',
      title: 'Ofertăm orice lucrare, *mare sau mică.*',
      lede: 'Toaletare pomi, garduri vii, curățenie în grădină și spălare cu presiune — cu ofertă gratuită înainte să înceapă orice.',
      ctaPrimary: 'Sună pentru ofertă gratuită',
      ctaSecondary: 'Vezi lucrările',
      stats: [
        ['Non-stop', 'Intervenții de urgență'],
        ['Gratuit', 'Ofertă pentru orice lucrare'],
        ['Complet', 'Asigurați și echipați'],
      ],
      ticker: ['Oferte gratuite', 'Intervenții de urgență non-stop', 'Echipă asigurată'],
      stBig: 'Cauți mâini pricepute pentru grădina ta?',
      stText:
        'Tot ce vezi pe pagină e muncă pe care o facem noi înșine. Dacă ce-ți trebuie nu e în listă, întreabă oricum — ofertăm orice lucrare.',
      svcKicker: 'Ce facem',
      svcTitle: 'Lucru în grădină, făcut ca lumea.',
      svcLede: 'De la o singură creangă aplecată până la o grădină lăsată în paragină. Venim și ne uităm întâi.',
      services: [
        ['Doborâre & debitare pomi', 'Doborâm și debitem pomi — inclusiv pomi care au devenit periculoși.'],
        ['Tuns garduri vii', 'Garduri vii tunse la formă sau scoase complet unde au preluat controlul.'],
        ['Toaletare', 'Toaletăm pomi și arbuști ca să rămână sănătoși și în formă.'],
        ['Scoatere buturugi', 'Scoatem și frezăm buturugi, ca terenul să poată fi folosit din nou.'],
        ['Spălare cu presiune', 'Alei, trotuare și terase spălate până la culoarea lor originală.'],
        ['Curățenie în grădină', 'Grădini năpădite — curățate, tăiate și readuse la viață.'],
      ],
      extrasLabel: 'Și tot ce mai are nevoie grădina:',
      extras: ['Plantare', 'Plivit', 'Garduri', 'Gazon'],
      workKicker: 'Lucrările noastre',
      workTitle: 'Înainte, și după.',
      workLede: 'Trage de mâner peste fotografie — sunt lucrările noastre, nimic regizat.',
      labelBefore: 'Înainte',
      labelAfter: 'După',
      workItems: [['Curățenie în grădină', 'Același colț, aceiași pomi — vegetația în plus a dispărut.']],
      bandKicker: 'Urgențe',
      bandTitle: 'Pomi instabili sau crengi periculoase?',
      bandText:
        'Nu aștepta. Dacă un pom s-a mișcat, s-a crăpat sau atârnă peste ceva ce n-ar trebui, sună și venim să ne uităm.',
      bandTop: 'Sună, la orice oră',
      bandBottom: 'Și în împrejurimi',
      galKicker: 'Alte lucrări',
      galTitle: 'Lucrări recente',
      cKicker: 'Hai să vorbim',
      cTitle: 'Ofertă gratuită, orice lucrare.',
      cLede: 'Sună sau scrie-ne ce e de făcut. Ofertăm înainte să înceapă orice lucrare.',
      cCta: 'Sună acum',
      rows: [
        { label: 'Telefon', value: '0700 000 000', href: 'tel:+40700000000' },
        { label: 'Email', value: 'salut@gradinaverde.ro', href: 'mailto:salut@gradinaverde.ro' },
        { label: 'Zona', value: 'București & Ilfov' },
        { label: 'Program', value: 'Luni–Sâmbătă, 8:00–18:00', sub: 'Urgențe non-stop' },
      ],
      footLine: 'București, România',
      footNote: 'Site demonstrativ — înlocuiește fiecare cuvânt cu ale tale înainte să-l trimiți.',
    },
    da: {
      brandName: 'Grøn Gren',
      tagline: 'Have & træpleje',
      nav: ['Ydelser', 'Vores arbejde', 'Galleri', 'Kontakt'],
      kicker: 'Havearbejde & træfældning',
      title: 'Vi giver tilbud på alt, *stort som småt.*',
      lede: 'Træfældning, hække, haverydning og fliserens — med et gratis tilbud, før noget går i gang.',
      ctaPrimary: 'Ring for et gratis tilbud',
      ctaSecondary: 'Se arbejdet',
      stats: [
        ['Døgnet rundt', 'Akut udrykning'],
        ['Gratis', 'Tilbud på alle opgaver'],
        ['Fuldt', 'Forsikret og udstyret'],
      ],
      ticker: ['Gratis tilbud', 'Akut udrykning døgnet rundt', 'Fuldt forsikret hold'],
      stBig: 'Mangler du dygtige hænder til din have?',
      stText:
        'Alt på denne side er arbejde, vi selv udfører. Står det, du mangler, ikke på listen, så spørg alligevel — vi giver tilbud på alt.',
      svcKicker: 'Det laver vi',
      svcTitle: 'Havearbejde, gjort ordentligt.',
      svcLede: 'Fra en enkelt gren over taget til en have, der er vokset helt til. Vi kommer ud og kigger først.',
      services: [
        ['Træfældning', 'Fældning og bortskaffelse — også af træer, der er blevet farlige.'],
        ['Hækklipning', 'Hække klippet i form eller fjernet helt, hvor de har taget over.'],
        ['Beskæring', 'Beskæring af træer og buske, så de holder sig sunde og i form.'],
        ['Stubfræsning', 'Stubbe fjernes og fræses, så jorden kan bruges igen.'],
        ['Fliserens', 'Indkørsler, stier og terrasser renset tilbage til deres oprindelige farve.'],
        ['Haverydning', 'Tilgroede haver ryddet, skåret ned og gjort brugbare igen.'],
      ],
      extrasLabel: 'Og alt det andet i haven:',
      extras: ['Plantning', 'Ukrudt', 'Hegn', 'Græsplæne'],
      workKicker: 'Vores arbejde',
      workTitle: 'Før, og efter.',
      workLede: 'Træk i håndtaget hen over billedet — det er vores egne opgaver, intet opstillet.',
      labelBefore: 'Før',
      labelAfter: 'Efter',
      workItems: [['Haverydning', 'Samme hjørne, samme træer — det vilde er væk, græsset er tilbage.']],
      bandKicker: 'Akut',
      bandTitle: 'Ustabile træer eller farlige grene?',
      bandText:
        'Vent ikke. Hvis et træ har flyttet sig, er flækket eller hælder ind over noget, det ikke burde, så ring — vi kommer og kigger.',
      bandTop: 'Ring, når som helst',
      bandBottom: 'Og omegn',
      galKicker: 'Flere opgaver',
      galTitle: 'Seneste arbejde',
      cKicker: 'Kontakt os',
      cTitle: 'Gratis tilbud, alle opgaver.',
      cLede: 'Ring eller skriv, hvad der skal laves. Vi giver tilbud, før arbejdet går i gang.',
      cCta: 'Ring nu',
      rows: [
        { label: 'Telefon', value: '00 00 00 00', href: 'tel:+4500000000' },
        { label: 'Email', value: 'hej@groengren.dk', href: 'mailto:hej@groengren.dk' },
        { label: 'Område', value: 'Kalundborg & Vestsjælland' },
        { label: 'Åbent', value: 'Man–lør, 8:00–18:00', sub: 'Akut udrykning døgnet rundt' },
      ],
      footLine: 'Kalundborg, Danmark',
      footNote: 'Demoside — udskift hvert ord med dine egne, før du sender den.',
    },
  },
};

/* ================================ PAINTER ================================ */

const painter: Preset = {
  id: 'painter',
  paletteId: 'ocean',
  label: { en: 'Painter & renovation', ro: 'Zugrav & renovări', da: 'Maler & renovering' },
  icons: ['roller', 'brush', 'wall', 'ladder', 'hammer', 'home'],
  images: {
    hero: U('1562259949-e8e7689d7828'),
    statement: U('1503387762-592deb58ef4e', 1200),
    work: [[U('1504307651254-35680f356dfd', 1400), U('1513694203232-719a280e022f', 1400)]],
    gallery: [
      U('1484154218962-a197022b5858', 1200),
      U('1534349762230-e0cadf78f5da', 900),
      U('1572981779307-38b8cabb2407', 900),
      U('1502005229762-cf1b2da7c5d6', 1200),
      U('1560448204-e02f11c3d0e2', 1000),
      U('1560518883-ce09059eeffa', 1000),
    ],
  },
  ticker: false,
  work: true,
  band: true,
  phone: {
    en: ['+44 7700 000000', '07700 000000'],
    ro: ['+40 700 000 001', '0700 000 001'],
    da: ['+45 00 00 00 01', '00 00 00 01'],
  },
  copy: {
    en: {
      brandName: 'True Lines',
      tagline: 'Painting & renovation',
      nav: ['Services', 'Our work', 'Gallery', 'Contact'],
      kicker: 'Painting & decorating',
      title: 'Walls you’ll want to *look at twice.*',
      lede: 'Interior and exterior painting, plastering and full room renovations — tidy work, honest prices, and we clean up after ourselves.',
      ctaPrimary: 'Get a free estimate',
      ctaSecondary: 'See our work',
      stats: [
        ['15 years', 'On the tools'],
        ['Fixed', 'Written quotations'],
        ['Tidy', 'We clean up after ourselves'],
      ],
      ticker: [],
      stBig: 'A fresh coat changes the whole room.',
      stText:
        'We paint, plaster and renovate homes and shops. Every job starts with a walk-through and a written quote — no surprises halfway.',
      svcKicker: 'What we do',
      svcTitle: 'From one wall to the whole house.',
      svcLede: 'Small jobs welcome. Big jobs planned properly, room by room, with dates you can hold us to.',
      services: [
        ['Interior painting', 'Walls, ceilings, doors and trim — clean edges, even coats, no drips.'],
        ['Exterior painting', 'Facades, fences and windows painted to last through the weather.'],
        ['Plastering & repairs', 'Cracks, holes and tired walls skimmed smooth before any paint goes on.'],
        ['Wallpapering', 'Hung straight, matched at the seams, trimmed clean.'],
        ['Room renovation', 'Floors, walls and lighting brought together into one finished room.'],
        ['Colour advice', 'Not sure what works? We bring samples and paint test patches first.'],
      ],
      extrasLabel: 'Also happy to help with:',
      extras: ['Small carpentry', 'Silicone & sealing', 'Minor repairs'],
      workKicker: 'Our work',
      workTitle: 'Before, and after.',
      workLede: 'Drag the handle — the same room, before we started and the day we handed it back.',
      labelBefore: 'Before',
      labelAfter: 'After',
      workItems: [['Living room renovation', 'From building site to finished room.']],
      bandKicker: 'This month',
      bandTitle: 'Booking now for next month.',
      bandText: 'The calendar fills fast in painting season. Ring now and we will hold you a slot with a written quote.',
      bandTop: 'Call or text',
      bandBottom: 'Free walk-through',
      galKicker: 'The details',
      galTitle: 'Finished rooms',
      cKicker: 'Get in touch',
      cTitle: 'Tell us about your walls.',
      cLede: 'Send a few photos or ring us — we will tell you honestly what it needs and what it costs.',
      cCta: 'Get an estimate',
      rows: [
        { label: 'Phone', value: '07700 000000', href: 'tel:+447700000000' },
        { label: 'Email', value: 'hello@truelines.co.uk', href: 'mailto:hello@truelines.co.uk' },
        { label: 'Area', value: 'Manchester & area' },
        { label: 'Hours', value: 'Mon–Fri, 7:30–17:00' },
      ],
      footLine: 'Manchester, UK',
      footNote: 'Demo website — replace every word with your own before sending.',
    },
    ro: {
      brandName: 'Linia Dreaptă',
      tagline: 'Zugrăveli & renovări',
      nav: ['Servicii', 'Lucrări', 'Galerie', 'Contact'],
      kicker: 'Zugrăveli & amenajări',
      title: 'Pereți la care te uiți *de două ori.*',
      lede: 'Zugrăveli interioare și exterioare, gletuire și renovări complete — lucru curat, prețuri corecte, și strângem după noi.',
      ctaPrimary: 'Cere o estimare gratuită',
      ctaSecondary: 'Vezi lucrările',
      stats: [
        ['15 ani', 'De meserie'],
        ['Fix', 'Ofertă scrisă, fără surprize'],
        ['Curat', 'Strângem după noi'],
      ],
      ticker: [],
      stBig: 'Un strat proaspăt schimbă toată camera.',
      stText:
        'Zugrăvim, gletuim și renovăm case și spații comerciale. Orice lucrare începe cu o vizită și o ofertă scrisă — fără surprize la jumătate.',
      svcKicker: 'Ce facem',
      svcTitle: 'De la un perete la toată casa.',
      svcLede: 'Lucrările mici sunt binevenite. Cele mari se planifică serios, cameră cu cameră, cu termene de care ne ținem.',
      services: [
        ['Zugrăveli interioare', 'Pereți, tavane, uși și tocuri — margini curate, straturi uniforme, fără scurgeri.'],
        ['Zugrăveli exterioare', 'Fațade, garduri și ferestre vopsite să reziste la vreme.'],
        ['Gletuire & reparații', 'Crăpături, găuri și pereți obosiți netezți înainte de orice vopsea.'],
        ['Tapet', 'Montat drept, potrivit la îmbinări, tăiat curat.'],
        ['Renovare completă', 'Pardoseli, pereți și lumini aduse împreună într-o cameră terminată.'],
        ['Consultanță de culoare', 'Nu știi ce se potrivește? Venim cu mostre și dăm probe pe perete.'],
      ],
      extrasLabel: 'Te ajutăm și cu:',
      extras: ['Mică tâmplărie', 'Silicon & etanșări', 'Reparații mărunte'],
      workKicker: 'Lucrările noastre',
      workTitle: 'Înainte, și după.',
      workLede: 'Trage de mâner — aceeași cameră, înainte să începem și în ziua predării.',
      labelBefore: 'Înainte',
      labelAfter: 'După',
      workItems: [['Renovare living', 'De la șantier la cameră terminată.']],
      bandKicker: 'Luna asta',
      bandTitle: 'Programăm acum pentru luna viitoare.',
      bandText: 'Calendarul se umple repede în sezon. Sună acum și îți ținem locul, cu ofertă scrisă.',
      bandTop: 'Sună sau scrie',
      bandBottom: 'Vizită gratuită',
      galKicker: 'Detaliile',
      galTitle: 'Camere terminate',
      cKicker: 'Hai să vorbim',
      cTitle: 'Spune-ne despre pereții tăi.',
      cLede: 'Trimite câteva poze sau sună-ne — îți spunem cinstit ce e de făcut și cât costă.',
      cCta: 'Cere o estimare',
      rows: [
        { label: 'Telefon', value: '0700 000 001', href: 'tel:+40700000001' },
        { label: 'Email', value: 'contact@liniadreapta.ro', href: 'mailto:contact@liniadreapta.ro' },
        { label: 'Zona', value: 'Cluj-Napoca & împrejurimi' },
        { label: 'Program', value: 'Luni–Vineri, 7:30–17:00' },
      ],
      footLine: 'Cluj-Napoca, România',
      footNote: 'Site demonstrativ — înlocuiește fiecare cuvânt cu ale tale înainte să-l trimiți.',
    },
    da: {
      brandName: 'Lige Linjer',
      tagline: 'Maler & renovering',
      nav: ['Ydelser', 'Vores arbejde', 'Galleri', 'Kontakt'],
      kicker: 'Maler & istandsættelse',
      title: 'Vægge man kigger på *to gange.*',
      lede: 'Indvendig og udvendig maling, spartling og hele rum-renoveringer — pænt arbejde, ærlige priser, og vi rydder op efter os selv.',
      ctaPrimary: 'Få et gratis overslag',
      ctaSecondary: 'Se vores arbejde',
      stats: [
        ['15 år', 'I faget'],
        ['Fast', 'Skriftligt tilbud'],
        ['Pænt', 'Vi rydder op efter os selv'],
      ],
      ticker: [],
      stBig: 'Et frisk lag maling ændrer hele rummet.',
      stText:
        'Vi maler, spartler og istandsætter hjem og butikker. Hver opgave starter med en gennemgang og et skriftligt tilbud — ingen overraskelser halvvejs.',
      svcKicker: 'Det laver vi',
      svcTitle: 'Fra én væg til hele huset.',
      svcLede: 'Små opgaver er velkomne. Store opgaver planlægges ordentligt, rum for rum, med datoer du kan holde os op på.',
      services: [
        ['Indvendig maling', 'Vægge, lofter, døre og paneler — rene kanter, jævne lag, ingen løbere.'],
        ['Udvendig maling', 'Facader, hegn og vinduer malet til at holde vejret ude.'],
        ['Spartling & reparation', 'Revner, huller og trætte vægge spartlet glatte, før der males.'],
        ['Tapet', 'Hængt lige, mønstret samlet, skåret rent.'],
        ['Rum-renovering', 'Gulve, vægge og lys samlet til ét færdigt rum.'],
        ['Farverådgivning', 'I tvivl om farven? Vi tager prøver med og maler testfelter først.'],
      ],
      extrasLabel: 'Vi hjælper også med:',
      extras: ['Småt tømrerarbejde', 'Fuger & silikone', 'Små reparationer'],
      workKicker: 'Vores arbejde',
      workTitle: 'Før, og efter.',
      workLede: 'Træk i håndtaget — samme rum, før vi gik i gang og den dag vi afleverede.',
      labelBefore: 'Før',
      labelAfter: 'Efter',
      workItems: [['Stue-renovering', 'Fra byggeplads til færdigt rum.']],
      bandKicker: 'Denne måned',
      bandTitle: 'Vi booker nu til næste måned.',
      bandText: 'Kalenderen fyldes hurtigt i malersæsonen. Ring nu, så holder vi en plads til dig med skriftligt tilbud.',
      bandTop: 'Ring eller skriv',
      bandBottom: 'Gratis gennemgang',
      galKicker: 'Detaljerne',
      galTitle: 'Færdige rum',
      cKicker: 'Kontakt os',
      cTitle: 'Fortæl os om dine vægge.',
      cLede: 'Send et par billeder eller ring — vi siger ærligt, hvad der skal til, og hvad det koster.',
      cCta: 'Få et overslag',
      rows: [
        { label: 'Telefon', value: '00 00 00 01', href: 'tel:+4500000001' },
        { label: 'Email', value: 'hej@ligelinjer.dk', href: 'mailto:hej@ligelinjer.dk' },
        { label: 'Område', value: 'Holbæk & Vestsjælland' },
        { label: 'Åbent', value: 'Man–fre, 7:30–17:00' },
      ],
      footLine: 'Holbæk, Danmark',
      footNote: 'Demoside — udskift hvert ord med dine egne, før du sender den.',
    },
  },
};

/* =============================== RESTAURANT =============================== */

const restaurant: Preset = {
  id: 'restaurant',
  paletteId: 'terracotta',
  label: { en: 'Restaurant & café', ro: 'Restaurant & cafenea', da: 'Restaurant & café' },
  icons: ['chef', 'plate', 'coffee', 'cake', 'star', 'truck'],
  images: {
    hero: U('1517248135467-4c7edcad34c4'),
    statement: U('1476224203421-9ac39bcb3327', 1200),
    work: [],
    gallery: [
      U('1504674900247-0877df9cc836', 1200),
      U('1467003909585-2f8a72700288', 900),
      U('1540189549336-e6e99c3679fe', 900),
      U('1414235077428-338989a2e8c0', 1200),
      U('1565299624946-b28f40a0ae38', 1000),
      U('1555396273-367ea4eb4db5', 1000),
    ],
  },
  ticker: true,
  work: false,
  band: true,
  phone: {
    en: ['+44 7700 000002', '07700 000002'],
    ro: ['+40 700 000 002', '0700 000 002'],
    da: ['+45 00 00 00 02', '00 00 00 02'],
  },
  copy: {
    en: {
      brandName: 'Ember & Oak',
      tagline: 'Kitchen & coffee',
      nav: ['The kitchen', '', 'The room', 'Find us'],
      kicker: 'Kitchen · Coffee · Evenings',
      title: 'Honest food, *cooked over fire.*',
      lede: 'A small kitchen with a short menu that changes with the market. Lunch through dinner, six days a week.',
      ctaPrimary: 'Book a table',
      ctaSecondary: 'See the room',
      stats: [
        ['Six days', 'Tuesday to Sunday'],
        ['Short menu', 'Changes with the market'],
        ['Full bar', 'Wine, beer & coffee'],
      ],
      ticker: ['Sunday roast from 1pm', 'Fresh fish on Fridays', 'Coffee & cake all afternoon'],
      stBig: 'A short menu means everything on it earns its place.',
      stText:
        'We buy what looks good that week and cook it simply. If you have an allergy or a preference, tell us — the kitchen is small enough to care.',
      svcKicker: 'The kitchen',
      svcTitle: 'What comes out of it.',
      svcLede: 'Plates built around one good ingredient, cooked with fire and patience.',
      services: [
        ['Lunch', 'Quick, warm and honest — soups, sandwiches and one hot dish of the day.'],
        ['Dinner', 'A short evening menu — starters to share, mains from the grill.'],
        ['Coffee & cake', 'Beans from a local roaster, cakes baked in-house every morning.'],
        ['Weekend brunch', 'Eggs every way, fresh bread, and no rush whatsoever.'],
        ['Private tables', 'The back room seats twelve — birthdays, dinners, small gatherings.'],
        ['Takeaway', 'Most of the menu, packed properly, ready when you arrive.'],
      ],
      extrasLabel: 'Good to know:',
      extras: ['Vegetarian friendly', 'Dogs welcome outside', 'Card & phone payments'],
      workKicker: '',
      workTitle: '',
      workLede: '',
      labelBefore: 'Before',
      labelAfter: 'After',
      workItems: [],
      bandKicker: 'This weekend',
      bandTitle: 'Sunday roast, from 1 o’clock.',
      bandText: 'One sitting, slow-cooked, until it runs out. Ring ahead and we will hold you a table.',
      bandTop: 'Book a table',
      bandBottom: 'Tuesday–Sunday',
      galKicker: 'The room',
      galTitle: 'Come hungry.',
      cKicker: 'Find us',
      cTitle: 'The table is waiting.',
      cLede: 'Ring to book, or just walk in — the door is open from noon.',
      cCta: 'Book a table',
      rows: [
        { label: 'Phone', value: '07700 000002', href: 'tel:+447700000002' },
        { label: 'Email', value: 'table@emberandoak.co.uk', href: 'mailto:table@emberandoak.co.uk' },
        { label: 'Address', value: '14 Market Lane, York' },
        { label: 'Hours', value: 'Tue–Sun, 12:00–22:00', sub: 'Kitchen closes at 21:00' },
      ],
      footLine: 'York, UK',
      footNote: 'Demo website — replace every word with your own before sending.',
    },
    ro: {
      brandName: 'Jar & Stejar',
      tagline: 'Bucătărie & cafea',
      nav: ['Bucătăria', '', 'Localul', 'Ne găsești'],
      kicker: 'Bucătărie · Cafea · Seri lungi',
      title: 'Mâncare cinstită, *gătită pe foc.*',
      lede: 'O bucătărie mică, un meniu scurt care se schimbă odată cu piața. De la prânz până seara, șase zile pe săptămână.',
      ctaPrimary: 'Rezervă o masă',
      ctaSecondary: 'Vezi localul',
      stats: [
        ['Șase zile', 'De marți până duminică'],
        ['Meniu scurt', 'Se schimbă cu piața'],
        ['Bar complet', 'Vin, bere & cafea'],
      ],
      ticker: ['Friptura de duminică de la 13:00', 'Pește proaspăt vinerea', 'Cafea & prăjituri toată după-amiaza'],
      stBig: 'Un meniu scurt înseamnă că fiecare fel își merită locul.',
      stText:
        'Cumpărăm ce arată bine în săptămâna aia și gătim simplu. Dacă ai o alergie sau o preferință, spune-ne — bucătăria e destul de mică încât să-i pese.',
      svcKicker: 'Bucătăria',
      svcTitle: 'Ce iese din ea.',
      svcLede: 'Farfurii construite în jurul unui ingredient bun, gătit cu foc și răbdare.',
      services: [
        ['Prânz', 'Rapid, cald și cinstit — supe, sandvișuri și un fel cald al zilei.'],
        ['Cină', 'Meniu scurt de seară — gustări de împărțit, feluri principale de pe grătar.'],
        ['Cafea & prăjituri', 'Boabe de la o prăjitorie locală, prăjituri coapte în casă în fiecare dimineață.'],
        ['Brunch de weekend', 'Ouă în toate felurile, pâine proaspătă și zero grabă.'],
        ['Mese private', 'Salonul din spate ține doisprezece — aniversări, cine, întâlniri mici.'],
        ['La pachet', 'Aproape tot meniul, împachetat ca lumea, gata când ajungi.'],
      ],
      extrasLabel: 'Bine de știut:',
      extras: ['Opțiuni vegetariene', 'Câinii bineveniți pe terasă', 'Plată cu cardul'],
      workKicker: '',
      workTitle: '',
      workLede: '',
      labelBefore: 'Înainte',
      labelAfter: 'După',
      workItems: [],
      bandKicker: 'Weekendul ăsta',
      bandTitle: 'Friptura de duminică, de la ora 13.',
      bandText: 'O singură tranșă, gătită încet, până se termină. Sună înainte și îți ținem masa.',
      bandTop: 'Rezervă o masă',
      bandBottom: 'Marți–Duminică',
      galKicker: 'Localul',
      galTitle: 'Vino flămând.',
      cKicker: 'Ne găsești',
      cTitle: 'Masa te așteaptă.',
      cLede: 'Sună să rezervi sau intră pur și simplu — ușa e deschisă de la prânz.',
      cCta: 'Rezervă o masă',
      rows: [
        { label: 'Telefon', value: '0700 000 002', href: 'tel:+40700000002' },
        { label: 'Email', value: 'masa@jarsistejar.ro', href: 'mailto:masa@jarsistejar.ro' },
        { label: 'Adresa', value: 'Str. Pieței 14, Brașov' },
        { label: 'Program', value: 'Marți–Duminică, 12:00–22:00', sub: 'Bucătăria închide la 21:00' },
      ],
      footLine: 'Brașov, România',
      footNote: 'Site demonstrativ — înlocuiește fiecare cuvânt cu ale tale înainte să-l trimiți.',
    },
    da: {
      brandName: 'Glød & Eg',
      tagline: 'Køkken & kaffe',
      nav: ['Køkkenet', '', 'Lokalet', 'Find os'],
      kicker: 'Køkken · Kaffe · Aftener',
      title: 'Ærlig mad, *lavet over ild.*',
      lede: 'Et lille køkken med et kort menukort, der skifter med torvet. Frokost til aften, seks dage om ugen.',
      ctaPrimary: 'Book et bord',
      ctaSecondary: 'Se lokalet',
      stats: [
        ['Seks dage', 'Tirsdag til søndag'],
        ['Kort kort', 'Skifter med torvet'],
        ['Fuld bar', 'Vin, øl & kaffe'],
      ],
      ticker: ['Søndagssteg fra kl. 13', 'Frisk fisk om fredagen', 'Kaffe & kage hele eftermiddagen'],
      stBig: 'Et kort menukort betyder, at alt på det gør sig fortjent.',
      stText:
        'Vi køber det, der ser godt ud den uge, og laver det enkelt. Har du allergi eller en præference, så sig til — køkkenet er lille nok til at tage det alvorligt.',
      svcKicker: 'Køkkenet',
      svcTitle: 'Det, der kommer ud af det.',
      svcLede: 'Tallerkener bygget om én god råvare, lavet med ild og tålmodighed.',
      services: [
        ['Frokost', 'Hurtig, varm og ærlig — supper, smørrebrød og én varm ret.'],
        ['Aften', 'Kort aftenkort — forretter til deling, hovedretter fra grillen.'],
        ['Kaffe & kage', 'Bønner fra et lokalt risteri, kager bagt i huset hver morgen.'],
        ['Weekendbrunch', 'Æg på alle måder, friskt brød og ingen hastværk.'],
        ['Private borde', 'Baglokalet har plads til tolv — fødselsdage, middage, små selskaber.'],
        ['Takeaway', 'Det meste af kortet, pakket ordentligt, klar når du kommer.'],
      ],
      extrasLabel: 'Godt at vide:',
      extras: ['Vegetarvenligt', 'Hunde velkomne udenfor', 'Kort & MobilePay'],
      workKicker: '',
      workTitle: '',
      workLede: '',
      labelBefore: 'Før',
      labelAfter: 'Efter',
      workItems: [],
      bandKicker: 'I weekenden',
      bandTitle: 'Søndagssteg, fra klokken 13.',
      bandText: 'Én servering, langtidsstegt, til den slipper op. Ring i forvejen, så holder vi et bord.',
      bandTop: 'Book et bord',
      bandBottom: 'Tirsdag–søndag',
      galKicker: 'Lokalet',
      galTitle: 'Kom sulten.',
      cKicker: 'Find os',
      cTitle: 'Bordet venter.',
      cLede: 'Ring og book, eller kig bare ind — døren er åben fra middag.',
      cCta: 'Book et bord',
      rows: [
        { label: 'Telefon', value: '00 00 00 02', href: 'tel:+4500000002' },
        { label: 'Email', value: 'bord@gloedogeg.dk', href: 'mailto:bord@gloedogeg.dk' },
        { label: 'Adresse', value: 'Torvegade 14, Kalundborg' },
        { label: 'Åbent', value: 'Tir–søn, 12:00–22:00', sub: 'Køkkenet lukker kl. 21' },
      ],
      footLine: 'Kalundborg, Danmark',
      footNote: 'Demoside — udskift hvert ord med dine egne, før du sender den.',
    },
  },
};

/* ================================= SALON ================================= */

const salon: Preset = {
  id: 'salon',
  paletteId: 'plum',
  label: { en: 'Salon & beauty', ro: 'Salon & frumusețe', da: 'Salon & skønhed' },
  icons: ['scissors', 'sparkle', 'flower', 'scent', 'star', 'clock'],
  images: {
    hero: U('1560066984-138dadb4c035'),
    statement: U('1487412947147-5cebf100ffc2', 1200),
    work: [],
    gallery: [
      U('1522337660859-02fbefca4702', 1200),
      U('1512290923902-8a9f81dc236c', 900),
      U('1526045478516-99145907023c', 900),
      U('1580618672591-eb180b1a973f', 1200),
      U('1508214751196-bcfd4ca60f91', 1000),
      U('1470259078422-826894b933aa', 1000),
    ],
  },
  ticker: true,
  work: false,
  band: true,
  phone: {
    en: ['+44 7700 000003', '07700 000003'],
    ro: ['+40 700 000 003', '0700 000 003'],
    da: ['+45 00 00 00 03', '00 00 00 03'],
  },
  copy: {
    en: {
      brandName: 'Velvet Room',
      tagline: 'Hair & beauty',
      nav: ['Treatments', '', 'The salon', 'Book'],
      kicker: 'Hair · Skin · Nails',
      title: 'Leave looking like *the best version of you.*',
      lede: 'A small salon with time for you — cuts, colour, skin and nails, booked so you are never sitting in a queue.',
      ctaPrimary: 'Book an appointment',
      ctaSecondary: 'See the salon',
      stats: [
        ['By appointment', 'Never a waiting room'],
        ['12 years', 'Behind the chair'],
        ['Products', 'We use & sell what we trust'],
      ],
      ticker: ['New clients welcome', 'Evening appointments on Thursdays', 'Gift cards available'],
      stBig: 'You should leave the chair feeling lighter.',
      stText:
        'One client at a time, no double-booking. Tell us what you want — or bring a photo — and we will tell you honestly what will work.',
      svcKicker: 'Treatments',
      svcTitle: 'Take an hour for yourself.',
      svcLede: 'Every treatment starts with a chat and ends with coffee. Prices are on the wall — no surprises at the till.',
      services: [
        ['Cut & finish', 'Consultation, wash, cut and styling — leave ready for the week.'],
        ['Colour', 'Full colour, balayage and highlights, matched to your skin tone.'],
        ['Skin treatments', 'Facials and peels chosen for your skin, not from a script.'],
        ['Nails', 'Manicure and pedicure, classic or gel, done without rushing.'],
        ['Brows & lashes', 'Shaping, tinting and lifting — subtle, never drawn on.'],
        ['Occasion styling', 'Weddings and big evenings — trial included, nerves optional.'],
      ],
      extrasLabel: 'Little extras:',
      extras: ['Coffee & tea on the house', 'Card payments', 'Gift cards'],
      workKicker: '',
      workTitle: '',
      workLede: '',
      labelBefore: 'Before',
      labelAfter: 'After',
      workItems: [],
      bandKicker: 'New here?',
      bandTitle: 'First visit, 20% off.',
      bandText: 'Your first cut or treatment with us — a fifth off, so trying somewhere new costs less than staying somewhere wrong.',
      bandTop: 'Book by phone',
      bandBottom: 'Or send a message',
      galKicker: 'The salon',
      galTitle: 'Sit down, breathe out.',
      cKicker: 'Book',
      cTitle: 'The chair is free.',
      cLede: 'Ring or message us with a day that suits — we will find the hour.',
      cCta: 'Book an appointment',
      rows: [
        { label: 'Phone', value: '07700 000003', href: 'tel:+447700000003' },
        { label: 'Email', value: 'book@velvetroom.co.uk', href: 'mailto:book@velvetroom.co.uk' },
        { label: 'Address', value: '3 Rose Street, Edinburgh' },
        { label: 'Hours', value: 'Tue–Sat, 9:00–18:00', sub: 'Thursdays until 20:00' },
      ],
      footLine: 'Edinburgh, UK',
      footNote: 'Demo website — replace every word with your own before sending.',
    },
    ro: {
      brandName: 'Camera de Catifea',
      tagline: 'Păr & frumusețe',
      nav: ['Tratamente', '', 'Salonul', 'Programează-te'],
      kicker: 'Păr · Ten · Unghii',
      title: 'Pleci arătând ca *cea mai bună versiune a ta.*',
      lede: 'Un salon mic, cu timp pentru tine — tuns, vopsit, îngrijirea tenului și unghii, cu programare, ca să nu stai niciodată la coadă.',
      ctaPrimary: 'Programează-te',
      ctaSecondary: 'Vezi salonul',
      stats: [
        ['Cu programare', 'Niciodată sală de așteptare'],
        ['12 ani', 'În spatele scaunului'],
        ['Produse', 'Folosim doar în ce credem'],
      ],
      ticker: ['Clienți noi bineveniți', 'Program prelungit joia', 'Carduri cadou disponibile'],
      stBig: 'De pe scaun trebuie să pleci mai ușoară.',
      stText:
        'O clientă o dată, fără programări duble. Spune-ne ce vrei — sau adu o poză — și îți spunem cinstit ce o să funcționeze.',
      svcKicker: 'Tratamente',
      svcTitle: 'Ia-ți o oră pentru tine.',
      svcLede: 'Fiecare tratament începe cu o discuție și se termină cu o cafea. Prețurile sunt pe perete — fără surprize la plată.',
      services: [
        ['Tuns & coafat', 'Consultație, spălat, tuns și coafat — pleci gata pentru toată săptămâna.'],
        ['Vopsit', 'Vopsit complet, balayage și șuvițe, potrivite cu tonul pielii tale.'],
        ['Îngrijirea tenului', 'Tratamente faciale alese pentru tenul tău, nu după un scenariu.'],
        ['Unghii', 'Manichiură și pedichiură, clasic sau gel, fără grabă.'],
        ['Sprâncene & gene', 'Pensat, vopsit și laminare — subtil, niciodată desenat.'],
        ['Coafuri de ocazie', 'Nunți și seri mari — probă inclusă, emoțiile opționale.'],
      ],
      extrasLabel: 'Micile extra:',
      extras: ['Cafea și ceai din partea casei', 'Plată cu cardul', 'Carduri cadou'],
      workKicker: '',
      workTitle: '',
      workLede: '',
      labelBefore: 'Înainte',
      labelAfter: 'După',
      workItems: [],
      bandKicker: 'Prima vizită?',
      bandTitle: 'Prima programare, 20% reducere.',
      bandText: 'Primul tuns sau tratament la noi — cu o cincime mai puțin, ca să te coste mai puțin să încerci ceva nou decât să rămâi unde nu-ți place.',
      bandTop: 'Programează-te telefonic',
      bandBottom: 'Sau trimite un mesaj',
      galKicker: 'Salonul',
      galTitle: 'Așază-te, respiră.',
      cKicker: 'Programări',
      cTitle: 'Scaunul e liber.',
      cLede: 'Sună sau scrie-ne o zi care îți convine — găsim noi ora.',
      cCta: 'Programează-te',
      rows: [
        { label: 'Telefon', value: '0700 000 003', href: 'tel:+40700000003' },
        { label: 'Email', value: 'programari@cameradecatifea.ro', href: 'mailto:programari@cameradecatifea.ro' },
        { label: 'Adresa', value: 'Str. Trandafirilor 3, Timișoara' },
        { label: 'Program', value: 'Marți–Sâmbătă, 9:00–18:00', sub: 'Joia până la 20:00' },
      ],
      footLine: 'Timișoara, România',
      footNote: 'Site demonstrativ — înlocuiește fiecare cuvânt cu ale tale înainte să-l trimiți.',
    },
    da: {
      brandName: 'Fløjlsrummet',
      tagline: 'Hår & skønhed',
      nav: ['Behandlinger', '', 'Salonen', 'Book'],
      kicker: 'Hår · Hud · Negle',
      title: 'Gå herfra som *den bedste udgave af dig.*',
      lede: 'En lille salon med tid til dig — klip, farve, hud og negle, altid efter aftale, så du aldrig sidder i kø.',
      ctaPrimary: 'Book en tid',
      ctaSecondary: 'Se salonen',
      stats: [
        ['Efter aftale', 'Aldrig et venteværelse'],
        ['12 år', 'Bag stolen'],
        ['Produkter', 'Vi bruger kun det, vi tror på'],
      ],
      ticker: ['Nye kunder velkomne', 'Aftentider om torsdagen', 'Gavekort kan købes'],
      stBig: 'Man skal rejse sig fra stolen og føle sig lettere.',
      stText:
        'Én kunde ad gangen, ingen dobbeltbookinger. Fortæl os, hvad du ønsker — eller tag et billede med — så siger vi ærligt, hvad der vil klæde dig.',
      svcKicker: 'Behandlinger',
      svcTitle: 'Tag en time til dig selv.',
      svcLede: 'Hver behandling starter med en snak og slutter med kaffe. Priserne hænger på væggen — ingen overraskelser ved kassen.',
      services: [
        ['Klip & finish', 'Konsultation, vask, klip og styling — klar til hele ugen.'],
        ['Farve', 'Helfarve, balayage og striber, afstemt efter din hudtone.'],
        ['Hudbehandling', 'Ansigtsbehandlinger valgt til din hud, ikke efter et manuskript.'],
        ['Negle', 'Manicure og pedicure, klassisk eller gel, uden hastværk.'],
        ['Bryn & vipper', 'Formning, farvning og lift — diskret, aldrig tegnet på.'],
        ['Festfrisurer', 'Bryllupper og store aftener — prøve inkluderet, nerver valgfrit.'],
      ],
      extrasLabel: 'De små ekstra:',
      extras: ['Kaffe & te på husets regning', 'Kort & MobilePay', 'Gavekort'],
      workKicker: '',
      workTitle: '',
      workLede: '',
      labelBefore: 'Før',
      labelAfter: 'Efter',
      workItems: [],
      bandKicker: 'Ny her?',
      bandTitle: 'Første besøg, 20% rabat.',
      bandText: 'Dit første klip eller din første behandling hos os — en femtedel billigere, så det koster mindre at prøve noget nyt end at blive et forkert sted.',
      bandTop: 'Book på telefon',
      bandBottom: 'Eller send en besked',
      galKicker: 'Salonen',
      galTitle: 'Sæt dig, ånd ud.',
      cKicker: 'Book',
      cTitle: 'Stolen er ledig.',
      cLede: 'Ring eller skriv en dag, der passer dig — så finder vi timen.',
      cCta: 'Book en tid',
      rows: [
        { label: 'Telefon', value: '00 00 00 03', href: 'tel:+4500000003' },
        { label: 'Email', value: 'book@floejlsrummet.dk', href: 'mailto:book@floejlsrummet.dk' },
        { label: 'Adresse', value: 'Rosengade 3, Roskilde' },
        { label: 'Åbent', value: 'Tir–lør, 9:00–18:00', sub: 'Torsdag til kl. 20' },
      ],
      footLine: 'Roskilde, Danmark',
      footNote: 'Demoside — udskift hvert ord med dine egne, før du sender den.',
    },
  },
};

/* ================================= AUTO ================================= */

const auto: Preset = {
  id: 'auto',
  paletteId: 'midnight',
  label: { en: 'Auto service', ro: 'Service auto', da: 'Autoværksted' },
  icons: ['wrench', 'gauge', 'car', 'bolt', 'shield', 'clock'],
  images: {
    hero: U('1486262715619-67b85e0b08d3'),
    statement: U('1487754180451-c456f719a1fc', 1200),
    work: [],
    gallery: [
      U('1503376780353-7e6692767b70', 1200),
      U('1511919884226-fd3cad34687c', 900),
      U('1517524008697-84bbe3c3fd98', 900),
      U('1502877338535-766e1452684a', 1200),
      U('1530124566582-a618bc2615dc', 1000),
      U('1504222490345-c075b6008014', 1000),
    ],
  },
  ticker: false,
  work: false,
  band: true,
  phone: {
    en: ['+44 7700 000004', '07700 000004'],
    ro: ['+40 700 000 004', '0700 000 004'],
    da: ['+45 00 00 00 04', '00 00 00 04'],
  },
  copy: {
    en: {
      brandName: 'Torque House',
      tagline: 'Service & repairs',
      nav: ['Services', '', 'The workshop', 'Contact'],
      kicker: 'Service · Repairs · Diagnostics',
      title: 'Fixed right, *explained plainly.*',
      lede: 'Servicing, repairs and diagnostics for all makes. We show you the worn part, explain the price, and only then pick up a spanner.',
      ctaPrimary: 'Book your car in',
      ctaSecondary: 'See the workshop',
      stats: [
        ['All makes', 'Petrol, diesel & hybrid'],
        ['Same week', 'Bookings, most repairs'],
        ['12 months', 'Warranty on parts & labour'],
      ],
      ticker: [],
      stBig: 'You should never leave a garage confused.',
      stText:
        'Every job comes with photos of what we found and a price before we start. Approve it from your phone — or tell us to leave it.',
      svcKicker: 'What we do',
      svcTitle: 'From oil change to engine out.',
      svcLede: 'Book by phone, drop the keys in the letterbox, get a message when it is ready.',
      services: [
        ['Servicing', 'Full and interim services with genuine or matching-quality parts.'],
        ['Diagnostics', 'Warning light on? We read it, trace it, and tell you what it actually means.'],
        ['Brakes & suspension', 'Discs, pads, shocks and springs — checked and replaced properly.'],
        ['Electrical faults', 'Batteries, starters, wiring and the gremlins nobody else finds.'],
        ['MOT preparation', 'Pre-test check and the fixes, so it passes first time.'],
        ['Tyres & alignment', 'Fitted, balanced and aligned while you wait.'],
      ],
      extrasLabel: 'While it is with us:',
      extras: ['Courtesy check', 'Photos of any faults', 'No fix without your OK'],
      workKicker: '',
      workTitle: '',
      workLede: '',
      labelBefore: 'Before',
      labelAfter: 'After',
      workItems: [],
      bandKicker: 'Broken down?',
      bandTitle: 'Car won’t start? Ring us first.',
      bandText: 'Nine times out of ten we can tell you over the phone whether it is safe to drive, needs a tow, or needs a battery.',
      bandTop: 'Workshop line',
      bandBottom: 'Mon–Sat',
      galKicker: 'The workshop',
      galTitle: 'Where the work happens.',
      cKicker: 'Contact',
      cTitle: 'Book your car in.',
      cLede: 'Ring, or send the registration and a sentence about the problem — we reply the same day.',
      cCta: 'Call the workshop',
      rows: [
        { label: 'Phone', value: '07700 000004', href: 'tel:+447700000004' },
        { label: 'Email', value: 'bookings@torquehouse.co.uk', href: 'mailto:bookings@torquehouse.co.uk' },
        { label: 'Address', value: 'Unit 7, Mill Road, Leeds' },
        { label: 'Hours', value: 'Mon–Sat, 8:00–17:30' },
      ],
      footLine: 'Leeds, UK',
      footNote: 'Demo website — replace every word with your own before sending.',
    },
    ro: {
      brandName: 'Casa Motorului',
      tagline: 'Service & reparații',
      nav: ['Servicii', '', 'Atelierul', 'Contact'],
      kicker: 'Service · Reparații · Diagnoză',
      title: 'Reparat corect, *explicat pe înțeles.*',
      lede: 'Revizii, reparații și diagnoză pentru toate mărcile. Îți arătăm piesa uzată, îți explicăm prețul, și abia apoi punem mâna pe chei.',
      ctaPrimary: 'Programează mașina',
      ctaSecondary: 'Vezi atelierul',
      stats: [
        ['Toate mărcile', 'Benzină, diesel & hibrid'],
        ['Aceeași săptămână', 'Programări, majoritatea reparațiilor'],
        ['12 luni', 'Garanție la piese și manoperă'],
      ],
      ticker: [],
      stBig: 'Din service nu trebuie să pleci niciodată confuz.',
      stText:
        'Orice lucrare vine cu poze cu ce am găsit și cu preț înainte să începem. Aprobi de pe telefon — sau ne spui să lăsăm așa.',
      svcKicker: 'Ce facem',
      svcTitle: 'De la schimb de ulei la motor scos.',
      svcLede: 'Programezi telefonic, lași cheile în cutie, primești mesaj când e gata.',
      services: [
        ['Revizii', 'Revizii complete și intermediare, cu piese originale sau echivalente.'],
        ['Diagnoză', 'S-a aprins un martor? Îl citim, îl urmărim și îți spunem ce înseamnă de fapt.'],
        ['Frâne & suspensie', 'Discuri, plăcuțe, amortizoare și arcuri — verificate și schimbate corect.'],
        ['Defecte electrice', 'Baterii, electromotoare, cablaje și dracii pe care nu-i găsește nimeni.'],
        ['Pregătire ITP', 'Verificare înainte de inspecție și reparațiile necesare, ca să treci din prima.'],
        ['Anvelope & geometrie', 'Montate, echilibrate și reglate cât aștepți.'],
      ],
      extrasLabel: 'Cât e la noi:',
      extras: ['Verificare de curtoazie', 'Poze cu orice defect', 'Nicio reparație fără OK-ul tău'],
      workKicker: '',
      workTitle: '',
      workLede: '',
      labelBefore: 'Înainte',
      labelAfter: 'După',
      workItems: [],
      bandKicker: 'Ai rămas pe drum?',
      bandTitle: 'Nu pornește? Sună-ne întâi pe noi.',
      bandText: 'De nouă ori din zece îți putem spune la telefon dacă e sigur să conduci, dacă trebuie tractată sau dacă e doar bateria.',
      bandTop: 'Linia atelierului',
      bandBottom: 'Luni–Sâmbătă',
      galKicker: 'Atelierul',
      galTitle: 'Unde se întâmplă treaba.',
      cKicker: 'Contact',
      cTitle: 'Programează mașina.',
      cLede: 'Sună, sau trimite numărul de înmatriculare și o propoziție despre problemă — răspundem în aceeași zi.',
      cCta: 'Sună la atelier',
      rows: [
        { label: 'Telefon', value: '0700 000 004', href: 'tel:+40700000004' },
        { label: 'Email', value: 'programari@casamotorului.ro', href: 'mailto:programari@casamotorului.ro' },
        { label: 'Adresa', value: 'Str. Morii 7, Iași' },
        { label: 'Program', value: 'Luni–Sâmbătă, 8:00–17:30' },
      ],
      footLine: 'Iași, România',
      footNote: 'Site demonstrativ — înlocuiește fiecare cuvânt cu ale tale înainte să-l trimiți.',
    },
    da: {
      brandName: 'Motorhuset',
      tagline: 'Service & reparation',
      nav: ['Ydelser', '', 'Værkstedet', 'Kontakt'],
      kicker: 'Service · Reparation · Fejlsøgning',
      title: 'Lavet rigtigt, *forklaret ligeud.*',
      lede: 'Service, reparation og fejlsøgning af alle mærker. Vi viser dig den slidte del, forklarer prisen — og først derefter tager vi fat.',
      ctaPrimary: 'Book din bil ind',
      ctaSecondary: 'Se værkstedet',
      stats: [
        ['Alle mærker', 'Benzin, diesel & hybrid'],
        ['Samme uge', 'Tider til de fleste reparationer'],
        ['12 måneder', 'Garanti på dele og arbejde'],
      ],
      ticker: [],
      stBig: 'Man skal aldrig forlade et værksted forvirret.',
      stText:
        'Hver opgave kommer med billeder af det, vi fandt, og en pris, før vi går i gang. Godkend fra telefonen — eller sig, vi skal lade det være.',
      svcKicker: 'Det laver vi',
      svcTitle: 'Fra olieskift til motor ud.',
      svcLede: 'Book på telefon, læg nøglerne i brevsprækken, få en besked når den er klar.',
      services: [
        ['Service', 'Stort og lille serviceeftersyn med originale eller tilsvarende dele.'],
        ['Fejlsøgning', 'Advarselslampe? Vi læser den, sporer den og fortæller, hvad den faktisk betyder.'],
        ['Bremser & undervogn', 'Skiver, klodser, støddæmpere og fjedre — tjekket og skiftet ordentligt.'],
        ['El-fejl', 'Batterier, startere, ledningsnet og de nisser, ingen andre finder.'],
        ['Klargøring til syn', 'Gennemgang før syn og de nødvendige udbedringer, så den går igennem første gang.'],
        ['Dæk & sporing', 'Monteret, afbalanceret og sporet, mens du venter.'],
      ],
      extrasLabel: 'Mens den står hos os:',
      extras: ['Gratis gennemgang', 'Billeder af alle fejl', 'Intet laves uden dit OK'],
      workKicker: '',
      workTitle: '',
      workLede: '',
      labelBefore: 'Før',
      labelAfter: 'Efter',
      workItems: [],
      bandKicker: 'Brudt sammen?',
      bandTitle: 'Vil den ikke starte? Ring til os først.',
      bandText: 'Ni ud af ti gange kan vi sige i telefonen, om den er sikker at køre, skal bugseres — eller bare mangler et batteri.',
      bandTop: 'Værkstedets linje',
      bandBottom: 'Man–lør',
      galKicker: 'Værkstedet',
      galTitle: 'Her sker arbejdet.',
      cKicker: 'Kontakt',
      cTitle: 'Book din bil ind.',
      cLede: 'Ring, eller send nummerpladen og én sætning om problemet — vi svarer samme dag.',
      cCta: 'Ring til værkstedet',
      rows: [
        { label: 'Telefon', value: '00 00 00 04', href: 'tel:+4500000004' },
        { label: 'Email', value: 'booking@motorhuset.dk', href: 'mailto:booking@motorhuset.dk' },
        { label: 'Adresse', value: 'Møllevej 7, Slagelse' },
        { label: 'Åbent', value: 'Man–lør, 8:00–17:30' },
      ],
      footLine: 'Slagelse, Danmark',
      footNote: 'Demoside — udskift hvert ord med dine egne, før du sender den.',
    },
  },
};

/* ================================ APP PAGE ================================ */
/* The one-pager Apple/Google require for a store listing: what the app does,
   plus the privacy policy and terms — promised publicly on LinkedIn, 16 Aug 2026.
   Every image verified visually (subject, not just HTTP 200) on 2026-08-16. */

const APP_LEGAL_EN: [string, string][] = [
  [
    'Privacy Policy',
    `Last updated: replace this line with your own date.

Daylist does not collect, sell or share personal data. There is no account, no sign-up and no server: everything you write stays in the app's storage on your own device.

Data you create. Your plans, notes and settings are stored locally on your phone. They are never transmitted to us or to anyone else. Deleting the app deletes them.

Analytics and tracking. The app contains no analytics, no advertising SDKs and no third-party trackers of any kind.

Permissions. Notifications are requested only if you turn reminders on, and are used for nothing else. The app asks for no other permissions.

Backups. If you use the export feature, the file is written where you choose and handled by you. If your operating system backs the app up (for example a device backup), that backup is governed by your OS vendor's policy, not ours.

Children. The app collects no data from anyone, including children.

Changes. If this policy ever changes, the new version will be published on this page with a new date at the top.

Contact. Questions about privacy: support@daylist.app.`,
  ],
  [
    'Terms of Use',
    `By downloading or using Daylist you agree to these terms.

Licence. You get a personal, non-transferable licence to use the app on devices you own. The app and its design remain the property of the developer.

Your content. Whatever you write in the app is yours. Because it is stored only on your device, you are responsible for keeping backups — use the export feature.

No warranty. The app is provided "as is", without warranty of any kind. To the maximum extent permitted by law, the developer is not liable for lost data or any damages arising from the use of the app.

Fair use. Do not reverse-engineer, resell or redistribute the app.

Changes. These terms may be updated from time to time; continued use after an update means you accept the new version.

Governing law. Replace this line with your own jurisdiction.

Contact: support@daylist.app.`,
  ],
];

const APP_LEGAL_RO: [string, string][] = [
  [
    'Politica de confidențialitate',
    `Ultima actualizare: înlocuiește rândul acesta cu data ta.

Daylist nu colectează, nu vinde și nu partajează date personale. Nu există cont, înregistrare sau server: tot ce scrii rămâne în memoria aplicației, pe telefonul tău.

Datele tale. Planurile, notițele și setările sunt stocate local, pe dispozitiv. Nu ne sunt transmise nici nouă, nici altcuiva. Ștergerea aplicației le șterge și pe ele.

Analiză și urmărire. Aplicația nu conține analytics, SDK-uri de publicitate sau alte instrumente de urmărire.

Permisiuni. Notificările sunt cerute doar dacă activezi memento-urile și nu sunt folosite pentru nimic altceva. Aplicația nu cere alte permisiuni.

Copii de siguranță. Dacă folosești exportul, fișierul e salvat unde alegi tu și e responsabilitatea ta. Dacă sistemul de operare face backup aplicației, acel backup ține de politica producătorului sistemului, nu de a noastră.

Copii. Aplicația nu colectează date de la nimeni, inclusiv de la copii.

Modificări. Dacă politica se schimbă vreodată, versiunea nouă apare pe această pagină, cu dată nouă.

Contact. Întrebări despre confidențialitate: support@daylist.app.`,
  ],
  [
    'Termeni de utilizare',
    `Prin descărcarea sau folosirea Daylist ești de acord cu acești termeni.

Licență. Primești o licență personală, netransferabilă, pentru dispozitivele tale. Aplicația și designul ei rămân proprietatea dezvoltatorului.

Conținutul tău. Ce scrii în aplicație îți aparține. Fiindcă e stocat doar pe dispozitivul tău, copiile de siguranță sunt responsabilitatea ta — folosește exportul.

Fără garanții. Aplicația e oferită „ca atare", fără nicio garanție. În limita maximă permisă de lege, dezvoltatorul nu răspunde pentru date pierdute sau alte daune rezultate din folosirea aplicației.

Utilizare corectă. Nu decompila, revinde sau redistribui aplicația.

Modificări. Termenii pot fi actualizați; folosirea în continuare după o actualizare înseamnă acceptarea versiunii noi.

Legea aplicabilă. Înlocuiește rândul acesta cu jurisdicția ta.

Contact: support@daylist.app.`,
  ],
];

const APP_LEGAL_DA: [string, string][] = [
  [
    'Privatlivspolitik',
    `Senest opdateret: erstat denne linje med din egen dato.

Daylist indsamler, sælger eller deler ikke persondata. Der er ingen konto, ingen tilmelding og ingen server: alt hvad du skriver, bliver i appens lager på din egen enhed.

Dine data. Planer, noter og indstillinger gemmes lokalt på telefonen. De sendes aldrig til os eller andre. Sletter du appen, slettes de også.

Analyse og sporing. Appen indeholder ingen analytics, ingen reklame-SDK'er og ingen tredjepartssporing.

Tilladelser. Notifikationer bruges kun, hvis du slår påmindelser til, og til intet andet. Appen beder ikke om andre tilladelser.

Backup. Bruger du eksport, gemmes filen hvor du vælger, og håndteres af dig. Hvis styresystemet tager backup af appen, gælder leverandørens politik, ikke vores.

Børn. Appen indsamler ingen data fra nogen, heller ikke børn.

Ændringer. Ændres politikken, offentliggøres den nye version på denne side med ny dato.

Kontakt. Spørgsmål om privatliv: support@daylist.app.`,
  ],
  [
    'Vilkår for brug',
    `Ved at hente eller bruge Daylist accepterer du disse vilkår.

Licens. Du får en personlig licens, der ikke kan overdrages, til enheder du ejer. Appen og dens design tilhører udvikleren.

Dit indhold. Det du skriver i appen, er dit. Da det kun gemmes på din enhed, er backup dit ansvar — brug eksportfunktionen.

Ingen garanti. Appen leveres "som den er", uden nogen form for garanti. I det omfang loven tillader det, hæfter udvikleren ikke for tabte data eller andre skader ved brug af appen.

Rimelig brug. Appen må ikke dekompileres, videresælges eller videredistribueres.

Ændringer. Vilkårene kan opdateres; fortsat brug efter en opdatering betyder, at du accepterer den nye version.

Lovvalg. Erstat denne linje med din egen jurisdiktion.

Kontakt: support@daylist.app.`,
  ],
];

const app: Preset = {
  id: 'app',
  paletteId: 'midnight',
  label: { en: 'Mobile app page', ro: 'Pagină de aplicație', da: 'App-side' },
  icons: ['bolt', 'clock', 'shield', 'star', 'sparkle', 'pin'],
  images: {
    hero: U('1551650975-87deedd944c3'),
    statement: U('1498050108023-c5249f4df085', 1200),
    work: [],
    gallery: [
      U('1510557880182-3d4d3cba35a5', 1000),
      U('1512941937669-90a1b58e7e9c', 1200),
      U('1484480974693-6ca0a78fb36b', 1200),
      U('1555421689-491a97ff2040', 1000),
    ],
  },
  ticker: true,
  work: false,
  band: false,
  ctaHref: 'https://apps.apple.com/',
  phone: { en: ['', ''], ro: ['', ''], da: ['', ''] },
  copy: {
    en: {
      brandName: 'Daylist',
      tagline: 'The calm daily planner',
      nav: ['Features', '', 'Screenshots', 'Contact'],
      navLegal: 'Privacy & terms',
      kicker: 'iOS & Android',
      title: 'Your whole day, *on one quiet page.*',
      lede: 'Daylist is a daily planner that opens in a second, works offline and never asks you to create an account. Write the day down, tick it off, close the app.',
      ctaPrimary: 'Download the app',
      ctaSecondary: 'See the screens',
      stats: [
        ['4.9', 'Average store rating'],
        ['Free', 'No ads, no subscription'],
        ['Offline', 'Your data stays on your phone'],
      ],
      ticker: ['Free on iOS & Android', 'No account needed', 'Works offline', 'No ads, ever'],
      stBig: 'Built by one person, not a data company.',
      stText:
        'Daylist has no growth team and no advertisers to feed. It keeps your plans on your phone, sends nothing anywhere, and gets out of your way the moment the day is planned.',
      svcKicker: 'What it does',
      svcTitle: 'Everything a paper planner does, *minus the paper.*',
      svcLede: 'Six things, done properly. No feature creep, no “workspace”, no assistant reading your groceries.',
      services: [
        ['Opens in a second', 'Cold start to writing in under a second — a planner only works when it is faster than forgetting.'],
        ['Gentle reminders', 'One nudge, at the time you chose. No streaks, no guilt screens, no “we miss you”.'],
        ['Private by design', 'Everything lives on your device. No account, no cloud, no analytics watching you type.'],
        ['Today rolls over', 'Unfinished items move to tomorrow by themselves, so mornings never start with yesterday’s noise.'],
        ['Widgets & dark mode', 'Your day on the home screen, in a theme that follows the system.'],
        ['Backups you control', 'Export everything to a single file whenever you like — and import it on a new phone.'],
      ],
      extrasLabel: 'Also in the box:',
      extras: ['Search', 'Home-screen widgets', 'Markdown notes', 'File export'],
      workKicker: '',
      workTitle: '',
      workLede: '',
      labelBefore: 'Before',
      labelAfter: 'After',
      workItems: [],
      bandKicker: '',
      bandTitle: '',
      bandText: '',
      bandTop: '',
      bandBottom: '',
      galKicker: 'Screenshots',
      galTitle: 'The app, as it looks',
      legalKicker: 'The fine print',
      legalTitle: 'Privacy policy *& terms.*',
      legalSections: APP_LEGAL_EN,
      cKicker: 'Get it',
      cTitle: 'Free, on both stores.',
      cLede: 'Questions, bug reports or feature ideas — one developer reads every email.',
      cCta: '',
      rows: [
        { label: 'App Store', value: 'Daylist for iPhone', href: 'https://apps.apple.com/' },
        { label: 'Google Play', value: 'Daylist for Android', href: 'https://play.google.com/store' },
        { label: 'Support', value: 'support@daylist.app', href: 'mailto:support@daylist.app' },
        { label: 'Press kit', value: 'daylist.app/press' },
      ],
      footLine: 'Made in a kitchen, shipped worldwide.',
      footNote: 'Demo website — replace every word (and both store links) with your own before sending.',
    },
    ro: {
      brandName: 'Daylist',
      tagline: 'Plannerul zilnic liniștit',
      nav: ['Funcții', '', 'Capturi de ecran', 'Contact'],
      navLegal: 'Confidențialitate',
      kicker: 'iOS & Android',
      title: 'Toată ziua ta, *pe o singură pagină liniștită.*',
      lede: 'Daylist e un planner zilnic care se deschide într-o secundă, merge offline și nu-ți cere niciodată cont. Îți scrii ziua, bifezi, închizi aplicația.',
      ctaPrimary: 'Descarcă aplicația',
      ctaSecondary: 'Vezi ecranele',
      stats: [
        ['4,9', 'Rating mediu în store'],
        ['Gratuit', 'Fără reclame, fără abonament'],
        ['Offline', 'Datele rămân pe telefonul tău'],
      ],
      ticker: ['Gratuit pe iOS & Android', 'Fără cont', 'Merge offline', 'Fără reclame, niciodată'],
      stBig: 'Făcută de un singur om, nu de o companie de date.',
      stText:
        'Daylist nu are echipă de growth și nici advertiseri de hrănit. Îți ține planurile pe telefon, nu trimite nimic nicăieri și îți iese din cale imediat ce ziua e pusă pe hârtie.',
      svcKicker: 'Ce face',
      svcTitle: 'Tot ce face o agendă de hârtie, *minus hârtia.*',
      svcLede: 'Șase lucruri, făcute ca lumea. Fără funcții de umplutură, fără „workspace", fără asistent care îți citește cumpărăturile.',
      services: [
        ['Se deschide într-o secundă', 'De la pornire la scris în sub o secundă — un planner funcționează doar dacă e mai rapid decât uitatul.'],
        ['Memento-uri blânde', 'Un singur semnal, la ora aleasă de tine. Fără serii, fără ecrane de vinovăție, fără „ne e dor de tine".'],
        ['Privat prin construcție', 'Totul stă pe dispozitivul tău. Fără cont, fără cloud, fără analytics care te urmărește cum tastezi.'],
        ['Ziua se mută singură', 'Ce n-ai bifat trece singur pe mâine, ca dimineața să nu înceapă cu zgomotul de ieri.'],
        ['Widgeturi & dark mode', 'Ziua ta pe ecranul principal, într-o temă care urmează sistemul.'],
        ['Copii de siguranță la tine', 'Exporți totul într-un singur fișier oricând vrei — și îl imporți pe telefonul nou.'],
      ],
      extrasLabel: 'Tot în pachet:',
      extras: ['Căutare', 'Widgeturi', 'Notițe Markdown', 'Export fișier'],
      workKicker: '',
      workTitle: '',
      workLede: '',
      labelBefore: 'Înainte',
      labelAfter: 'După',
      workItems: [],
      bandKicker: '',
      bandTitle: '',
      bandText: '',
      bandTop: '',
      bandBottom: '',
      galKicker: 'Capturi de ecran',
      galTitle: 'Aplicația, așa cum arată',
      legalKicker: 'Litera mică',
      legalTitle: 'Confidențialitate *și termeni.*',
      legalSections: APP_LEGAL_RO,
      cKicker: 'Ia-o',
      cTitle: 'Gratuit, în ambele store-uri.',
      cLede: 'Întrebări, bug-uri sau idei — un singur dezvoltator citește fiecare email.',
      cCta: '',
      rows: [
        { label: 'App Store', value: 'Daylist pentru iPhone', href: 'https://apps.apple.com/' },
        { label: 'Google Play', value: 'Daylist pentru Android', href: 'https://play.google.com/store' },
        { label: 'Suport', value: 'support@daylist.app', href: 'mailto:support@daylist.app' },
        { label: 'Press kit', value: 'daylist.app/press' },
      ],
      footLine: 'Făcută într-o bucătărie, livrată în toată lumea.',
      footNote: 'Site demo — înlocuiește fiecare cuvânt (și ambele linkuri de store) cu ale tale înainte să-l trimiți.',
    },
    da: {
      brandName: 'Daylist',
      tagline: 'Den rolige dagsplanlægger',
      nav: ['Funktioner', '', 'Skærmbilleder', 'Kontakt'],
      navLegal: 'Privatliv & vilkår',
      kicker: 'iOS & Android',
      title: 'Hele din dag, *på én rolig side.*',
      lede: 'Daylist er en dagsplanlægger, der åbner på et sekund, virker offline og aldrig beder dig oprette en konto. Skriv dagen ned, sæt flueben, luk appen.',
      ctaPrimary: 'Hent appen',
      ctaSecondary: 'Se skærmene',
      stats: [
        ['4,9', 'Gennemsnitlig store-vurdering'],
        ['Gratis', 'Ingen reklamer, intet abonnement'],
        ['Offline', 'Dine data bliver på telefonen'],
      ],
      ticker: ['Gratis på iOS & Android', 'Ingen konto', 'Virker offline', 'Aldrig reklamer'],
      stBig: 'Bygget af én person, ikke et datafirma.',
      stText:
        'Daylist har intet growth-team og ingen annoncører at fodre. Den holder dine planer på telefonen, sender intet nogen steder hen og går af vejen, så snart dagen er planlagt.',
      svcKicker: 'Hvad den gør',
      svcTitle: 'Alt hvad en papirkalender kan, *minus papiret.*',
      svcLede: 'Seks ting, gjort ordentligt. Ingen overflødige funktioner, intet "workspace", ingen assistent der læser dine indkøb.',
      services: [
        ['Åbner på et sekund', 'Fra koldstart til skrivning på under et sekund — en planlægger virker kun, når den er hurtigere end glemslen.'],
        ['Blide påmindelser', 'Ét prik, på det tidspunkt du valgte. Ingen streaks, ingen skyldskærme, intet "vi savner dig".'],
        ['Privat fra bunden', 'Alt ligger på din enhed. Ingen konto, ingen sky, ingen analytics der kigger med.'],
        ['Dagen ruller videre', 'Ufærdige punkter flytter selv til i morgen, så morgenen aldrig starter med gårsdagens støj.'],
        ['Widgets & mørk tilstand', 'Din dag på hjemmeskærmen, i et tema der følger systemet.'],
        ['Backup du selv styrer', 'Eksportér alt til én fil, når du vil — og importér den på en ny telefon.'],
      ],
      extrasLabel: 'Også med:',
      extras: ['Søgning', 'Widgets', 'Markdown-noter', 'Fil-eksport'],
      workKicker: '',
      workTitle: '',
      workLede: '',
      labelBefore: 'Før',
      labelAfter: 'Efter',
      workItems: [],
      bandKicker: '',
      bandTitle: '',
      bandText: '',
      bandTop: '',
      bandBottom: '',
      galKicker: 'Skærmbilleder',
      galTitle: 'Appen, som den ser ud',
      legalKicker: 'Det med småt',
      legalTitle: 'Privatlivspolitik *& vilkår.*',
      legalSections: APP_LEGAL_DA,
      cKicker: 'Hent den',
      cTitle: 'Gratis, i begge butikker.',
      cLede: 'Spørgsmål, fejl eller idéer — én udvikler læser hver eneste mail.',
      cCta: '',
      rows: [
        { label: 'App Store', value: 'Daylist til iPhone', href: 'https://apps.apple.com/' },
        { label: 'Google Play', value: 'Daylist til Android', href: 'https://play.google.com/store' },
        { label: 'Support', value: 'support@daylist.app', href: 'mailto:support@daylist.app' },
        { label: 'Pressekit', value: 'daylist.app/press' },
      ],
      footLine: 'Bygget i et køkken, sendt ud i verden.',
      footNote: 'Demoside — udskift hvert ord (og begge store-links) med dine egne, før du sender den.',
    },
  },
};

/* ============================== ANY BUSINESS ============================== */
/* The catch-all card (user feedback 16 Aug 2026): financial firms, agencies,
   consultants — anyone outside the five trades — need a neutral skeleton.
   Every image verified visually on 2026-08-16. */

const business: Preset = {
  id: 'business',
  paletteId: 'slate',
  label: { en: 'Any business', ro: 'Orice firmă', da: 'Enhver virksomhed' },
  icons: ['sparkle', 'clock', 'shield', 'star', 'bolt', 'pin'],
  images: {
    hero: U('1497366216548-37526070297c'),
    statement: U('1454165804606-c3d57bc86b40', 1200),
    work: [],
    gallery: [
      U('1556761175-b413da4baf72', 1200),
      U('1553877522-43269d4ea984', 1000),
      U('1497215728101-856f4ea42174', 1000),
      U('1664575602554-2087b04935a5', 900),
    ],
  },
  ticker: true,
  work: false,
  band: true,
  phone: {
    en: ['+353 85 000 0000', '085 000 0000'],
    ro: ['+40 700 000 000', '0700 000 000'],
    da: ['+45 00 00 00 00', '00 00 00 00'],
  },
  copy: {
    en: {
      brandName: 'Northlight & Co',
      tagline: 'Professional services',
      nav: ['Services', '', 'Gallery', 'Contact'],
      kicker: 'Professional services',
      title: 'Work done properly, *from the first call.*',
      lede: 'Whatever brings you here — a project, a problem, a plan — we start by listening, and you get a clear offer in writing before anything begins.',
      ctaPrimary: 'Call us',
      ctaSecondary: 'See what we do',
      stats: [
        ['10+', 'Years in the field'],
        ['1:1', 'A named person on your case'],
        ['Free', 'First conversation'],
      ],
      ticker: ['Free first conversation', 'Clear offers, in writing', 'Answer within one working day'],
      stBig: 'Good work starts with listening.',
      stText:
        'Before we recommend anything, we take the time to understand what you actually need. The plan comes after — in writing, with a price and a deadline.',
      svcKicker: 'What we do',
      svcTitle: 'Six ways we help, *done properly.*',
      svcLede: 'Every engagement starts with a conversation and ends with something you can hold us to.',
      services: [
        ['Consultations', 'A one-to-one session about your situation — you leave with clear next steps, whether you hire us or not.'],
        ['Planning', 'A written plan with priorities, costs and deadlines, in plain language.'],
        ['Implementation', 'We do the work we promised, keep you posted, and flag surprises early.'],
        ['Ongoing support', 'A named person who answers, regular check-ins, no ticket queues.'],
        ['Reviews & second opinions', 'An honest look at work you already have — specific and actionable.'],
        ['Training & handover', 'We pass the knowledge on, so you are never locked in.'],
      ],
      extrasLabel: 'Also on request:',
      extras: ['Remote sessions', 'On-site visits', 'Evening appointments', 'Fixed-price packages'],
      workKicker: '',
      workTitle: '',
      workLede: '',
      labelBefore: 'Before',
      labelAfter: 'After',
      workItems: [],
      bandKicker: 'In a hurry?',
      bandTitle: 'Need an answer today?',
      bandText:
        'Call — nine times out of ten we can tell you on the phone whether we can help, what it costs, and when we can start.',
      bandTop: 'Call directly',
      bandBottom: 'Mon–Fri',
      galKicker: 'Behind the scenes',
      galTitle: 'Where the work happens',
      cKicker: 'Contact',
      cTitle: 'Tell us what you need.',
      cLede: 'Call or write — two sentences about your situation are enough. You get a clear answer within one working day.',
      cCta: 'Call now',
      rows: [
        { label: 'Phone', value: '085 000 0000', href: 'tel:+353850000000' },
        { label: 'Email', value: 'office@northlight.example', href: 'mailto:office@northlight.example' },
        { label: 'Office', value: 'Main Street 1, Your town' },
        { label: 'Hours', value: 'Mon–Fri, 9:00–17:00' },
      ],
      footLine: 'Serving clients nationwide.',
      footNote: 'Demo website — replace every word with your own before sending.',
    },
    ro: {
      brandName: 'Biroul Nord',
      tagline: 'Servicii profesionale',
      nav: ['Servicii', '', 'Galerie', 'Contact'],
      kicker: 'Servicii profesionale',
      title: 'Treabă făcută ca lumea, *de la primul telefon.*',
      lede: 'Orice te aduce aici — un proiect, o problemă, un plan — începem prin a asculta, iar oferta o primești în scris, înainte să înceapă orice.',
      ctaPrimary: 'Sună-ne',
      ctaSecondary: 'Vezi ce facem',
      stats: [
        ['10+', 'Ani de meserie'],
        ['1:1', 'Un om cu nume pe cazul tău'],
        ['Gratuit', 'Prima discuție'],
      ],
      ticker: ['Prima discuție gratuită', 'Oferte clare, în scris', 'Răspuns într-o zi lucrătoare'],
      stBig: 'Treaba bună începe cu ascultatul.',
      stText:
        'Înainte să-ți recomandăm ceva, ne luăm timp să înțelegem ce-ți trebuie de fapt. Planul vine după — în scris, cu preț și termen.',
      svcKicker: 'Ce facem',
      svcTitle: 'Șase feluri în care ajutăm, *făcute ca lumea.*',
      svcLede: 'Orice colaborare începe cu o discuție și se termină cu ceva pentru care ne poți cere socoteală.',
      services: [
        ['Consultații', 'O discuție unu-la-unu despre situația ta — pleci cu pași clari, fie că lucrezi cu noi, fie că nu.'],
        ['Planificare', 'Un plan în scris, cu priorități, costuri și termene, pe limba ta.'],
        ['Execuție', 'Facem ce am promis, te ținem la curent și semnalăm surprizele din timp.'],
        ['Suport continuu', 'Un om cu nume care răspunde, verificări regulate, fără cozi de tichete.'],
        ['Verificări & a doua opinie', 'O privire onestă peste ce ai deja — concretă și aplicabilă.'],
        ['Instruire & predare', 'Îți predăm cunoștințele, ca să nu depinzi de nimeni.'],
      ],
      extrasLabel: 'Tot la cerere:',
      extras: ['Ședințe la distanță', 'Vizite la sediu', 'Programări seara', 'Pachete cu preț fix'],
      workKicker: '',
      workTitle: '',
      workLede: '',
      labelBefore: 'Înainte',
      labelAfter: 'După',
      workItems: [],
      bandKicker: 'Te grăbești?',
      bandTitle: 'Îți trebuie un răspuns azi?',
      bandText:
        'Sună — de nouă ori din zece îți putem spune la telefon dacă te putem ajuta, cât costă și când putem începe.',
      bandTop: 'Sună direct',
      bandBottom: 'Lun–Vin',
      galKicker: 'În culise',
      galTitle: 'Unde se întâmplă treaba',
      cKicker: 'Contact',
      cTitle: 'Spune-ne ce-ți trebuie.',
      cLede: 'Sună sau scrie — două propoziții despre situația ta sunt de ajuns. Primești un răspuns clar într-o zi lucrătoare.',
      cCta: 'Sună acum',
      rows: [
        { label: 'Telefon', value: '0700 000 000', href: 'tel:+40700000000' },
        { label: 'Email', value: 'contact@biroulnord.example', href: 'mailto:contact@biroulnord.example' },
        { label: 'Birou', value: 'Str. Principală 1, Orașul tău' },
        { label: 'Program', value: 'Lun–Vin, 9:00–17:00' },
      ],
      footLine: 'Lucrăm cu clienți din toată țara.',
      footNote: 'Site demo — înlocuiește fiecare cuvânt cu ale tale înainte să-l trimiți.',
    },
    da: {
      brandName: 'Nordlys & Co',
      tagline: 'Professionel service',
      nav: ['Ydelser', '', 'Galleri', 'Kontakt'],
      kicker: 'Professionel service',
      title: 'Arbejde gjort ordentligt, *fra første opkald.*',
      lede: 'Uanset hvad der bringer dig hertil — et projekt, et problem, en plan — starter vi med at lytte, og du får et klart tilbud på skrift, før noget går i gang.',
      ctaPrimary: 'Ring til os',
      ctaSecondary: 'Se hvad vi laver',
      stats: [
        ['10+', 'År i faget'],
        ['1:1', 'En navngiven person på din sag'],
        ['Gratis', 'Første samtale'],
      ],
      ticker: ['Gratis første samtale', 'Klare tilbud på skrift', 'Svar inden for én arbejdsdag'],
      stBig: 'Godt arbejde begynder med at lytte.',
      stText:
        'Før vi anbefaler noget, tager vi os tid til at forstå, hvad du faktisk har brug for. Planen kommer bagefter — på skrift, med pris og deadline.',
      svcKicker: 'Hvad vi laver',
      svcTitle: 'Seks måder vi hjælper på, *gjort ordentligt.*',
      svcLede: 'Ethvert samarbejde starter med en samtale og ender med noget, du kan holde os op på.',
      services: [
        ['Rådgivning', 'En personlig samtale om din situation — du går derfra med klare næste skridt, uanset om du vælger os.'],
        ['Planlægning', 'En skriftlig plan med prioriteter, priser og deadlines, i et sprog man kan forstå.'],
        ['Udførelse', 'Vi gør det, vi lovede, holder dig opdateret og siger til i god tid, hvis noget overrasker.'],
        ['Løbende support', 'En navngiven person der svarer, faste opfølgninger, ingen ticketkøer.'],
        ['Gennemgang & second opinion', 'Et ærligt blik på det, du allerede har — konkret og brugbart.'],
        ['Oplæring & overdragelse', 'Vi giver viden videre, så du aldrig er låst fast.'],
      ],
      extrasLabel: 'Også efter aftale:',
      extras: ['Møder online', 'Besøg på adressen', 'Aftaler om aftenen', 'Fast pris-pakker'],
      workKicker: '',
      workTitle: '',
      workLede: '',
      labelBefore: 'Før',
      labelAfter: 'Efter',
      workItems: [],
      bandKicker: 'Har det hastværk?',
      bandTitle: 'Brug for et svar i dag?',
      bandText:
        'Ring — ni ud af ti gange kan vi sige i telefonen, om vi kan hjælpe, hvad det koster, og hvornår vi kan starte.',
      bandTop: 'Ring direkte',
      bandBottom: 'Man–fre',
      galKicker: 'Bag kulisserne',
      galTitle: 'Her sker arbejdet',
      cKicker: 'Kontakt',
      cTitle: 'Fortæl os hvad du har brug for.',
      cLede: 'Ring eller skriv — to sætninger om din situation er nok. Du får et klart svar inden for én arbejdsdag.',
      cCta: 'Ring nu',
      rows: [
        { label: 'Telefon', value: '00 00 00 00', href: 'tel:+4500000000' },
        { label: 'Email', value: 'kontakt@nordlys.example', href: 'mailto:kontakt@nordlys.example' },
        { label: 'Kontor', value: 'Hovedgaden 1, Din by' },
        { label: 'Åbent', value: 'Man–fre, 9:00–17:00' },
      ],
      footLine: 'Vi arbejder med kunder i hele landet.',
      footNote: 'Demoside — udskift hvert ord med dine egne, før du sender den.',
    },
  },
};

export const PRESETS: Preset[] = [business, garden, painter, restaurant, salon, auto, app];

export function buildPreset(presetId: string, lang: Lang): SiteConfig {
  const p = PRESETS.find((x) => x.id === presetId) ?? PRESETS[0];
  return assemble(p, lang);
}

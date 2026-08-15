import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { SiteConfig } from '../site/types';
import { encodeSite, decodeSite } from '../site/codec';
import { normalizeConfig } from '../site/normalize';
import { renderSiteHTML } from '../site/render';
import { PALETTES } from '../site/palettes';
import { buildPreset, PRESETS, type Lang } from '../site/presets';
import { Acc, Area, IconPicker, ImageField, Text, Toggle } from './fields';
import { Share } from './Share';

const DRAFT_KEY = 'urlite-draft';

function initialConfig(): SiteConfig | null {
  const fromHash = decodeSite(location.hash);
  if (fromHash !== null) return normalizeConfig(fromHash);
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw) return normalizeConfig(JSON.parse(raw));
  } catch {
    /* corrupted draft — start fresh */
  }
  return null;
}

function Logo({ onClick }: { onClick: () => void }) {
  return (
    <button className="logo" onClick={onClick} aria-label="Urlite home">
      <span className="logo-mark serif">U</span>
      <span className="serif">Urlite</span>
    </button>
  );
}

function ListItem(props: {
  n: number;
  title: string;
  onUp?: () => void;
  onDown?: () => void;
  onDelete: () => void;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="li">
      <div className="li-head">
        <span className="n">{String(props.n).padStart(2, '0')}</span>
        <button className="grow" onClick={() => setOpen(!open)}>
          {props.title || '…'}
        </button>
        <span className="li-tools">
          {props.onUp && (
            <button onClick={props.onUp} title="Move up" aria-label="Move up">↑</button>
          )}
          {props.onDown && (
            <button onClick={props.onDown} title="Move down" aria-label="Move down">↓</button>
          )}
          <button onClick={props.onDelete} title="Remove" aria-label="Remove">✕</button>
          <button onClick={() => setOpen(!open)} aria-label="Edit">
            {open ? '−' : '✎'}
          </button>
        </span>
      </div>
      {open && <div className="li-body">{props.children}</div>}
    </div>
  );
}

function StartScreen({ onPick }: { onPick: (cfg: SiteConfig) => void }) {
  const [lang, setLang] = useState<Lang>('en');
  const langs: [Lang, string][] = [
    ['en', 'English'],
    ['ro', 'Română'],
    ['da', 'Dansk'],
  ];
  return (
    <div className="start">
      <div className="start-main">
        <p className="kick">New site · pick a starting point</p>
        <h1>Every site here starts finished.</h1>
        <p className="lede">
          Pick a template — it loads as a complete, polished website in your language. Then
          replace the words and photos with your own. Everything is editable.
        </p>
        <div className="start-langs">
          <span>Site language</span>
          <div className="seg">
            {langs.map(([id, name]) => (
              <button key={id} className={lang === id ? 'on' : ''} onClick={() => setLang(id)}>
                {name}
              </button>
            ))}
          </div>
        </div>
        <div className="start-grid">
          {PRESETS.map((p) => (
            <button key={p.id} className="demo-card" onClick={() => onPick(buildPreset(p.id, lang))}>
              <img src={p.images.hero} alt="" loading="lazy" />
              <span className="dc">
                <b className="serif">{p.label[lang]}</b>
                <span>template</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function Editor({ nav }: { nav: (p: string) => void }) {
  const [config, setConfig] = useState<SiteConfig | null>(initialConfig);
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [shareOpen, setShareOpen] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const scrollRef = useRef(0);
  const [previewHtml, setPreviewHtml] = useState('');

  const encoded = useMemo(() => (config ? encodeSite(config) : ''), [config]);
  const viewUrl = encoded ? `${location.origin}/s/#${encoded}` : '';

  /* debounce: config -> preview + draft + editable link in the address bar */
  useEffect(() => {
    if (!config) return;
    const t = setTimeout(() => {
      const w = iframeRef.current?.contentWindow;
      if (w) {
        try {
          scrollRef.current = w.scrollY;
        } catch {
          /* cross-origin never happens with srcdoc, but be safe */
        }
      }
      /* still: the preview renders already settled — a keystroke must never
         replay the entrance choreography (strobing; see still-preview.test.ts) */
      setPreviewHtml(renderSiteHTML(config, { appUrl: location.origin + '/app', still: true }));
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(config));
      } catch {
        /* storage full/blocked — the URL still carries the draft */
      }
      history.replaceState({}, '', '/app#' + encoded);
    }, 250);
    return () => clearTimeout(t);
  }, [config, encoded]);

  if (!config) {
    return (
      <div className="ed">
        <div className="ed-top">
          <Logo onClick={() => nav('/')} />
        </div>
        <StartScreen
          onPick={(cfg) => {
            setConfig(cfg);
          }}
        />
      </div>
    );
  }

  /** immutable-ish update: deep-clone, mutate, set */
  const up = (fn: (draft: SiteConfig) => void) => {
    const draft: SiteConfig = JSON.parse(JSON.stringify(config));
    fn(draft);
    setConfig(draft);
  };

  const startOver = () => {
    if (!confirm('Start a new site? Your current draft stays in this tab’s link until you leave.')) return;
    localStorage.removeItem(DRAFT_KEY);
    history.replaceState({}, '', '/app');
    setPreviewHtml('');
    setConfig(null);
  };

  const kb = (encoded.length / 1024).toFixed(1);

  return (
    <div className="ed">
      <div className="ed-top">
        <Logo onClick={() => nav('/')} />
        <span className="ed-sep" />
        <button className="btn btn-o btn-sm" onClick={startOver}>New site</button>
        <span className="spacer" />
        <div className="seg" role="group" aria-label="Preview device">
          <button className={device === 'desktop' ? 'on' : ''} onClick={() => setDevice('desktop')}>
            Desktop
          </button>
          <button className={device === 'mobile' ? 'on' : ''} onClick={() => setDevice('mobile')}>
            Mobile
          </button>
        </div>
        <span className="kb-badge" title="The size of the link your whole website travels in">
          {kb} KB
        </span>
        <a className="btn btn-o btn-sm" href={viewUrl} target="_blank" rel="noreferrer">
          Open
        </a>
        <button className="btn btn-y btn-sm" onClick={() => setShareOpen(true)}>
          Share
        </button>
      </div>

      <div className="ed-body">
        <div className="panel">
          <Acc title="Theme" defaultOpen>
            <div className="swatches">
              {PALETTES.map((p) => (
                <button
                  key={p.id}
                  className={'sw' + (config.theme.brand === p.brand ? ' on' : '')}
                  onClick={() =>
                    up((d) => {
                      d.theme = {
                        brand: p.brand,
                        ink: p.ink,
                        accent: p.accent,
                        paper: p.paper,
                        paper2: p.paper2,
                        onAccent: p.onAccent,
                      };
                    })
                  }
                >
                  <span className="sw-c">
                    <i style={{ background: p.ink }} />
                    <i style={{ background: p.brand }} />
                    <i style={{ background: p.accent }} />
                    <i style={{ background: p.paper2 }} />
                  </span>
                  <span>{p.name}</span>
                </button>
              ))}
            </div>
          </Acc>

          <Acc title="Brand">
            <Text label="Business name" value={config.brandName} onChange={(v) => up((d) => (d.brandName = v))} />
            <Text label="Tagline" value={config.tagline} onChange={(v) => up((d) => (d.tagline = v))} hint="Shows in the browser tab title." />
            <Text label="Monogram (1–2 letters)" value={config.logoText ?? ''} onChange={(v) => up((d) => (d.logoText = v || undefined))} />
          </Acc>

          <Acc title="Hero" defaultOpen>
            <ImageField label="Photo" value={config.hero.image} onChange={(v) => up((d) => (d.hero.image = v))} />
            <Text label="Kicker" value={config.hero.kicker} onChange={(v) => up((d) => (d.hero.kicker = v))} />
            <Area
              label="Headline"
              value={config.hero.title}
              onChange={(v) => up((d) => (d.hero.title = v))}
              rows={2}
              hint="Wrap words in *asterisks* to colour them: big *or small.*"
            />
            <Area label="Intro line" value={config.hero.lede} onChange={(v) => up((d) => (d.hero.lede = v))} />
            <div className="f-row">
              <Text label="Primary button" value={config.hero.ctaPrimary} onChange={(v) => up((d) => (d.hero.ctaPrimary = v))} />
              <Text label="Secondary button" value={config.hero.ctaSecondary} onChange={(v) => up((d) => (d.hero.ctaSecondary = v))} />
            </div>
            <div className="f-row">
              <Text label="Phone (with country code)" value={config.hero.phone} onChange={(v) => up((d) => (d.hero.phone = v))} />
              <Text label="Phone, as shown" value={config.hero.phoneDisplay} onChange={(v) => up((d) => (d.hero.phoneDisplay = v))} />
            </div>
            {config.hero.stats.map((s, i) => (
              <div className="f-row" key={i}>
                <Text label={`Stat ${i + 1} — big`} value={s.big} onChange={(v) => up((d) => (d.hero.stats[i].big = v))} />
                <Text label="small print" value={s.small} onChange={(v) => up((d) => (d.hero.stats[i].small = v))} />
              </div>
            ))}
          </Acc>

          <Acc title="Offer ticker" pill={config.ticker.on ? 'on' : 'off'}>
            <Toggle label="Show the scrolling offer band" value={config.ticker.on} onChange={(v) => up((d) => (d.ticker.on = v))} />
            <Area
              label="Messages (one per line)"
              value={config.ticker.items.join('\n')}
              onChange={(v) => up((d) => (d.ticker.items = v.split('\n').map((x) => x.trim()).filter(Boolean).slice(0, 6)))}
              rows={3}
            />
          </Acc>

          <Acc title="Statement" pill={config.statement.on ? 'on' : 'off'}>
            <Toggle label="Show the statement section" value={config.statement.on} onChange={(v) => up((d) => (d.statement.on = v))} />
            <Area label="Big line" value={config.statement.big} onChange={(v) => up((d) => (d.statement.big = v))} rows={2} />
            <Area label="Supporting text" value={config.statement.text} onChange={(v) => up((d) => (d.statement.text = v))} />
            <ImageField label="Photo" value={config.statement.image} onChange={(v) => up((d) => (d.statement.image = v))} />
          </Acc>

          <Acc title="Services" pill={String(config.services.items.length)}>
            <Text label="Kicker" value={config.services.headKicker} onChange={(v) => up((d) => (d.services.headKicker = v))} />
            <Area label="Title" value={config.services.headTitle} onChange={(v) => up((d) => (d.services.headTitle = v))} rows={2} />
            <Area label="Lede" value={config.services.headLede} onChange={(v) => up((d) => (d.services.headLede = v))} />
            {config.services.items.map((s, i) => (
              <ListItem
                key={i}
                n={i + 1}
                title={s.title}
                onUp={i > 0 ? () => up((d) => d.services.items.splice(i - 1, 0, d.services.items.splice(i, 1)[0])) : undefined}
                onDown={
                  i < config.services.items.length - 1
                    ? () => up((d) => d.services.items.splice(i + 1, 0, d.services.items.splice(i, 1)[0]))
                    : undefined
                }
                onDelete={() => up((d) => d.services.items.splice(i, 1))}
              >
                <Text label="Service" value={s.title} onChange={(v) => up((d) => (d.services.items[i].title = v))} />
                <Area label="One sentence" value={s.text} onChange={(v) => up((d) => (d.services.items[i].text = v))} rows={2} />
                <IconPicker value={s.icon} onChange={(v) => up((d) => (d.services.items[i].icon = v))} />
              </ListItem>
            ))}
            {config.services.items.length < 8 && (
              <button
                className="add-row"
                onClick={() => up((d) => d.services.items.push({ title: 'New service', text: '', icon: 'sparkle' }))}
              >
                + Add a service
              </button>
            )}
            <Text label="Extras label" value={config.services.extrasLabel} onChange={(v) => up((d) => (d.services.extrasLabel = v))} />
            <Text
              label="Extras (comma-separated)"
              value={config.services.extras.join(', ')}
              onChange={(v) => up((d) => (d.services.extras = v.split(',').map((x) => x.trim()).filter(Boolean).slice(0, 10)))}
            />
          </Acc>

          <Acc title="Before / after" pill={config.work.on ? 'on' : 'off'}>
            <Toggle label="Show the before/after section" value={config.work.on} onChange={(v) => up((d) => (d.work.on = v))} />
            <Text label="Kicker" value={config.work.headKicker} onChange={(v) => up((d) => (d.work.headKicker = v))} />
            <Text label="Title" value={config.work.headTitle} onChange={(v) => up((d) => (d.work.headTitle = v))} />
            <Area label="Lede" value={config.work.headLede} onChange={(v) => up((d) => (d.work.headLede = v))} rows={2} />
            <div className="f-row">
              <Text label="Left label" value={config.work.labelBefore} onChange={(v) => up((d) => (d.work.labelBefore = v))} />
              <Text label="Right label" value={config.work.labelAfter} onChange={(v) => up((d) => (d.work.labelAfter = v))} />
            </div>
            {config.work.items.map((w, i) => (
              <ListItem key={i} n={i + 1} title={w.title} onDelete={() => up((d) => d.work.items.splice(i, 1))}>
                <ImageField label='"Before" photo' value={w.before} onChange={(v) => up((d) => (d.work.items[i].before = v))} />
                <ImageField label='"After" photo' value={w.after} onChange={(v) => up((d) => (d.work.items[i].after = v))} />
                <Text label="Job name" value={w.title} onChange={(v) => up((d) => (d.work.items[i].title = v))} />
                <Text label="Caption" value={w.caption} onChange={(v) => up((d) => (d.work.items[i].caption = v))} />
              </ListItem>
            ))}
            {config.work.items.length < 4 && (
              <button className="add-row" onClick={() => up((d) => d.work.items.push({ before: '', after: '', title: '', caption: '' }))}>
                + Add a before/after pair
              </button>
            )}
          </Acc>

          <Acc title="Accent band" pill={config.band.on ? 'on' : 'off'}>
            <Toggle label="Show the accent band" value={config.band.on} onChange={(v) => up((d) => (d.band.on = v))} />
            <Text label="Kicker" value={config.band.kicker} onChange={(v) => up((d) => (d.band.kicker = v))} />
            <Area label="Title" value={config.band.title} onChange={(v) => up((d) => (d.band.title = v))} rows={2} />
            <Area label="Text" value={config.band.text} onChange={(v) => up((d) => (d.band.text = v))} />
            <div className="f-row">
              <Text label="Above the number" value={config.band.ctaSmallTop} onChange={(v) => up((d) => (d.band.ctaSmallTop = v))} />
              <Text label="Below the number" value={config.band.ctaSmallBottom} onChange={(v) => up((d) => (d.band.ctaSmallBottom = v))} />
            </div>
            <Text label="The big number/line" value={config.band.ctaBig} onChange={(v) => up((d) => (d.band.ctaBig = v))} />
          </Acc>

          <Acc title="Gallery" pill={config.gallery.on ? String(config.gallery.images.filter(Boolean).length) : 'off'}>
            <Toggle label="Show the gallery" value={config.gallery.on} onChange={(v) => up((d) => (d.gallery.on = v))} />
            <Text label="Kicker" value={config.gallery.headKicker} onChange={(v) => up((d) => (d.gallery.headKicker = v))} />
            <Text label="Title" value={config.gallery.headTitle} onChange={(v) => up((d) => (d.gallery.headTitle = v))} />
            {config.gallery.images.map((g, i) => (
              <div className="f" key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <ImageField label={`Photo ${i + 1}`} value={g} onChange={(v) => up((d) => (d.gallery.images[i] = v))} />
                </div>
                <button
                  className="li-tools"
                  style={{ marginTop: 26 }}
                  onClick={() => up((d) => d.gallery.images.splice(i, 1))}
                  aria-label="Remove photo"
                  title="Remove"
                >
                  ✕
                </button>
              </div>
            ))}
            {config.gallery.images.length < 6 && (
              <button className="add-row" onClick={() => up((d) => d.gallery.images.push(''))}>
                + Add a photo
              </button>
            )}
          </Acc>

          <Acc title="Contact">
            <Text label="Kicker" value={config.contact.headKicker} onChange={(v) => up((d) => (d.contact.headKicker = v))} />
            <Area label="Title" value={config.contact.headTitle} onChange={(v) => up((d) => (d.contact.headTitle = v))} rows={2} />
            <Area label="Lede" value={config.contact.lede} onChange={(v) => up((d) => (d.contact.lede = v))} />
            <Text label="Button" value={config.contact.cta} onChange={(v) => up((d) => (d.contact.cta = v))} />
            {config.contact.rows.map((r, i) => (
              <ListItem key={i} n={i + 1} title={r.label || r.value} onDelete={() => up((d) => d.contact.rows.splice(i, 1))}>
                <div className="f-row">
                  <Text label="Label" value={r.label} onChange={(v) => up((d) => (d.contact.rows[i].label = v))} />
                  <Text label="Value" value={r.value} onChange={(v) => up((d) => (d.contact.rows[i].value = v))} />
                </div>
                <Text
                  label="Link (optional)"
                  value={r.href ?? ''}
                  onChange={(v) => up((d) => (d.contact.rows[i].href = v || undefined))}
                  hint="tel:+45…, mailto:…, or https://…"
                />
                <Text label="Small print (optional)" value={r.sub ?? ''} onChange={(v) => up((d) => (d.contact.rows[i].sub = v || undefined))} />
              </ListItem>
            ))}
            {config.contact.rows.length < 6 && (
              <button className="add-row" onClick={() => up((d) => d.contact.rows.push({ label: '', value: '' }))}>
                + Add a row
              </button>
            )}
          </Acc>

          <Acc title="Footer & language">
            <Text label="Footer line" value={config.footer.line} onChange={(v) => up((d) => (d.footer.line = v))} />
            <Area label="Footer note" value={config.footer.note} onChange={(v) => up((d) => (d.footer.note = v))} rows={2} />
            <div className="f">
              <label>Page language (for browsers &amp; screen readers)</label>
              <select value={config.lang} onChange={(e) => up((d) => (d.lang = e.target.value as SiteConfig['lang']))}>
                <option value="en">English</option>
                <option value="ro">Română</option>
                <option value="da">Dansk</option>
              </select>
            </div>
          </Acc>
        </div>

        <div className="stage">
          <div className="stage-frame">
            <iframe
              ref={iframeRef}
              className={device}
              title="Live preview"
              srcDoc={previewHtml}
              onLoad={() => {
                const w = iframeRef.current?.contentWindow;
                if (w && scrollRef.current > 0) w.scrollTo(0, scrollRef.current);
              }}
            />
          </div>
        </div>
      </div>

      {shareOpen && <Share config={config} link={viewUrl} bytes={encoded.length} onClose={() => setShareOpen(false)} />}
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import type { SiteConfig } from '../site/types';
import { renderSiteHTML } from '../site/render';
import { collectImageUrls, embedImages } from '../site/embed';
import { createShortLink, manageUrl, shortLinkUrl, type ManageKey } from './shortlink';

const AVERAGE_PAGE_BYTES = 2.4 * 1024 * 1024; // httparchive median-ish, for the punchline

export function Share(props: {
  config: SiteConfig;
  link: string;
  bytes: number;
  onClose: () => void;
  manage: ManageKey | null;
  onManage: (key: ManageKey) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [credit, setCredit] = useState(true);
  const [packing, setPacking] = useState(false);
  const [qrOk, setQrOk] = useState(true);
  const [shortUrl, setShortUrl] = useState<string | null>(null);
  const [making, setMaking] = useState(false);
  const [shortErr, setShortErr] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  /* The link to print, derived rather than remembered from this one modal
     instance. shortUrl is only ever set by the button below, so on a second
     visit (key restored from storage, or arrived on a management link) that
     is null and the printable box would be empty and the QR would fall back
     to the long link, which for app and shop is too big to encode at all. */
  const printUrl = shortUrl ?? (props.manage ? shortLinkUrl(props.manage) : null);

  useEffect(() => {
    setQrOk(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    QRCode.toCanvas(canvas, printUrl ?? props.link, {
      width: 164,
      margin: 1,
      errorCorrectionLevel: 'L',
      color: { dark: '#141414', light: '#ffffff' },
    }).catch(() => setQrOk(false));
  }, [props.link, printUrl]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && props.onClose();
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  });

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(props.link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked — the input below is selectable */
    }
  };

  const download = async () => {
    if (packing) return;
    setPacking(true);
    /* The link can only carry photo addresses; the file has no such limit —
       pack the photos themselves into it. Any that won't fetch (CORS) keep
       their URL, so the export can never do worse than before. */
    let imageData: Record<string, string> = {};
    try {
      imageData = await embedImages(collectImageUrls(props.config));
    } catch {
      /* never block the download over the photos */
    }
    setPacking(false);
    const html = renderSiteHTML(props.config, {
      appUrl: location.origin + '/app',
      noCredit: !credit,
      imageData,
    });
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = (props.config.brandName || 'site').toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.html';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const kb = (props.bytes / 1024).toFixed(1);
  const ratio = Math.round(AVERAGE_PAGE_BYTES / props.bytes);

  return (
    <div className="modal-back" onClick={(e) => e.target === e.currentTarget && props.onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="Share your site">
        <button className="x" onClick={props.onClose} aria-label="Close">✕</button>
        <h2>This link <em style={{ fontStyle: 'italic' }}>is</em> the website.</h2>
        <p className="sub">
          {props.manage
            ? 'The whole site still travels in the long link below. The short link is the only thing we remember for you, so a printed code can keep up with your edits.'
            : 'No server, no database, no account. The whole site, every word, colour and photo address, is folded into the characters of the link itself.'}
        </p>

        <div className="share-link">
          <input readOnly value={props.link} onFocus={(e) => e.target.select()} />
          <button className="btn btn-k btn-sm" onClick={copy}>
            {copied ? 'Copied ✓' : 'Copy link'}
          </button>
        </div>

        <div className="share-meta">
          {qrOk && <canvas ref={canvasRef} className="qr" aria-label="QR code of your website" />}
          <div className="facts">
            Your entire website weighs <b>{kb} KB</b>, about <b>{ratio.toLocaleString()}×</b>{' '}
            lighter than the average web page. Anyone who opens the link gets the full site;
            anyone who opens it in the editor can keep working on it.
            {qrOk && (
              <>
                {' '}
                {printUrl
                  ? 'The QR code on the left holds the short link below, so it keeps working after you edit the site.'
                  : 'The QR code on the left contains the whole website too.'}
              </>
            )}
            {' '}The downloaded HTML file goes one step further: it packs the photos
            themselves inside, so it works even offline.
          </div>
        </div>

        <div className="share-print">
          {printUrl ? (
            <>
              <div className="share-link">
                <input readOnly value={printUrl} onFocus={(e) => e.target.select()} />
              </div>
              <p className="note">
                This is the link to print. Edit the site later and press
                “Update the printed link”, and every code already out there
                shows the new version.
              </p>
              {props.manage && (
                <>
                  <div className="share-link">
                    <input
                      readOnly
                      value={manageUrl(props.manage, location.origin)}
                      onFocus={(e) => e.target.select()}
                    />
                  </div>
                  <p className="note warn">
                    Keep this second link somewhere safe. It is the key to your
                    site. Anyone who has it can change what the printed code
                    shows, and nobody can get it back for you if you lose it.
                  </p>
                </>
              )}
            </>
          ) : (
            <>
              <p className="note">
                Going on a sign, a van or a business card? A short link stays
                the same when you edit the site, and its code fits however big
                the site grows.
              </p>
              <button
                className="btn btn-k btn-sm"
                disabled={making}
                onClick={async () => {
                  if (making) return;
                  setMaking(true);
                  setShortErr('');
                  try {
                    const made = await createShortLink(props.link.split('#')[1] ?? '');
                    setShortUrl(made.url);
                    props.onManage(made.key);
                  } catch {
                    setShortErr('Could not make a short link just now. Try again in a minute.');
                  } finally {
                    setMaking(false);
                  }
                }}
              >
                {making ? 'Making it…' : 'Make a short link I can print'}
              </button>
              {shortErr && <p className="note warn">{shortErr}</p>}
            </>
          )}
        </div>

        <div className="share-actions">
          <a className="btn btn-y" href={props.link} target="_blank" rel="noreferrer">
            Open the site
          </a>
          <button className="btn btn-o" onClick={download} disabled={packing}>
            {packing ? 'Packing the photos…' : 'Download as HTML file'}
          </button>
          <label className="toggle" style={{ fontSize: '.86rem' }}>
            <input type="checkbox" checked={credit} onChange={(e) => setCredit(e.target.checked)} />
            <span className="tk" />
            <span>“Built with Urlite” line in the footer</span>
          </label>
        </div>
      </div>
    </div>
  );
}

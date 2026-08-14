import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import type { SiteConfig } from '../site/types';
import { renderSiteHTML } from '../site/render';

const AVERAGE_PAGE_BYTES = 2.4 * 1024 * 1024; // httparchive median-ish, for the punchline

export function Share(props: {
  config: SiteConfig;
  link: string;
  bytes: number;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [credit, setCredit] = useState(true);
  const [qrOk, setQrOk] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    QRCode.toCanvas(canvas, props.link, {
      width: 164,
      margin: 1,
      errorCorrectionLevel: 'L',
      color: { dark: '#141414', light: '#ffffff' },
    }).catch(() => setQrOk(false));
  }, [props.link]);

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

  const download = () => {
    const html = renderSiteHTML(props.config, {
      appUrl: location.origin + '/app',
      noCredit: !credit,
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
          No server, no database, no account. The whole site — every word, colour and photo
          address — is folded into the characters of the link itself.
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
            Your entire website weighs <b>{kb} KB</b> — about <b>{ratio.toLocaleString()}×</b>{' '}
            lighter than the average web page. Anyone who opens the link gets the full site;
            anyone who opens it in the editor can keep working on it.
            {qrOk && <> The QR code on the left contains the whole website too.</>}
          </div>
        </div>

        <div className="share-actions">
          <a className="btn btn-y" href={props.link} target="_blank" rel="noreferrer">
            Open the site
          </a>
          <button className="btn btn-o" onClick={download}>
            Download as HTML file
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

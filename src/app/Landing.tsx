import { useEffect, useMemo, useState } from 'react';
import { encodeSite } from '../site/codec';
import { buildPreset, PRESETS } from '../site/presets';

function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.rv');
    if (new URLSearchParams(location.search).has('flat')) {
      // QA mode: skip scroll reveals + collapse svh so headless screenshots see everything
      els.forEach((el) => el.classList.add('in'));
      document.documentElement.classList.add('flat');
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('in');
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: '0px 0px -10% 0px' },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

export function Landing({ nav }: { nav: (p: string) => void }) {
  const [solid, setSolid] = useState(false);
  useEffect(() => {
    const f = () => setSolid(scrollY > 60);
    addEventListener('scroll', f, { passive: true });
    return () => removeEventListener('scroll', f);
  }, []);
  useReveal();

  /* real, working links — computed live from the presets */
  const demos = useMemo(
    () =>
      PRESETS.map((p) => {
        const payload = encodeSite(buildPreset(p.id, 'en'));
        return {
          id: p.id,
          label: p.label.en,
          img: p.images.hero,
          href: `/s/#${payload}`,
          kb: (payload.length / 1024).toFixed(1),
        };
      }),
    [],
  );
  const first = demos[0];

  return (
    <div className="land">
      <header className={'land-nav' + (solid ? ' solid' : '')}>
        <div className="wrap">
          <a
            className="logo"
            href="/"
            onClick={(e) => {
              e.preventDefault();
              scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            <span className="logo-mark serif">U</span>
            <span className="serif">Urlite</span>
          </a>
          <button className="btn btn-k btn-sm" onClick={() => nav('/app')}>
            Open the builder
          </button>
        </div>
      </header>

      <div className="hero-l">
        <div className="wrap">
          <p className="kick rise">No server · no database · no account</p>
          <h1 className="rise">
            The website that lives <em>inside a link.</em>
          </h1>
          <p className="lede rise">
            Build a beautiful one-page site for any small business in about five minutes.
            Then share it. There is nothing to host and nothing to sign up for — every word,
            colour and photo is folded into the characters of the URL itself.
          </p>
          <div className="cta-row rise">
            <button className="btn btn-y" onClick={() => nav('/app')}>
              Build one — it’s free
            </button>
            <span className="try">
              or{' '}
              <a href={first.href} target="_blank" rel="noreferrer">
                open a {first.kb} KB website
              </a>{' '}
              right now
            </span>
          </div>

          <div className="linkbox rise" aria-hidden="true">
            <svg className="chain" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M10 14a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" />
              <path d="M14 10a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
            </svg>
            <code>
              urlite…/s/#<b>{'v1.pVRNb9swDP0rgtFrbTfHIeh6GDBg2IZhhx2GHRiJtrn'}…</b>
            </code>
            <span className="kb">↑ this is the whole site</span>
          </div>
        </div>
      </div>

      <section className="how">
        <div className="wrap">
          <div className="sec-head">
            <div>
              <p className="kick rv">How it works</p>
              <h2 className="rv">Three steps.<br />The third one is the trick.</h2>
            </div>
            <p className="lede rv">
              Websites are usually files on a server. This one is a message in a bottle — the
              bottle happens to be a URL.
            </p>
          </div>
          <div>
            <div className="hrow rv">
              <div className="hnum">01</div>
              <h3>Start from a finished site</h3>
              <p>
                Pick one of five business templates — gardener, painter, restaurant, salon,
                workshop — in English, Romanian or Danish. It loads complete: photos, copy,
                animation, everything.
              </p>
            </div>
            <div className="hrow rv">
              <div className="hnum">02</div>
              <h3>Make it theirs</h3>
              <p>
                Swap the words, the photos and the colours in a live editor. What you see is —
                literally, byte for byte — what gets shared.
              </p>
            </div>
            <div className="hrow rv">
              <div className="hnum">03</div>
              <h3>Copy the link. That’s the site.</h3>
              <p>
                The whole website is compressed into about 2.5 KB and folded into the link
                after the <code>#</code>. That part of a URL never even reaches a server —
                the page unfolds itself in the visitor’s browser.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="wrap">
          <div className="sec-head">
            <div>
              <p className="kick rv">Proof</p>
              <h2 className="rv">Five businesses, five links.</h2>
            </div>
            <p className="lede rv">
              Each card opens a complete website. None of them is hosted anywhere — every one
              of them lives entirely inside its own link. View source on any of them: the page
              you see was born in your browser.
            </p>
          </div>
          <div className="demo-grid">
            {demos.map((d) => (
              <a key={d.id} className="demo-card rv" href={d.href} target="_blank" rel="noreferrer">
                <img src={d.img} alt="" loading="lazy" />
                <span className="dc">
                  <b className="serif">{d.label}</b>
                  <span>{d.kb} KB</span>
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="truth">
        <div className="wrap">
          <div className="sec-head">
            <div>
              <p className="kick rv">Where is it stored?</p>
              <h2 className="rv">Nowhere. That’s the point.</h2>
            </div>
            <p className="lede rv">
              The part of a URL after the # is never sent to any server. Your site isn’t in a
              cloud, isn’t in a database, can’t be taken down, and can’t expire. If you have
              the link, you have the site — forever.
            </p>
          </div>
          <div className="truth-grid">
            <div className="truth-cell rv">
              <b><em>0</em> servers</b>
              <small>Nothing hosted, nothing to pay for, nothing to go down</small>
            </div>
            <div className="truth-cell rv">
              <b>~<em>2.5</em> KB</b>
              <small>A complete site — about 1,000× lighter than the average page</small>
            </div>
            <div className="truth-cell rv">
              <b><em>1</em> file</b>
              <small>Or download it as a single HTML file and host it anywhere you like</small>
            </div>
          </div>
        </div>
      </section>

      <section className="final">
        <div className="wrap">
          <p className="kick rv" style={{ justifyContent: 'center' }}>Free, and quietly magic</p>
          <h2 className="rv">Fold a website into a link.</h2>
          <div className="cta-row rv">
            <button className="btn btn-y" onClick={() => nav('/app')}>
              Open the builder
            </button>
          </div>
        </div>
      </section>

      <footer>
        <div className="wrap">
          <b className="serif" style={{ fontSize: '1.05rem', color: 'var(--ink)' }}>Urlite</b>
          <span>An experiment in weightless websites</span>
          <span className="note">© 2026 ELI-SAMI-TECH S.R.L.</span>
        </div>
      </footer>
    </div>
  );
}

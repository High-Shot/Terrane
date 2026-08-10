import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Search } from 'lucide-react';
import Plate from '../Plate';
import { HERO, PROOF_POINTS, PRODUCT } from '../../content/home';

/**
 * HeroSection.
 *
 * Three changes from the original, in order of importance:
 *
 * 1. The place search moved above the fold. The studio is the product and the
 *    old hero's only route into it was a button; typing a place here hands
 *    straight off to /studio?q=… and the map is already framed on arrival.
 * 2. The stock mountain photograph is gone. In its place is a contour plate
 *    rendered from the site's own drawing code, carrying the printed legend —
 *    the thing that actually distinguishes a Terrane map from a poster.
 * 3. Price, size and lead time are stated here rather than five screens down.
 */
export default function HeroSection() {
  const [q, setQ] = useState('');
  const navigate = useNavigate();

  const submit = (e) => {
    e.preventDefault();
    const term = q.trim();
    navigate(term ? `/studio?q=${encodeURIComponent(term)}` : '/studio');
  };

  return (
    <section className="relative overflow-hidden pt-[74px] grain">
      <div
        className="absolute inset-0 graticule pointer-events-none"
        aria-hidden="true"
        style={{
          background:
            'radial-gradient(1100px 560px at 72% 6%, rgba(209,127,67,0.13), transparent 62%), linear-gradient(180deg, var(--bg-0) 0%, var(--bg-1) 100%)',
        }}
      />

      <div className="container-x relative">
        <div className="grid items-center gap-12 py-16 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16 lg:py-24">
          {/* ---- Left: the promise, then the way in ---- */}
          <div data-reveal-group>
            <p className="reveal mono-label text-[var(--rust)]">
              Custom relief maps · Edition 1 of 1
            </p>

            {/* Each authored line is its own non-wrapping block, so the breaks
                stay exactly where they were written at every viewport width. */}
            <h1 className="reveal t-display mt-6">
              {HERO.headline.map((line) => (
                <span key={line.text} className="block whitespace-nowrap">
                  <span className={line.accent ? 'text-[var(--rust)]' : undefined}>
                    {line.text}
                  </span>
                  {line.tail && (
                    <span className={line.tailAccent ? 'text-[var(--rust)]' : undefined}>
                      {line.tail}
                    </span>
                  )}
                </span>
              ))}
            </h1>

            <p className="reveal t-lead mt-7">{HERO.body}</p>

            {/* The search box is the primary call to action. */}
            <form onSubmit={submit} className="reveal mt-9" role="search">
              <label htmlFor="hero-place" className="mono-meta text-[var(--slate)]">
                Start with a place
              </label>
              <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <Search
                    size={17}
                    aria-hidden="true"
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--slate-dim)]"
                  />
                  <input
                    id="hero-place"
                    type="text"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="A town, an address, a lake…"
                    autoComplete="off"
                    className="w-full rounded-sm border border-[var(--line-strong)] bg-[var(--ink)]/70 py-[0.95rem] pl-11 pr-4 text-[var(--cream)] placeholder:text-[var(--slate-dim)] transition-colors focus:border-[var(--rust)] focus:outline-none"
                  />
                </div>
                <button type="submit" className="btn-rust">
                  Open the studio <ArrowRight size={16} aria-hidden="true" />
                </button>
              </div>
              <p className="mono-meta mt-3 text-[var(--slate-dim)]">
                {HERO.kicker}
              </p>
            </form>

            {/* Product truth, stated up front. */}
            <dl className="reveal mt-9 flex flex-wrap items-center gap-x-7 gap-y-3 border-t border-[var(--line)] pt-7">
              {[
                ['Size', PRODUCT.size],
                ['Price', PRODUCT.price],
                ['Lead time', 'About a week after proof'],
              ].map(([k, v]) => (
                <div key={k} className="flex items-baseline gap-2.5">
                  <dt className="mono-meta text-[var(--slate-dim)]">{k}</dt>
                  <dd className="m-0 font-mono tnum text-sm text-[var(--cream)]">{v}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* ---- Right: the object ---- */}
          <div className="reveal ticks relative">
            <Plate
              place="Fairhope, Alabama"
              sub="Eastern shore, Mobile Bay"
              lat={30.523}
              lng={-87.9033}
              scale="1 : 24,000"
              relief={0.22}
              route
            />
            <p className="mono-meta mt-4 text-center text-[var(--slate-dim)]">
              Contour rendering · your proof is built from survey data
            </p>
          </div>
        </div>
      </div>

      {/* ---- Proof strip ---- */}
      <div className="relative border-t border-[var(--line)] bg-[var(--bg-1)]/70">
        <div className="container-x">
          <ul className="grid list-none grid-cols-2 gap-px p-0 lg:grid-cols-4">
            {PROOF_POINTS.map((f) => (
              <li key={f.title} className="flex gap-3 py-7 lg:px-6 lg:first:pl-0">
                <span
                  aria-hidden="true"
                  className="mt-[0.4rem] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--rust)]"
                />
                <div>
                  <div className="mono-label text-[var(--cream)]">{f.title}</div>
                  <div className="mt-1.5 text-xs text-[var(--slate)]">{f.sub}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

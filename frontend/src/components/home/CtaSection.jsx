import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Search } from 'lucide-react';
import { PRODUCT } from '../../content/home';

/**
 * CtaSection — the close.
 *
 * Keeps the original's best turn ("Some gifts are flat. This is not one.") and
 * gives it somewhere to go: the same place search as the hero, so a reader who
 * scrolled the whole page does not have to scroll back up to act.
 */
export default function CtaSection() {
  const [q, setQ] = useState('');
  const navigate = useNavigate();

  const submit = (e) => {
    e.preventDefault();
    const term = q.trim();
    navigate(term ? `/studio?q=${encodeURIComponent(term)}` : '/studio');
  };

  return (
    <section className="section-loose relative overflow-hidden grain">
      <div
        aria-hidden="true"
        className="graticule absolute inset-0"
        style={{
          background:
            'radial-gradient(820px 460px at 50% 26%, rgba(209,127,67,0.14), transparent 66%)',
        }}
      />

      <div className="container-narrow relative text-center" data-reveal-group>
        <p className="reveal mono-label text-[var(--slate)]">Some gifts are flat.</p>

        <h2 className="reveal t-display mt-5">
          This is <span className="text-[var(--rust)]">not</span> one.
        </h2>

        <form onSubmit={submit} className="reveal mx-auto mt-10 max-w-xl" role="search">
          <label htmlFor="cta-place" className="sr-only">
            Search for a place
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search
                size={17}
                aria-hidden="true"
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--slate-dim)]"
              />
              <input
                id="cta-place"
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="A town, an address, a lake…"
                autoComplete="off"
                className="w-full rounded-sm border border-[var(--line-strong)] bg-[var(--ink)]/70 py-[0.95rem] pl-11 pr-4 text-[var(--cream)] placeholder:text-[var(--slate-dim)] transition-colors focus:border-[var(--rust)] focus:outline-none"
              />
            </div>
            <button type="submit" className="btn-rust">
              Design your map <ArrowRight size={16} aria-hidden="true" />
            </button>
          </div>
        </form>

        <p className="reveal mono-meta mt-6 text-[var(--slate-dim)]">
          {PRODUCT.size} · {PRODUCT.price} · {PRODUCT.shipping}
        </p>

        <p className="reveal mt-8 text-sm text-[var(--slate)]">
          Not sure where to start?{' '}
          <Link to="/faq" className="prose-link">
            Read the FAQ
          </Link>{' '}
          or email{' '}
          <a href={`mailto:${PRODUCT.contact}`} className="prose-link">
            {PRODUCT.contact}
          </a>
          .
        </p>
      </div>
    </section>
  );
}

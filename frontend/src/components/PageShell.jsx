import React from 'react';
import Navbar from './Navbar';
import Footer from './Footer';
import useReveal from '../hooks/useReveal';

/**
 * PageShell — Navbar + <main> + Footer wrapper for standalone content pages.
 * Renders an optional mono-label eyebrow and a large font-display H1, then the
 * page's children inside a container-x section.
 *
 * Props: { title, eyebrow, children }
 */
export default function PageShell({ title, eyebrow, children }) {
  useReveal();

  return (
    <div className="App bg-[var(--bg-0)] overflow-x-hidden">
      <Navbar />
      <main className="pt-[74px] min-h-screen">
        <section className="section">
          <div className="container-x">
            {eyebrow && (
              <div className="reveal flex items-center gap-4 mb-6">
                <span className="w-10 h-px bg-[var(--rust)]" />
                <span className="mono-label text-[var(--rust)]">{eyebrow}</span>
              </div>
            )}
            {title && (
              <h1 className="reveal font-display font-black text-[2.6rem] sm:text-[3.6rem] leading-[1.02] tracking-[-0.02em] max-w-4xl">
                {title}
              </h1>
            )}
            <div className="mt-10">{children}</div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

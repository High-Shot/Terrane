import React from 'react';
import { STEPS } from '../../mock/mock';

export default function HowSection() {
  return (
    <section id="how" className="section">
      <div className="container-x">
        <div className="reveal flex items-center gap-4 mb-8">
          <span className="w-10 h-px bg-[var(--rust)]" />
          <span className="mono-label text-[var(--rust)]">How it works</span>
        </div>
        <h2 className="reveal font-display font-black text-[2.4rem] sm:text-[3.2rem] leading-[1.02] tracking-[-0.02em] max-w-3xl">
          You design it. We check it. <span className="text-[var(--rust)]">Twice.</span>
        </h2>

        <div className="mt-16 grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-[var(--line)] border border-[var(--line)]">
          {STEPS.map((s) => (
            <div key={s.n} className="reveal bg-[var(--bg-0)] p-8 hover:bg-[var(--bg-1)] transition-colors duration-300">
              <div className="font-display font-black text-[3.4rem] text-[var(--rust)]/25 leading-none">{s.n}</div>
              <h3 className="font-display font-bold text-lg mt-5">{s.title}</h3>
              <p className="text-[var(--slate)] text-sm mt-3 leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

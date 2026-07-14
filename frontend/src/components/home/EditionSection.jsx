import React from 'react';
import { LEGEND_POINTS, SAMPLE_LEGEND } from '../../mock/mock';

export default function EditionSection() {
  return (
    <section id="edition" className="section bg-[var(--bg-1)] border-t border-[var(--line)]">
      <div className="container-x grid lg:grid-cols-2 gap-16 items-center">
        <div>
          <div className="reveal flex items-center gap-4 mb-8">
            <span className="w-10 h-px bg-[var(--rust)]" />
            <span className="mono-label text-[var(--rust)]">Edition 1 of 1</span>
          </div>
          <h2 className="reveal font-display font-black text-[2.2rem] sm:text-[2.9rem] leading-[1.04] tracking-[-0.02em] max-w-xl">
            The certificate is printed into the map.
          </h2>
          <ul className="mt-9 space-y-5">
            {LEGEND_POINTS.map((p, i) => (
              <li key={p} className="reveal flex gap-4">
                <span className="mono-label text-[var(--rust)] mt-0.5 shrink-0">{String(i + 1).padStart(2, '0')}</span>
                <span className="text-[var(--cream-dim)] leading-relaxed">{p}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="reveal relative">
          <div className="rounded-sm overflow-hidden border border-[var(--line-strong)] bg-[var(--bg-2)] shadow-[0_40px_80px_-40px_rgba(0,0,0,0.9)]">
            <img src={SAMPLE_LEGEND.image} alt="Relief map" className="w-full h-64 object-cover" />
            <div className="p-6 border-t border-[var(--line)]">
              <div className="font-display font-bold text-xl">{SAMPLE_LEGEND.place}</div>
              <div className="text-[var(--slate)] text-sm mt-1">{SAMPLE_LEGEND.sub}</div>
              <div className="hairline my-5" />
              <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                {[['Coordinates', SAMPLE_LEGEND.coords], ['Scale', SAMPLE_LEGEND.scale], ['Data', SAMPLE_LEGEND.data], ['Edition', SAMPLE_LEGEND.edition]].map(([k, v]) => (
                  <div key={k}>
                    <div className="mono-label text-[var(--slate-dim)] mb-1">{k}</div>
                    <div className="font-mono text-[var(--cream)] text-[0.8rem]">{v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

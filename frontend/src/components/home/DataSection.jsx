import React from 'react';
import SectionHead from '../SectionHead';
import { DATA_SOURCES } from '../../content/home';

/**
 * DataSection — provenance.
 *
 * Was three cards, each topped with a stock photograph of somewhere that is not
 * your place. The photographs undercut the argument the section is making, so
 * they are gone; what is left is the claim, the named dataset behind it, and a
 * numbered register that reads like a source list on a survey sheet.
 */
export default function DataSection() {
  return (
    <section id="the-data" className="section">
      <div className="container-x">
        <SectionHead
          eyebrow="Built from real data"
          title={
            <>
              The terrain is not decoration.
              <br />
              <span className="text-[var(--slate)]">It is measured.</span>
            </>
          }
          lead="Because when it is your place, close enough is not. Every model starts from the same public datasets that surveyors and hydrographers use. We resolve your place to exact coordinates and build the geometry from measurements, not artistic license. If your creek bends, the model bends with it."
        />

        <ol
          className="mt-16 grid list-none gap-px border border-[var(--line)] bg-[var(--line)] p-0 md:grid-cols-3"
          data-reveal-group
        >
          {DATA_SOURCES.map((d, i) => (
            <li
              key={d.source}
              className="reveal flex flex-col bg-[var(--bg-0)] p-8 transition-colors duration-300 hover:bg-[var(--bg-1)]"
            >
              <div className="flex items-baseline justify-between gap-4">
                <span className="mono-label text-[var(--rust)]">{d.tag}</span>
                <span className="mono-meta tnum text-[var(--slate-dim)]">
                  {String(i + 1).padStart(2, '0')}
                </span>
              </div>

              <h3 className="t-h3 mt-6">{d.title}</h3>
              <p className="t-body mt-3 flex-1 text-sm">{d.body}</p>

              {/* mt-auto so the source rules line up across all three cards
                  regardless of how long each body runs. */}
              <div className="mt-auto border-t border-[var(--line)] pt-4">
                <span className="mono-meta text-[var(--slate-dim)]">Source</span>
                <div className="mt-1 font-mono text-[0.8rem] text-[var(--cream)]">
                  {d.source}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

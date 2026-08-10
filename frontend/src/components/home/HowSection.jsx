import React from 'react';
import SectionHead from '../SectionHead';
import { STEPS } from '../../content/home';

/**
 * HowSection — the four steps, on a rail.
 *
 * Previously four equal boxes in a bordered grid, which read as four unrelated
 * facts. A process is a sequence, so it is drawn as one: a hairline runs
 * through the step markers, left to right on desktop and top to bottom on
 * mobile, and the proof step is marked as the one where control sits with the
 * buyer.
 */
export default function HowSection() {
  return (
    <section id="how" className="section-tight">
      <div className="container-x">
        <SectionHead
          eyebrow="How it works"
          title={
            <>
              You design it. We check it. <span className="text-[var(--rust)]">Twice.</span>
            </>
          }
        />

        <ol
          className="relative mt-16 grid list-none gap-10 p-0 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8"
          data-reveal-group
        >
          {/* The rail. Hidden from assistive tech — the ordered list carries
              the sequence already. */}
          <span
            aria-hidden="true"
            className="absolute left-[7px] top-2 hidden h-[calc(100%-1rem)] w-px bg-[var(--line)] sm:block lg:left-0 lg:top-[7px] lg:h-px lg:w-full"
          />

          {STEPS.map((s) => (
            <li key={s.n} className="reveal relative lg:pt-8">
              <span
                aria-hidden="true"
                className="absolute left-0 top-1 block h-3.5 w-3.5 rounded-full border border-[var(--rust)] bg-[var(--bg-0)] sm:top-1.5 lg:top-0"
              />
              <div className="pl-8 lg:pl-0">
                <span className="mono-meta tnum text-[var(--rust)]">{s.n}</span>
                <h3 className="t-h3 mt-3">{s.title}</h3>
                <p className="t-body mt-3 text-sm">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

import React from 'react';
import SectionHead from '../SectionHead';
import Plate from '../Plate';
import { LEGEND_POINTS } from '../../content/home';

/**
 * EditionSection — the legend, and the promise printed into it.
 *
 * The legend block is the single strongest thing Terrane makes: coordinates to
 * four decimals, a true scale ratio, an edition of one. It used to sit in a
 * small card beside a stock photo. Here it is the subject, at full size.
 */
export default function EditionSection() {
  return (
    <section id="edition" className="section band">
      <div className="container-x">
        <div className="grid items-start gap-14 lg:grid-cols-2 lg:gap-20">
          <div>
            <SectionHead
              eyebrow="Edition 1 of 1"
              title="The certificate is printed into the map."
            />

            <ol className="mt-10 list-none space-y-6 p-0" data-reveal-group>
              {LEGEND_POINTS.map((p, i) => (
                <li key={p} className="reveal flex gap-5">
                  <span className="mono-meta tnum mt-1 shrink-0 text-[var(--rust)]">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="leading-relaxed text-[var(--cream-dim)]">{p}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="reveal ticks lg:mt-4">
            <Plate
              place="Lake Tahoe, California"
              sub="Sierra Nevada"
              lat={39.0968}
              lng={-120.0324}
              scale="1 : 90,000"
              relief={0.62}
            />
            <p className="mono-meta mt-4 text-[var(--slate-dim)]">
              Contour rendering · the legend below is the one that gets printed
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

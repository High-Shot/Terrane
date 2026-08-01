import React from 'react';
import MediaSlot from '../MediaSlot';
import { REVIEWS } from '../../data/reviews';

export default function ReviewsSection() {
  return (
    <section id="reviews" className="section bg-[var(--bg-1)] border-t border-[var(--line)]">
      <div className="container-x">
        <div className="reveal flex items-center gap-4 mb-8">
          <span className="w-10 h-px bg-[var(--rust)]" />
          <span className="mono-label text-[var(--rust)]">What makers say</span>
        </div>

        <div className="reveal flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="font-display font-black text-[2.4rem] sm:text-[3.2rem] leading-[1.02] tracking-[-0.02em] max-w-2xl">
            People do not hang maps. <span className="text-[var(--rust)]">They hang places.</span>
          </h2>
          {/* Aggregate rating chip — OWNER: confirm the score and count. */}
          <div className="inline-flex shrink-0 items-center gap-3 rounded-sm border border-[var(--line-strong)] bg-[var(--bg-0)] px-5 py-3">
            <span className="tracking-[0.2em] text-[var(--rust)]">★★★★★</span>
            <span className="font-display font-bold text-lg">4.9</span>
            <span className="mono-label text-[var(--slate)]">from N makers — EDIT</span>
          </div>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {REVIEWS.map((r, i) => (
            <figure
              key={i}
              className="reveal data-card flex flex-col rounded-sm border border-[var(--line)] bg-[var(--bg-0)] p-7"
            >
              <span className="tracking-[0.2em] text-sm text-[var(--rust)]">★★★★★</span>
              <blockquote className="mt-4 flex-1 leading-relaxed text-[var(--cream-dim)]">
                “{r.quote}”
              </blockquote>
              <MediaSlot label={`PHOTO: ${r.name} — map on the wall`} ratio="16/10" className="mt-6" />
              <figcaption className="mt-5">
                <div className="font-display font-bold">{r.name}</div>
                <div className="mono-label mt-1 text-[var(--slate-dim)]">{r.location}</div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

import React from 'react';
import SectionHead from '../SectionHead';
import { REVIEWS, AGGREGATE } from '../../data/reviews';

/**
 * ReviewsSection.
 *
 * Renders nothing when there are no real reviews, which is the current state —
 * see data/reviews.js. The previous version shipped six invented testimonials
 * and a hard-coded 4.9 rating to production with "EDIT" markers still in the
 * strings. An absent section costs a young brand far less than a visibly fake
 * one, and this turns itself on the moment real quotes are added.
 */
export default function ReviewsSection() {
  if (!REVIEWS.length) return null;

  const stars = '★★★★★';

  return (
    <section id="reviews" className="section band">
      <div className="container-x">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <SectionHead
            eyebrow="What makers say"
            title={
              <>
                People do not hang maps.{' '}
                <span className="text-[var(--rust)]">They hang places.</span>
              </>
            }
          />

          {AGGREGATE && (
            <div className="reveal inline-flex shrink-0 items-center gap-3 rounded-sm border border-[var(--line-strong)] bg-[var(--bg-0)] px-5 py-3">
              <span aria-hidden="true" className="tracking-[0.2em] text-[var(--rust)]">
                {stars}
              </span>
              <span className="font-display text-lg font-bold tnum">
                {AGGREGATE.score}
              </span>
              <span className="mono-meta text-[var(--slate)]">
                from {AGGREGATE.count} makers
              </span>
            </div>
          )}
        </div>

        <div
          className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
          data-reveal-group
        >
          {REVIEWS.map((r) => (
            <figure key={`${r.name}-${r.quote.slice(0, 24)}`} className="reveal card flex flex-col p-7">
              <span aria-hidden="true" className="text-sm tracking-[0.2em] text-[var(--rust)]">
                {stars}
              </span>
              <blockquote className="mt-4 flex-1 leading-relaxed text-[var(--cream-dim)]">
                “{r.quote}”
              </blockquote>
              <figcaption className="mt-6 border-t border-[var(--line)] pt-4">
                <div className="font-display font-bold">{r.name}</div>
                <div className="mono-meta mt-1 text-[var(--slate-dim)]">{r.location}</div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

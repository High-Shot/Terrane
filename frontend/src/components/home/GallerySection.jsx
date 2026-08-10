import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import SectionHead from '../SectionHead';
import Plate from '../Plate';
import { SHOWCASE } from '../../content/home';
import { PLACES } from '../../data/places';

/**
 * GallerySection.
 *
 * The old version rendered six dashed "Replace" boxes with "(EDIT)" captions —
 * placeholder scaffolding that was live on the production site. Rather than
 * wait on a photo shoot, each tile now shows a contour plate drawn by the site
 * itself, captioned as a rendering. Nothing here claims to be a photograph of a
 * finished object.
 */

// Link a showcase tile to its /maps/{slug} page when one exists.
const placePathFor = (name) => {
  const q = String(name || '').toLowerCase();
  if (!q) return null;
  const hit = PLACES.find((p) => {
    const n = p.name.toLowerCase();
    return q.includes(n) || n.includes(q);
  });
  return hit ? `/maps/${hit.slug}` : null;
};

export default function GallerySection() {
  return (
    <section id="gallery" className="section">
      <div className="container-x">
        <SectionHead
          eyebrow="Gallery"
          title="Real places, printed in relief."
          lead="Every frame is the same eight inches. What changes is the ground inside it — and that is entirely the point."
        />

        <div
          className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
          data-reveal-group
        >
          {SHOWCASE.map((g) => {
            const path = placePathFor(g.place);
            return (
              <article key={g.place} className="reveal card card-hover flex flex-col p-4">
                <Plate
                  place={g.place}
                  sub={g.sub}
                  lat={g.lat}
                  lng={g.lng}
                  scale={g.scale}
                  relief={g.relief}
                  legend={false}
                />

                <div className="flex flex-1 flex-col p-3 pt-5">
                  <h3 className="t-h3">{g.place}</h3>
                  <p className="mono-meta mt-1.5 text-[var(--slate-dim)]">{g.sub}</p>
                  <p className="t-body mt-3 flex-1 text-sm">{g.note}</p>

                  <Link
                    to={g.isCta ? '/studio' : `/studio?q=${encodeURIComponent(g.place)}`}
                    className="mono-label mt-5 inline-flex items-center gap-2 text-[var(--rust)] transition-colors hover:text-[var(--rust-bright)]"
                  >
                    {g.isCta ? 'Start from scratch' : 'Frame this place'}
                    <ArrowRight size={14} aria-hidden="true" />
                  </Link>

                  {path && (
                    <Link
                      to={path}
                      className="mono-label mt-2.5 inline-flex items-center gap-2 text-[var(--slate)] transition-colors hover:text-[var(--cream)]"
                    >
                      Read about this place
                      <ArrowRight size={14} aria-hidden="true" />
                    </Link>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        <p className="reveal mono-meta mt-8 text-[var(--slate-dim)]">
          Plates above are contour renderings, not photographs of finished pieces.
        </p>
      </div>
    </section>
  );
}

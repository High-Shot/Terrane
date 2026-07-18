import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import MediaSlot from '../MediaSlot';
import { GALLERY } from '../../data/gallery';
import { PLACES } from '../../data/places';

// Map a gallery tile's place string to its /maps/{slug} landing page, when we
// have one. Case-insensitive contains in either direction, so 'Lake Tahoe,
// California' still finds the 'Lake Tahoe' entry. Tiles without a match (e.g.
// 'Your hometown') simply don't get the extra link.
const placePathFor = (galleryPlace) => {
  const q = String(galleryPlace || '').toLowerCase();
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
        <div className="reveal flex items-center gap-4 mb-8">
          <span className="w-10 h-px bg-[var(--rust)]" />
          <span className="mono-label text-[var(--rust)]">Gallery</span>
        </div>
        <h2 className="reveal font-display font-black text-[2.4rem] sm:text-[3.2rem] leading-[1.02] tracking-[-0.02em] max-w-3xl">
          Real places, printed in relief.
        </h2>
        <p className="reveal mt-6 max-w-2xl leading-relaxed text-[var(--cream-dim)]">
          A few of the maps that have come off the bed. Swap each slot for your own finished
          photography — one 8×8 example per tile. (EDIT)
        </p>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {GALLERY.map((g, i) => {
            const placePath = placePathFor(g.place);
            return (
              <div
                key={i}
                className="reveal data-card flex flex-col rounded-sm border border-[var(--line)] bg-[var(--bg-0)] p-4"
              >
                <MediaSlot label={`PHOTO: ${g.place} — finished 8×8 map`} ratio="1/1" />
                <div className="mt-1 flex flex-1 flex-col p-3">
                  <div className="font-display font-bold text-lg">{g.place}</div>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-[var(--slate)]">{g.blurb}</p>
                  <Link
                    to="/studio"
                    className="mono-label mt-4 inline-flex items-center gap-2 text-[var(--rust)] transition-colors hover:text-[var(--rust-bright)]"
                  >
                    Build a map like this <ArrowRight size={14} />
                  </Link>
                  {placePath && (
                    <Link
                      to={placePath}
                      className="mono-label mt-2 inline-flex items-center gap-2 text-[var(--slate)] transition-colors hover:text-[var(--cream)]"
                    >
                      Read about this place <ArrowRight size={14} />
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

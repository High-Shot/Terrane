import React, { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import PageShell from '../components/PageShell';
import MediaSlot from '../components/MediaSlot';
import NotFound from './NotFound';
import { PLACES, placeBySlug } from '../data/places';
import { fmtLat, fmtLng } from '../lib/format';
import { trackPageview } from '../lib/analytics';

// The studio's flow, condensed to the three beats a first-time visitor needs.
const STEPS = [
  { n: '01', title: 'Frame it in the studio', body: 'Center the frame, set the zoom and the 3D angle, put the name you use on the legend.' },
  { n: '02', title: 'We email a proof', body: 'We build the final render from survey elevation data and send it to you before anything prints.' },
  { n: '03', title: 'Approve, we print & ship', body: 'You pay the $249 only after you approve. Printed once, mounted, and shipped. Edition 1 of 1.' },
];

/**
 * PlacePage — SEO landing page for one crafted place, at /maps/:slug.
 * Editorial intro, a photo slot for the finished piece, a deep-link into the
 * studio pre-framed on the place, and links to the other nine places.
 */
export default function PlacePage() {
  const { slug } = useParams();
  const place = placeBySlug(slug);

  useEffect(() => {
    if (!place) return;
    trackPageview();
    document.title = `${place.name} 3D Relief Map — Terrane`;
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    meta.setAttribute(
      'content',
      `A custom 8" × 8" 3D-printed relief map of ${place.name}, built from real elevation data. ${place.terrainNote} $249, proof approved by email before it prints.`
    );
    // SPA: no cleanup — the next page sets its own title/description.
  }, [place]);

  if (!place) return <NotFound />;

  const studioHref = `/studio?lat=${place.lat}&lng=${place.lng}&name=${encodeURIComponent(place.name)}&sub=${encodeURIComponent(place.sub)}`;
  const others = PLACES.filter((p) => p.slug !== place.slug);

  return (
    <PageShell eyebrow="Custom 3D relief map" title={place.name}>
      <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr] lg:items-start">
        {/* Intro — editorial prose + the facts row */}
        <div className="max-w-2xl">
          <div className="reveal mono-label text-[var(--slate)]">{place.sub}</div>
          <p className="reveal mt-5 leading-relaxed text-[var(--cream-dim)]">{place.blurb}</p>
          <p className="reveal mt-4 leading-relaxed text-[var(--cream-dim)]">{place.terrainNote}</p>

          <div className="reveal mt-8 flex flex-wrap items-center gap-x-4 gap-y-2 border-y border-[var(--line)] py-4">
            <span className="mono-label text-[var(--rust)]">
              {fmtLat(place.lat)}, {fmtLng(place.lng)}
            </span>
            <span className="mono-label text-[var(--slate-dim)]">·</span>
            <span className="mono-label text-[var(--slate)]">8" × 8" · Edition 1 of 1 · $249</span>
          </div>

          {/* CTA */}
          <div className="reveal mt-8 flex flex-wrap items-center gap-4">
            <Link to={studioHref}>
              <button className="btn-rust flex items-center gap-2">
                Design this map in the studio <ArrowRight size={16} />
              </button>
            </Link>
            <Link to="/#gallery">
              <button className="btn-ghost">See more places</button>
            </Link>
          </div>
        </div>

        <MediaSlot
          label={`PHOTO: ${place.name} — finished 8×8 relief map`}
          ratio="1/1"
          className="reveal w-full max-w-lg"
        />
      </div>

      {/* How it works — the studio flow in three beats */}
      <div className="mt-20">
        <div className="reveal flex items-center gap-4 mb-6">
          <span className="w-10 h-px bg-[var(--rust)]" />
          <span className="mono-label text-[var(--rust)]">How it works</span>
        </div>
        <div className="grid sm:grid-cols-3 gap-px bg-[var(--line)] border border-[var(--line)]">
          {STEPS.map((s) => (
            <div key={s.n} className="reveal bg-[var(--bg-0)] p-7 hover:bg-[var(--bg-1)] transition-colors duration-300">
              <div className="font-display font-black text-[2.6rem] text-[var(--rust)]/25 leading-none">{s.n}</div>
              <h3 className="font-display font-bold text-lg mt-4">{s.title}</h3>
              <p className="text-[var(--slate)] text-sm mt-2 leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* More places */}
      <div className="mt-20">
        <div className="reveal flex items-center gap-4 mb-6">
          <span className="w-10 h-px bg-[var(--rust)]" />
          <span className="mono-label text-[var(--rust)]">More places</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {others.map((p) => (
            <Link
              key={p.slug}
              to={`/maps/${p.slug}`}
              className="reveal group rounded-sm border border-[var(--line)] bg-[var(--bg-0)] px-4 py-3 transition-colors hover:border-[var(--rust)]"
            >
              <span className="block font-display font-bold text-[var(--cream)] group-hover:text-[var(--rust)] transition-colors">
                {p.name}
              </span>
              <span className="mt-0.5 block text-xs text-[var(--slate)]">{p.sub}</span>
            </Link>
          ))}
        </div>
      </div>
    </PageShell>
  );
}

import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import PageShell from '../components/PageShell';
import Plate from '../components/Plate';

/**
 * About.
 *
 * The previous version shipped bracketed prompts to production —
 * "[FOUNDER NAME — EDIT]", "[THE PLACE THAT STARTED IT — EDIT]",
 * "[CITY / STATE — EDIT]" — visible to anyone who clicked About in the footer.
 *
 * The copy below is the finished About text already written for the Shopify
 * storefront (shopify/pages/about.html), ported here so both storefronts say
 * the same thing. It deliberately makes the argument without a founder
 * biography, so nothing has to be invented to remove the placeholders.
 */

const BLOCKS = [
  {
    heading: 'A place does not have to be famous to matter.',
    body: 'The lake where every summer happened. The street that raised you. The trail you still bring up. Most of the places that matter most will never make a postcard, and that is exactly why we build them. If you can point to it, we can make it.',
  },
  {
    heading: 'The terrain is measured, not imagined.',
    body: 'Every model starts from the same public datasets that surveyors and hydrographers use. We resolve your place to exact coordinates and build the geometry from measurements, not artistic license — if your creek bends, the model bends with it.',
  },
  {
    heading: 'You design it. We check it. Twice.',
    body: 'You frame your place in the studio — set the crop and orientation and watch the legend update live with coordinates and true scale. Then we build the final render from survey data and email you a proof. Nothing goes on the printer until you approve it. No surprise mountains.',
  },
  {
    heading: 'Made one at a time.',
    body: 'Each map is 3D printed layer by layer in durable PLA, inspected by hand, mounted, and shipped ready for the wall. It is an edition of one: your design is printed a single time, for you, and never reproduced or resold. The second line of the legend is yours — a name, a date, the reason — and we print it and never ask.',
  },
];

const SOURCES = [
  ['USGS 3DEP', 'Aerial lidar accurate enough to catch the rise behind your house.'],
  ['NOAA', 'Coastlines, bays, and lake beds sit where the water actually sits.'],
  ['OpenStreetMap', 'Streets and place names — your cul-de-sac counts as much as any mountain.'],
];

export default function About() {
  return (
    <PageShell eyebrow="Our story" title="Maps of the places that made us.">
      <div className="grid gap-14 lg:grid-cols-[1.35fr_1fr] lg:items-start lg:gap-20">
        <div className="max-w-2xl">
          <p className="reveal t-lead">
            Terrane makes one thing: a physical model of a real place, built from
            real terrain data and printed in relief. Not a poster of a place — the
            place itself. Its ridgelines, its shoreline, the streets you know by
            heart, measured and made into something you can hold.
          </p>

          <div className="mt-12 space-y-10" data-reveal-group>
            {BLOCKS.map((b) => (
              <section key={b.heading} className="reveal">
                <h2 className="t-h3">{b.heading}</h2>
                <p className="mt-3 leading-relaxed text-[var(--cream-dim)]">{b.body}</p>
              </section>
            ))}
          </div>

          <dl className="reveal mt-12 m-0 border-t border-[var(--line)]">
            {SOURCES.map(([name, note]) => (
              <div
                key={name}
                className="grid grid-cols-1 gap-1 border-b border-[var(--line)] py-4 sm:grid-cols-[10rem_1fr] sm:gap-6"
              >
                <dt className="mono-meta pt-1 text-[var(--rust)]">{name}</dt>
                <dd className="m-0 text-sm text-[var(--cream-dim)]">{note}</dd>
              </div>
            ))}
          </dl>

          <div className="reveal mt-10">
            <Link to="/studio">
              <button className="btn-rust">
                Open the studio and find your place{' '}
                <ArrowRight size={16} aria-hidden="true" />
              </button>
            </Link>
          </div>
        </div>

        <div className="reveal space-y-6">
          <Plate
            place="Fairhope, Alabama"
            sub="Eastern shore, Mobile Bay"
            lat={30.523}
            lng={-87.9033}
            scale="1 : 24,000"
            relief={0.22}
          />
          <p className="mono-meta text-[var(--slate-dim)]">
            Contour rendering · the proof is built from survey data
          </p>
        </div>
      </div>
    </PageShell>
  );
}

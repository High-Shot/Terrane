import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import PageShell from '../components/PageShell';
import MediaSlot from '../components/MediaSlot';

const BLOCKS = [
  {
    heading: 'It started with one place.',
    body: 'Terrane was founded by [FOUNDER NAME — EDIT], who wanted a real, physical model of [THE PLACE THAT STARTED IT — EDIT]. Nothing on the market captured the actual terrain, so they built it. Tell that origin story here in the founder\'s own voice. (EDIT)',
  },
  {
    heading: 'The workshop.',
    body: 'Every map is made in [CITY / STATE — EDIT], one at a time. Describe the studio, who is behind the printers, and the care that goes into each piece. (EDIT)',
  },
  {
    heading: 'How it is made.',
    body: 'We resolve your place to exact coordinates, pull elevation from USGS 3DEP, water from NOAA, and streets from OpenStreetMap, then build the geometry from measurements — not artistic license. It is 3D printed layer by layer, inspected, mounted, and shipped. Confirm the print method and finishing steps here. (EDIT)',
  },
  {
    heading: 'The materials.',
    body: 'Maps are printed in durable PLA and finished by hand. Confirm materials, finish options, mounting hardware, and anything else a buyer should know here. (EDIT)',
  },
];

export default function About() {
  return (
    <PageShell eyebrow="Our story" title="Maps of the places that made us.">
      <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr] lg:items-start">
        <div className="max-w-2xl space-y-10">
          {BLOCKS.map((b) => (
            <div key={b.heading} className="reveal">
              <h2 className="font-display font-bold text-2xl">{b.heading}</h2>
              <p className="mt-3 leading-relaxed text-[var(--cream-dim)]">{b.body}</p>
            </div>
          ))}

          <div className="reveal">
            <Link to="/studio">
              <button className="btn-rust flex items-center gap-2">
                Open the studio <ArrowRight size={16} />
              </button>
            </Link>
          </div>
        </div>

        <div className="reveal space-y-6">
          <MediaSlot label="PHOTO: founder / the workshop" ratio="4/5" />
          <MediaSlot label="PHOTO: a map in progress on the printer" ratio="4/3" />
        </div>
      </div>
    </PageShell>
  );
}

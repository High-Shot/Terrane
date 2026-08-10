import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import SectionHead from '../SectionHead';
import Plate from '../Plate';
import { SPEC_ROWS, PRODUCT } from '../../content/home';

/**
 * ObjectSection — what you actually receive.
 *
 * Replaces the old "Sizes" section, which sat seventh on the page and led with
 * a single price card. For a one-SKU product the specification *is* the pitch,
 * so it moves up and is stated as a spec table: eight rows a buyer can scan
 * rather than a paragraph they have to read.
 */
export default function ObjectSection() {
  return (
    <section id="object" className="section band">
      <div className="container-x">
        <div className="grid gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
          <div>
            <SectionHead
              eyebrow="The object"
              title={<>One size. Built for the wall.</>}
              lead="Eight inches on a side, printed in relief from measured elevation, mounted and ready to hang. Big enough for a neighborhood, a stretch of shoreline, or the trailhead you keep coming back to — small enough to live anywhere."
            />

            <div className="reveal mt-10 flex flex-wrap items-end gap-x-8 gap-y-4">
              <div>
                <div className="mono-meta text-[var(--slate-dim)]">Price</div>
                <div className="t-h1 mt-1 tnum">{PRODUCT.price}</div>
              </div>
              <div className="pb-2">
                <div className="mono-meta text-[var(--slate-dim)]">Made to order</div>
                <div className="mt-1 text-sm text-[var(--cream-dim)]">
                  {PRODUCT.lead}
                </div>
              </div>
            </div>

            <div className="reveal mt-9">
              <Link to="/studio">
                <button className="btn-rust">
                  Design your map <ArrowRight size={16} aria-hidden="true" />
                </button>
              </Link>
            </div>
          </div>

          <div>
            <dl className="reveal m-0 border-t border-[var(--line)]">
              {SPEC_ROWS.map(([term, value]) => (
                <div
                  key={term}
                  className="grid grid-cols-[7.5rem_1fr] gap-4 border-b border-[var(--line)] py-4 sm:grid-cols-[9.5rem_1fr] sm:gap-6"
                >
                  <dt className="mono-meta pt-1 text-[var(--slate-dim)]">{term}</dt>
                  <dd className="m-0 text-[var(--cream-dim)]">{value}</dd>
                </div>
              ))}
            </dl>

            <div className="reveal mt-10 grid gap-6 sm:grid-cols-2">
              <Plate
                place="Moab, Utah"
                sub="Colorado Plateau"
                lat={38.5733}
                lng={-109.5498}
                scale="1 : 48,000"
                relief={0.85}
                legend={false}
              />
              <Plate
                place="Acadia, Maine"
                sub="Mount Desert Island"
                lat={44.3386}
                lng={-68.2733}
                scale="1 : 36,000"
                relief={0.5}
                legend={false}
              />
            </div>
            <p className="reveal mono-meta mt-4 text-[var(--slate-dim)]">
              Same frame, same size — the ground decides the rest.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

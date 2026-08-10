import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, Truck, ShieldCheck, ArrowRight } from 'lucide-react';
import SectionHead from '../SectionHead';
import { GUARANTEES } from '../../content/home';

const ICONS = { clock: Clock, truck: Truck, shield: ShieldCheck };

/**
 * GuaranteeSection.
 *
 * The three chips here used to read "Ships in ~X weeks — EDIT", "Free US
 * shipping — EDIT" and "Tracking included — EDIT" on the live site. Every one
 * of those had a real answer already published on the site's own Shipping,
 * Returns and FAQ pages; the figures now come from there (see content/home.js).
 */
export default function GuaranteeSection() {
  return (
    <section id="guarantee" className="section-tight">
      <div className="container-x">
        <SectionHead
          eyebrow="The promise"
          title={
            <>
              You approve a proof{' '}
              <span className="text-[var(--rust)]">before we print.</span>
            </>
          }
          lead="We build the final render from survey data and send it to you first. Nothing goes on the bed until you say yes. If it is not right, we fix it."
        />

        <ul
          className="mt-12 grid list-none gap-4 p-0 sm:grid-cols-3"
          data-reveal-group
        >
          {GUARANTEES.map((c) => {
            const Icon = ICONS[c.icon];
            return (
              <li
                key={c.label}
                className="reveal flex items-start gap-3.5 rounded-sm border border-[var(--line-strong)] bg-[var(--panel-solid)] px-5 py-5"
              >
                <Icon
                  size={19}
                  aria-hidden="true"
                  className="mt-0.5 shrink-0 text-[var(--rust)]"
                />
                <span className="text-sm leading-relaxed text-[var(--cream-dim)]">
                  {c.label}
                </span>
              </li>
            );
          })}
        </ul>

        <div className="reveal mt-10 flex flex-wrap items-center gap-4">
          <Link to="/studio">
            <button className="btn-rust">
              Design your map <ArrowRight size={16} aria-hidden="true" />
            </button>
          </Link>
          <Link to="/faq">
            <button className="btn-ghost">Read the FAQ</button>
          </Link>
        </div>
      </div>
    </section>
  );
}

import React from 'react';
import { Link } from 'react-router-dom';
import { Gift, Truck, Heart, ArrowRight } from 'lucide-react';
import SectionHead from '../SectionHead';
import { GIFTING } from '../../content/home';

const ICONS = { gift: Gift, truck: Truck, heart: Heart };

/**
 * GiftingSection.
 *
 * Kept, and quieter than the sections around it — gifting is a real commercial
 * motive for this product but it is not the argument for it. The three columns
 * previously ended in "(EDIT)" prompts asking the owner to describe policies;
 * they now state only what the site already commits to elsewhere.
 */
export default function GiftingSection() {
  return (
    <section id="gifting" className="section-tight band">
      <div className="container-x">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-start lg:gap-20">
          <div>
            <SectionHead
              eyebrow="Gifting"
              title="The gift that is only theirs."
              lead="A relief map of the place that made someone is a keepsake, not a poster. Made once, for one person, and impossible to buy anywhere else."
            />

            <div className="reveal mt-9">
              <Link to="/studio">
                <button className="btn-ghost">
                  Start a gift map <ArrowRight size={16} aria-hidden="true" />
                </button>
              </Link>
            </div>
          </div>

          {/* Rows, not columns — as three columns inside this half-width track
              the headings broke across three lines each. */}
          <ul className="m-0 list-none p-0" data-reveal-group>
            {GIFTING.map((c) => {
              const Icon = ICONS[c.icon];
              return (
                <li
                  key={c.title}
                  className="reveal flex gap-5 border-t border-[var(--line)] py-6 last:border-b"
                >
                  <Icon
                    size={20}
                    aria-hidden="true"
                    className="mt-1 shrink-0 text-[var(--rust)]"
                  />
                  <div>
                    <h3 className="t-h3 text-[1.15rem]">{c.title}</h3>
                    <p className="t-body mt-2 text-sm">{c.body}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}

import React from 'react';
import { Link } from 'react-router-dom';
import { Gift, Truck, Heart, ArrowRight } from 'lucide-react';
import MediaSlot from '../MediaSlot';

const COLUMNS = [
  {
    icon: Gift,
    title: 'Add a gift note',
    body: 'A second legend line carries a name, a date, or the reason. We print it and never ask. Write your default gift-note guidance here. (EDIT)',
  },
  {
    icon: Truck,
    title: 'Ship to the recipient',
    body: 'Send it straight to their door, or to yours to give in person. Confirm your gift-shipping options and any surcharge here. (EDIT)',
  },
  {
    icon: Heart,
    title: 'Framed for the occasion',
    body: 'Weddings, retirements, the family cabin, the first house. Describe the occasions you frame best here. (EDIT)',
  },
];

export default function GiftingSection() {
  return (
    <section id="gifting" className="section bg-[var(--bg-1)] border-t border-[var(--line)]">
      <div className="container-x">
        <div className="grid items-center gap-14 lg:grid-cols-2">
          <div>
            <div className="reveal flex items-center gap-4 mb-8">
              <span className="w-10 h-px bg-[var(--rust)]" />
              <span className="mono-label text-[var(--rust)]">Gifting</span>
            </div>
            <h2 className="reveal font-display font-black text-[2.2rem] sm:text-[3rem] leading-[1.03] tracking-[-0.02em] max-w-xl">
              The gift that is only theirs.
            </h2>
            <p className="reveal mt-6 max-w-lg leading-relaxed text-[var(--cream-dim)]">
              A relief map of the place that made someone is a keepsake, not a poster. Made once, for
              one person, and impossible to buy anywhere else. (EDIT)
            </p>
          </div>
          <MediaSlot label="PHOTO: gift packaging / unboxing" ratio="4/3" className="reveal" />
        </div>

        <div className="mt-16 grid gap-px border border-[var(--line)] bg-[var(--line)] sm:grid-cols-3">
          {COLUMNS.map((c) => {
            const Icon = c.icon;
            return (
              <div key={c.title} className="reveal bg-[var(--bg-0)] p-8">
                <Icon size={22} className="text-[var(--rust)]" />
                <h3 className="font-display font-bold text-lg mt-5">{c.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-[var(--slate)]">{c.body}</p>
              </div>
            );
          })}
        </div>

        <div className="reveal mt-10">
          <Link to="/studio">
            <button className="btn-rust flex items-center gap-2">
              Start a gift map <ArrowRight size={16} />
            </button>
          </Link>
        </div>
      </div>
    </section>
  );
}

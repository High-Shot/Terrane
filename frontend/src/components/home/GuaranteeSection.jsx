import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, Truck, PackageCheck, ArrowRight } from 'lucide-react';

const CHIPS = [
  { icon: Clock, label: 'Ships in ~X weeks — EDIT' },
  { icon: Truck, label: 'Free US shipping — EDIT' },
  { icon: PackageCheck, label: 'Tracking included — EDIT' },
];

export default function GuaranteeSection() {
  return (
    <section id="guarantee" className="section">
      <div className="container-x">
        <div className="reveal max-w-3xl">
          <div className="flex items-center gap-4 mb-8">
            <span className="w-10 h-px bg-[var(--rust)]" />
            <span className="mono-label text-[var(--rust)]">The promise</span>
          </div>
          <h2 className="font-display font-black text-[2.4rem] sm:text-[3.2rem] leading-[1.02] tracking-[-0.02em]">
            You approve a proof <span className="text-[var(--rust)]">before we print.</span>
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-[var(--cream-dim)]">
            We build the final render from survey data and send it to you first. Nothing goes on the
            bed until you say yes. If it is not right, we fix it.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          {CHIPS.map((c) => {
            const Icon = c.icon;
            return (
              <div
                key={c.label}
                className="reveal flex items-center gap-3 rounded-sm border border-[var(--line-strong)] bg-[var(--panel-solid)] px-5 py-4"
              >
                <Icon size={20} className="shrink-0 text-[var(--rust)]" />
                <span className="mono-label text-[var(--cream-dim)]">{c.label}</span>
              </div>
            );
          })}
        </div>

        <div className="reveal mt-10 flex flex-wrap items-center gap-4">
          <Link to="/studio">
            <button className="btn-rust flex items-center gap-2">
              Design your map <ArrowRight size={16} />
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

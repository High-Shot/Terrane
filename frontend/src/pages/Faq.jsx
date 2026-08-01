import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import PageShell from '../components/PageShell';
import { FAQ } from '../data/faq';

export default function Faq() {
  return (
    <PageShell eyebrow="Answers" title="Frequently asked questions">
      <div className="reveal max-w-3xl border-y border-[var(--line)]">
        {FAQ.map((item, i) => (
          <details
            key={i}
            className="group border-b border-[var(--line)] py-5 last:border-b-0"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-6 font-display font-bold text-lg [&::-webkit-details-marker]:hidden">
              {item.q}
              <span className="shrink-0 text-2xl leading-none text-[var(--rust)] transition-transform duration-200 group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="mt-4 leading-relaxed text-[var(--cream-dim)]">{item.a}</p>
          </details>
        ))}
      </div>

      <div className="reveal mt-12 flex flex-wrap items-center gap-4">
        <Link to="/studio">
          <button className="btn-rust flex items-center gap-2">
            Open the studio <ArrowRight size={16} />
          </button>
        </Link>
        <Link to="/contact">
          <button className="btn-ghost">Still have a question?</button>
        </Link>
      </div>
    </PageShell>
  );
}

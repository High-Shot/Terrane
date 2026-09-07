import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, MapPin } from 'lucide-react';
import { SIZES } from '../../content/home';

export default function SizesSection() {
  return (
    <section id="sizes" className="section bg-[var(--bg-1)] border-t border-[var(--line)]">
      <div className="container-x">
        <div className="reveal flex items-center gap-4 mb-8">
          <span className="w-10 h-px bg-[var(--rust)]" />
          <span className="mono-label text-[var(--rust)]">Sizes</span>
        </div>
        <h2 className="reveal font-display font-black text-[2.4rem] sm:text-[3.2rem] leading-[1.02] tracking-[-0.02em]">
          One size. Built for the wall.
        </h2>
        <p className="reveal mt-6 text-[var(--cream-dim)] max-w-2xl leading-relaxed">
          Every piece is made to order from your design in the studio.
        </p>

        <div className="mt-14 flex justify-center">
          {SIZES.map((s) => (
            <div key={s.size} className="reveal data-card rounded-sm border border-[var(--line)] bg-[var(--bg-0)] p-9 flex flex-col w-full max-w-md">
              <div className="flex items-start justify-between">
                <div className="font-display font-black text-[2.6rem] tracking-[-0.02em]">{s.size}</div>
                <MapPin size={22} className="text-[var(--rust)] mt-2" />
              </div>
              <p className="text-[var(--slate)] mt-5 leading-relaxed flex-1">{s.desc}</p>
              <div className="hairline my-7" />
              <div className="flex items-center justify-between">
                <div className="font-display font-bold text-2xl">{s.price}</div>
                <span className="mono-label text-[var(--slate-dim)]">Made to order</span>
              </div>
            </div>
          ))}
        </div>
        <div className="reveal mt-10">
          <Link to="/studio"><button className="btn-rust flex items-center gap-2">Open the studio <ArrowRight size={16} /></button></Link>
        </div>
      </div>
    </section>
  );
}

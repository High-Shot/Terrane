import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { HERO, FEATURES } from '../../mock/mock';

export default function HeroSection() {
  return (
    <section className="relative pt-[74px] grain">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(1200px 600px at 70% 10%, rgba(205,123,65,0.10), transparent 60%), linear-gradient(180deg, var(--bg-0), var(--bg-1))' }}
      />
      <div className="container-x relative grid lg:grid-cols-2 gap-14 items-center py-20 lg:py-28">
        <div className="reveal in">
          <h1 className="font-display font-black leading-[0.94] tracking-[-0.02em] text-[3.4rem] sm:text-[4.6rem] lg:text-[5rem]">
            A place does not<br />
            have to be<br />
            <span>famous</span> <span className="text-[var(--rust)]">to</span><br />
            <span className="text-[var(--rust)]">matter.</span>
          </h1>
          <p className="mt-8 text-[var(--cream-dim)] text-[1.05rem] leading-relaxed max-w-xl">{HERO.body}</p>
          <div className="mt-9 flex flex-wrap gap-4">
            <Link to="/studio"><button className="btn-rust flex items-center gap-2">Design your map <ArrowRight size={16} /></button></Link>
            <a href="#how"><button className="btn-ghost">How it works</button></a>
          </div>
          <div className="mt-8 mono-label text-[var(--slate-dim)]">{HERO.eyebrow}</div>
        </div>

        <div className="reveal in relative">
          <div className="relative rounded-sm overflow-hidden border border-[var(--line-strong)] shadow-[0_40px_80px_-30px_rgba(0,0,0,0.8)]">
            <img src={HERO.image} alt="3D relief map" className="w-full h-[440px] object-cover" />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 55%, rgba(11,28,41,0.9))' }} />
            <div className="absolute bottom-0 left-0 right-0 p-5 flex items-end justify-between">
              <div>
                <div className="font-display font-bold text-lg">Fairhope, Alabama</div>
                <div className="mono-label text-[var(--rust)] mt-1">30.5230 N, 87.9033 W</div>
              </div>
              <div className="mono-label text-[var(--slate)] text-right">Edition<br />1 of 1</div>
            </div>
          </div>
          <div className="absolute -top-4 -left-4 w-24 h-24 border-l border-t border-[var(--rust)]/40" />
          <div className="absolute -bottom-4 -right-4 w-24 h-24 border-r border-b border-[var(--rust)]/40" />
        </div>
      </div>

      <div className="border-t border-b border-[var(--line)] bg-[var(--bg-1)]/60">
        <div className="container-x grid grid-cols-2 lg:grid-cols-4 divide-x divide-[var(--line)]">
          {FEATURES.map((f) => (
            <div key={f.title} className="py-8 px-4 lg:px-8 flex gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--rust)] mt-1.5 shrink-0" />
              <div>
                <div className="mono-label text-[var(--cream)]">{f.title}</div>
                <div className="text-[var(--slate)] text-xs mt-1.5">{f.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

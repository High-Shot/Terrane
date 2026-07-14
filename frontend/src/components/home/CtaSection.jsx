import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export default function CtaSection() {
  return (
    <section className="relative section grain overflow-hidden">
      <div className="absolute inset-0" style={{ background: 'radial-gradient(900px 500px at 50% 30%, rgba(205,123,65,0.12), transparent 65%)' }} />
      <div className="container-x relative text-center">
        <p className="reveal mono-label text-[var(--slate)]">Some gifts are flat.</p>
        <h2 className="reveal font-display font-black text-[2.8rem] sm:text-[4.2rem] leading-[1.0] tracking-[-0.02em] mt-5">
          This is <span className="text-[var(--rust)]">not</span> one.
        </h2>
        <div className="reveal mt-10 flex justify-center">
          <Link to="/studio"><button className="btn-rust flex items-center gap-2">Design your map <ArrowRight size={16} /></button></Link>
        </div>
      </div>
    </section>
  );
}

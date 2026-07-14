import React from 'react';
import { Compass, Waves, Route } from 'lucide-react';
import { DATA_SOURCES } from '../../mock/mock';

const SourceIcon = ({ i }) => {
  const cls = 'text-[var(--rust)]';
  if (i === 0) return <Compass size={20} className={cls} />;
  if (i === 1) return <Waves size={20} className={cls} />;
  return <Route size={20} className={cls} />;
};

export default function DataSection() {
  return (
    <section id="the-data" className="section">
      <div className="container-x">
        <div className="reveal flex items-center gap-4 mb-8">
          <span className="w-10 h-px bg-[var(--rust)]" />
          <span className="mono-label text-[var(--rust)]">Built from real data</span>
        </div>
        <h2 className="reveal font-display font-black text-[2.4rem] sm:text-[3.2rem] leading-[1.02] tracking-[-0.02em] max-w-3xl">
          The terrain is not decoration.<br /><span className="text-[var(--slate)]">It is measured.</span>
        </h2>
        <p className="reveal mt-7 text-[var(--cream-dim)] leading-relaxed max-w-2xl">
          Because when it is your place, close enough is not. Every model starts from the same public datasets that surveyors and hydrographers use. We resolve your place to exact coordinates and build the geometry from measurements, not artistic license. If your creek bends, the model bends with it.
        </p>

        <div className="mt-16 grid md:grid-cols-3 gap-6">
          {DATA_SOURCES.map((d, i) => (
            <div key={d.tag} className="reveal data-card rounded-sm overflow-hidden border border-[var(--line)] bg-[var(--panel-solid)]">
              <div className="relative h-48 overflow-hidden">
                <img src={d.image} alt={d.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(11,28,41,0.2), rgba(11,28,41,0.85))' }} />
                <div className="absolute top-4 left-4 flex items-center gap-2"><SourceIcon i={i} /></div>
              </div>
              <div className="p-6">
                <div className="mono-label text-[var(--rust)]">{d.tag}</div>
                <h3 className="font-display font-bold text-xl mt-3">{d.title}</h3>
                <p className="text-[var(--slate)] text-sm mt-3 leading-relaxed">{d.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

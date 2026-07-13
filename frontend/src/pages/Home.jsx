import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, MapPin, Compass, Waves, Route } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import useReveal from '../hooks/useReveal';
import { HERO, FEATURES, DATA_SOURCES, LEGEND_POINTS, SAMPLE_LEGEND, STEPS, SIZES } from '../mock/mock';

const SourceIcon = ({ i }) => {
  const cls = 'text-[var(--rust)]';
  if (i === 0) return <Compass size={20} className={cls} />;
  if (i === 1) return <Waves size={20} className={cls} />;
  return <Route size={20} className={cls} />;
};

export default function Home() {
  useReveal();

  return (
    <div className="App bg-[var(--bg-0)] overflow-x-hidden">
      <Navbar />

      {/* HERO */}
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
            <p className="mt-8 text-[var(--cream-dim)] text-[1.05rem] leading-relaxed max-w-xl">
              {HERO.body}
            </p>
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

        {/* FEATURE BAR */}
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

      {/* THE DATA */}
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

      {/* EDITION / CERTIFICATE */}
      <section id="edition" className="section bg-[var(--bg-1)] border-t border-[var(--line)]">
        <div className="container-x grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="reveal flex items-center gap-4 mb-8">
              <span className="w-10 h-px bg-[var(--rust)]" />
              <span className="mono-label text-[var(--rust)]">Edition 1 of 1</span>
            </div>
            <h2 className="reveal font-display font-black text-[2.2rem] sm:text-[2.9rem] leading-[1.04] tracking-[-0.02em] max-w-xl">
              The certificate is printed into the map.
            </h2>
            <ul className="mt-9 space-y-5">
              {LEGEND_POINTS.map((p, i) => (
                <li key={p} className="reveal flex gap-4">
                  <span className="mono-label text-[var(--rust)] mt-0.5 shrink-0">{String(i + 1).padStart(2, '0')}</span>
                  <span className="text-[var(--cream-dim)] leading-relaxed">{p}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="reveal relative">
            <div className="rounded-sm overflow-hidden border border-[var(--line-strong)] bg-[var(--bg-2)] shadow-[0_40px_80px_-40px_rgba(0,0,0,0.9)]">
              <img src={SAMPLE_LEGEND.image} alt="Relief map" className="w-full h-64 object-cover" />
              <div className="p-6 border-t border-[var(--line)]">
                <div className="font-display font-bold text-xl">{SAMPLE_LEGEND.place}</div>
                <div className="text-[var(--slate)] text-sm mt-1">{SAMPLE_LEGEND.sub}</div>
                <div className="hairline my-5" />
                <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                  {[['Coordinates', SAMPLE_LEGEND.coords], ['Scale', SAMPLE_LEGEND.scale], ['Data', SAMPLE_LEGEND.data], ['Edition', SAMPLE_LEGEND.edition]].map(([k, v]) => (
                    <div key={k}>
                      <div className="mono-label text-[var(--slate-dim)] mb-1">{k}</div>
                      <div className="font-mono text-[var(--cream)] text-[0.8rem]">{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="section">
        <div className="container-x">
          <div className="reveal flex items-center gap-4 mb-8">
            <span className="w-10 h-px bg-[var(--rust)]" />
            <span className="mono-label text-[var(--rust)]">How it works</span>
          </div>
          <h2 className="reveal font-display font-black text-[2.4rem] sm:text-[3.2rem] leading-[1.02] tracking-[-0.02em] max-w-3xl">
            You design it. We check it. <span className="text-[var(--rust)]">Twice.</span>
          </h2>

          <div className="mt-16 grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-[var(--line)] border border-[var(--line)]">
            {STEPS.map((s) => (
              <div key={s.n} className="reveal bg-[var(--bg-0)] p-8 hover:bg-[var(--bg-1)] transition-colors duration-300">
                <div className="font-display font-black text-[3.4rem] text-[var(--rust)]/25 leading-none">{s.n}</div>
                <h3 className="font-display font-bold text-lg mt-5">{s.title}</h3>
                <p className="text-[var(--slate)] text-sm mt-3 leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SIZES */}
      <section id="sizes" className="section bg-[var(--bg-1)] border-t border-[var(--line)]">
        <div className="container-x">
          <div className="reveal flex items-center gap-4 mb-8">
            <span className="w-10 h-px bg-[var(--rust)]" />
            <span className="mono-label text-[var(--rust)]">Sizes</span>
          </div>
          <h2 className="reveal font-display font-black text-[2.4rem] sm:text-[3.2rem] leading-[1.02] tracking-[-0.02em]">
            Two formats. One price.
          </h2>
          <p className="reveal mt-6 text-[var(--cream-dim)] max-w-2xl leading-relaxed">
            Both hang portrait or landscape. Every piece is made to order from your design in the studio.
          </p>

          <div className="mt-14 grid md:grid-cols-2 gap-6">
            {SIZES.map((s) => (
              <div key={s.size} className="reveal data-card rounded-sm border border-[var(--line)] bg-[var(--bg-0)] p-9 flex flex-col">
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

      {/* CTA */}
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

      <Footer />
    </div>
  );
}

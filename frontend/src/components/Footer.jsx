import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="border-t border-[var(--line)] bg-[var(--bg-1)]">
      <div className="container-x py-16">
        <div className="grid md:grid-cols-2 gap-10 items-start">
          <div>
            <div className="flex items-center gap-3 mb-5">
              <svg width="26" height="26" viewBox="0 0 40 40" fill="none">
                <g stroke="var(--rust)" strokeWidth="1.6" fill="none">
                  <path d="M20 6 C11 6 6 12 6 20 C6 28 12 34 20 34 C28 34 34 28 34 20 C34 12 28 6 20 6Z" opacity="0.55" />
                  <path d="M20 11 C14 11 11 15 11 20 C11 25 15 29 20 29 C25 29 29 25 29 20 C29 15 25 11 20 11Z" opacity="0.75" />
                  <path d="M20 16 C17 16 16 18 16 20 C16 22 18 24 20 24 C22 24 24 22 24 20 C24 18 22 16 20 16Z" />
                </g>
              </svg>
              <span className="font-display font-extrabold tracking-[0.25em] text-[1rem]">TERRANE</span>
            </div>
            <p className="text-[var(--slate)] text-sm max-w-sm leading-relaxed">
              Custom 3D-printed relief maps, built from real terrain data. Designed by you, proofed by us, printed once. Edition 1 of 1.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8">
            <div>
              <div className="mono-label text-[var(--rust)] mb-4">Explore</div>
              <ul className="space-y-3">
                <li><Link to="/studio" className="text-[var(--cream-dim)] hover:text-[var(--rust)] transition-colors text-sm">The Studio</Link></li>
                <li><a href="/#the-data" className="text-[var(--cream-dim)] hover:text-[var(--rust)] transition-colors text-sm">The Data</a></li>
                <li><a href="/#how" className="text-[var(--cream-dim)] hover:text-[var(--rust)] transition-colors text-sm">How it works</a></li>
                <li><a href="/#sizes" className="text-[var(--cream-dim)] hover:text-[var(--rust)] transition-colors text-sm">Sizes</a></li>
              </ul>
            </div>
            <div>
              <div className="mono-label text-[var(--rust)] mb-4">Data</div>
              <ul className="space-y-3">
                <li className="text-[var(--cream-dim)] text-sm">USGS 3DEP</li>
                <li className="text-[var(--cream-dim)] text-sm">NOAA</li>
                <li className="text-[var(--cream-dim)] text-sm">OpenStreetMap</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="hairline my-10" />

        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <span className="mono-label text-[var(--slate-dim)]">Edition 1 of 1 · Your file is never resold</span>
          <span className="mono-label text-[var(--slate-dim)]">© {new Date().getFullYear()} Terrane</span>
        </div>
      </div>
    </footer>
  );
}

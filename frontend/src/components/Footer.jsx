import React from 'react';
import { Link } from 'react-router-dom';

const COLUMNS = [
  {
    title: 'Explore',
    links: [
      { label: 'The Studio', to: '/studio', type: 'route' },
      { label: 'Gallery', to: '/#gallery', type: 'hash' },
      { label: 'How it works', to: '/#how', type: 'hash' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', to: '/about', type: 'route' },
      { label: 'Contact', to: '/contact', type: 'route' },
      { label: 'FAQ', to: '/faq', type: 'route' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy', to: '/privacy', type: 'route' },
      { label: 'Terms', to: '/terms', type: 'route' },
      { label: 'Shipping', to: '/shipping', type: 'route' },
      { label: 'Returns', to: '/returns', type: 'route' },
    ],
  },
];

const FooterLink = ({ link }) => {
  const cls = 'text-[var(--cream-dim)] hover:text-[var(--rust)] transition-colors text-sm';
  return link.type === 'hash' ? (
    <a href={link.to} className={cls}>{link.label}</a>
  ) : (
    <Link to={link.to} className={cls}>{link.label}</Link>
  );
};

export default function Footer() {
  return (
    <footer className="border-t border-[var(--line)] bg-[var(--bg-1)]">
      <div className="container-x py-16">
        <div className="grid gap-12 lg:grid-cols-[1.2fr_2fr]">
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

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {COLUMNS.map((col) => (
              <div key={col.title}>
                <div className="mono-label text-[var(--rust)] mb-4">{col.title}</div>
                <ul className="space-y-3">
                  {col.links.map((link) => (
                    <li key={link.label}><FooterLink link={link} /></li>
                  ))}
                </ul>
              </div>
            ))}

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

import React from 'react';
import { Link } from 'react-router-dom';
import { Logo } from './Navbar';
import { PRODUCT } from '../content/home';

/**
 * Footer.
 *
 * Same four columns as before. What changed: the contact address and the
 * product's headline terms are stated here rather than only on the policy
 * pages, and the data credits are marked up as the attributions they are.
 */

const COLUMNS = [
  {
    title: 'Explore',
    links: [
      { label: 'The studio', to: '/studio', type: 'route' },
      { label: 'Gallery', to: '/#gallery', type: 'hash' },
      { label: 'How it works', to: '/#how', type: 'hash' },
      { label: 'The object', to: '/#object', type: 'hash' },
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

const LINK_CLS =
  'text-sm text-[var(--cream-dim)] transition-colors hover:text-[var(--rust)]';

const FooterLink = ({ link }) =>
  link.type === 'hash' ? (
    <a href={link.to} className={LINK_CLS}>
      {link.label}
    </a>
  ) : (
    <Link to={link.to} className={LINK_CLS}>
      {link.label}
    </Link>
  );

export default function Footer() {
  return (
    <footer className="border-t border-[var(--line)] bg-[var(--bg-1)]">
      <div className="container-x py-16">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_2fr]">
          <div>
            <Logo size={26} />
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-[var(--slate)]">
              Custom 3D-printed relief maps, built from real terrain data.
              Designed by you, proofed by us, printed once. Edition 1 of 1.
            </p>
            <p className="mt-5 text-sm text-[var(--slate)]">
              <a
                href={`mailto:${PRODUCT.contact}`}
                className="prose-link"
              >
                {PRODUCT.contact}
              </a>
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {COLUMNS.map((col) => (
              <nav key={col.title} aria-label={col.title}>
                <h2 className="mono-label mb-4 text-[var(--rust)]">{col.title}</h2>
                <ul className="m-0 list-none space-y-3 p-0">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <FooterLink link={link} />
                    </li>
                  ))}
                </ul>
              </nav>
            ))}

            <div>
              <h2 className="mono-label mb-4 text-[var(--rust)]">Data</h2>
              <ul className="m-0 list-none space-y-3 p-0 text-sm text-[var(--cream-dim)]">
                <li>USGS 3DEP</li>
                <li>NOAA</li>
                <li>OpenStreetMap</li>
              </ul>
            </div>
          </div>
        </div>

        <hr className="hairline my-10" />

        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <span className="mono-meta text-[var(--slate-dim)]">
            {PRODUCT.size} · {PRODUCT.price} · Edition 1 of 1 · Your file is never resold
          </span>
          <span className="mono-meta text-[var(--slate-dim)]">
            © {new Date().getFullYear()} Terrane
          </span>
        </div>
      </div>
    </footer>
  );
}

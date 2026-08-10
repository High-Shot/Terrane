import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { NAV_LINKS, PRODUCT } from '../content/home';
import { useAuth } from '../lib/AuthContext';
import AuthModal from './AuthModal';

/**
 * Navbar.
 *
 * The previous header carried eight destinations — five from the mock nav plus
 * three appended — including "The Data" and "Edition 1 of 1", which are section
 * headings rather than places to go. At 1440px they wrapped onto two lines.
 *
 * Now: five links, no wrapping, and the price sits on the primary action so the
 * cost of the product is visible on every page rather than only on the one
 * section that mentioned it.
 */

export const Logo = ({ onClick, size = 30 }) => (
  <Link to="/" onClick={onClick} className="flex shrink-0 items-center gap-3">
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <g stroke="var(--rust)" strokeWidth="1.6" fill="none">
        <path d="M20 6 C11 6 6 12 6 20 C6 28 12 34 20 34 C28 34 34 28 34 20 C34 12 28 6 20 6Z" opacity="0.55" />
        <path d="M20 11 C14 11 11 15 11 20 C11 25 15 29 20 29 C25 29 29 25 29 20 C29 15 25 11 20 11Z" opacity="0.75" />
        <path d="M20 16 C17 16 16 18 16 20 C16 22 18 24 20 24 C22 24 24 22 24 20 C24 18 22 16 20 16Z" />
      </g>
    </svg>
    <span className="font-display text-[1.05rem] font-extrabold tracking-[0.25em] text-[var(--cream)]">
      TERRANE
    </span>
  </Link>
);

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close the mobile sheet on route change, and lock scroll while it is open.
  useEffect(() => setOpen(false), [location.pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const handleAnchor = useCallback(
    (href) => (e) => {
      if (!href.startsWith('/#')) return;
      e.preventDefault();
      setOpen(false);
      const id = href.slice(2);
      if (location.pathname !== '/') {
        navigate(`/#${id}`);
        setTimeout(
          () => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }),
          120
        );
      } else {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
      }
    },
    [location.pathname, navigate]
  );

  const NavItem = ({ link, className = '' }) => {
    const cls = `mono-label whitespace-nowrap text-[var(--slate)] transition-colors hover:text-[var(--cream)] ${className}`;
    return link.href.startsWith('/#') ? (
      <a href={link.href} onClick={handleAnchor(link.href)} className={cls}>
        {link.label}
      </a>
    ) : (
      <Link to={link.href} onClick={() => setOpen(false)} className={cls}>
        {link.label}
      </Link>
    );
  };

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        scrolled || open
          ? 'border-b border-[var(--line)] bg-[var(--bg-0)]/92 backdrop-blur-md'
          : 'border-b border-transparent bg-transparent'
      }`}
    >
      <div className="container-x flex h-[74px] items-center justify-between gap-6">
        <Logo onClick={() => setOpen(false)} />

        <nav aria-label="Primary" className="hidden items-center gap-8 lg:flex">
          {NAV_LINKS.map((l) => (
            <NavItem key={l.label} link={l} />
          ))}
        </nav>

        <div className="hidden shrink-0 items-center gap-5 lg:flex">
          {user ? (
            <div className="flex items-center gap-2.5">
              <span
                aria-hidden="true"
                className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--rust)] font-display text-xs font-bold text-[var(--rust-ink)]"
              >
                {user.name.charAt(0).toUpperCase()}
              </span>
              <button
                onClick={logout}
                className="mono-label whitespace-nowrap text-[var(--slate)] transition-colors hover:text-[var(--cream)]"
              >
                Sign out
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAuthOpen(true)}
              className="mono-label whitespace-nowrap text-[var(--slate)] transition-colors hover:text-[var(--cream)]"
            >
              Sign in
            </button>
          )}
          <Link to="/studio">
            <button className="btn-rust btn-sm">
              Design yours · {PRODUCT.price}
            </button>
          </Link>
        </div>

        <button
          className="text-[var(--cream)] lg:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {open && (
        <div className="flex flex-col gap-5 border-t border-[var(--line)] bg-[var(--bg-1)] px-[var(--gutter)] py-7 lg:hidden">
          {NAV_LINKS.map((l) => (
            <NavItem key={l.label} link={l} />
          ))}
          {user ? (
            <button
              onClick={() => { logout(); setOpen(false); }}
              className="mono-label text-left text-[var(--slate)]"
            >
              Sign out ({user.name})
            </button>
          ) : (
            <button
              onClick={() => { setAuthOpen(true); setOpen(false); }}
              className="mono-label text-left text-[var(--slate)]"
            >
              Sign in
            </button>
          )}
          <Link to="/studio" onClick={() => setOpen(false)}>
            <button className="btn-rust w-full">
              Design yours · {PRODUCT.price}
            </button>
          </Link>
        </div>
      )}

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </header>
  );
}

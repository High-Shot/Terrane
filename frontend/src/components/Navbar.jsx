import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { NAV_LINKS } from '../mock/mock';

const Logo = ({ onClick }) => (
  <Link to="/" onClick={onClick} className="flex items-center gap-3 group">
    <svg width="30" height="30" viewBox="0 0 40 40" fill="none" className="shrink-0">
      <g stroke="var(--rust)" strokeWidth="1.6" fill="none">
        <path d="M20 6 C11 6 6 12 6 20 C6 28 12 34 20 34 C28 34 34 28 34 20 C34 12 28 6 20 6Z" opacity="0.55" />
        <path d="M20 11 C14 11 11 15 11 20 C11 25 15 29 20 29 C25 29 29 25 29 20 C29 15 25 11 20 11Z" opacity="0.75" />
        <path d="M20 16 C17 16 16 18 16 20 C16 22 18 24 20 24 C22 24 24 22 24 20 C24 18 22 16 20 16Z" />
      </g>
    </svg>
    <span className="font-display font-extrabold tracking-[0.25em] text-[1.05rem] text-[var(--cream)]">TERRANE</span>
  </Link>
);

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleAnchor = (href) => (e) => {
    setOpen(false);
    if (href.startsWith('/#')) {
      e.preventDefault();
      const id = href.slice(2);
      if (location.pathname !== '/') {
        navigate('/');
        setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }), 100);
      } else {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled ? 'bg-[var(--bg-0)]/90 backdrop-blur-md border-b border-[var(--line)]' : 'bg-transparent'
      }`}
    >
      <div className="container-x flex items-center justify-between h-[74px]">
        <Logo onClick={() => setOpen(false)} />

        <nav className="hidden lg:flex items-center gap-9">
          {NAV_LINKS.map((l) =>
            l.href.startsWith('/#') ? (
              <a key={l.label} href={l.href} onClick={handleAnchor(l.href)} className="mono-label text-[var(--slate)] hover:text-[var(--cream)] transition-colors">
                {l.label}
              </a>
            ) : (
              <Link key={l.label} to={l.href} className="mono-label text-[var(--slate)] hover:text-[var(--cream)] transition-colors">
                {l.label}
              </Link>
            )
          )}
        </nav>

        <div className="hidden lg:block">
          <Link to="/studio"><button className="btn-rust">Open the studio</button></Link>
        </div>

        <button className="lg:hidden text-[var(--cream)]" onClick={() => setOpen(!open)} aria-label="Menu">
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {open && (
        <div className="lg:hidden bg-[var(--bg-1)] border-t border-[var(--line)] px-8 py-6 flex flex-col gap-5">
          {NAV_LINKS.map((l) =>
            l.href.startsWith('/#') ? (
              <a key={l.label} href={l.href} onClick={handleAnchor(l.href)} className="mono-label text-[var(--slate)]">{l.label}</a>
            ) : (
              <Link key={l.label} to={l.href} onClick={() => setOpen(false)} className="mono-label text-[var(--slate)]">{l.label}</Link>
            )
          )}
          <Link to="/studio" onClick={() => setOpen(false)}><button className="btn-rust w-full">Open the studio</button></Link>
        </div>
      )}
    </header>
  );
}

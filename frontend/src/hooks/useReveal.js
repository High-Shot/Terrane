import { useEffect } from 'react';

/**
 * Scroll-reveal for elements carrying `.reveal`.
 *
 * The previous version set `opacity: 0` on `.reveal` in the stylesheet and
 * relied on an IntersectionObserver to bring it back. That made the CSS
 * responsible for hiding content it could not itself un-hide: if JS failed to
 * run, the observer never fired, or the browser lacked IntersectionObserver,
 * the page rendered blank.
 *
 * Now the hidden state lives behind `.js-reveal` on <html>, which this hook
 * adds only after confirming it can also remove it. No JS, no hiding.
 *
 * Elements reveal in document order within their nearest `[data-reveal-group]`
 * (or their parent), so a row of cards steps in rather than snapping together.
 */

const STAGGER_MS = 70;
const MAX_STAGGER_MS = 350;

export default function useReveal() {
  useEffect(() => {
    const root = document.documentElement;
    const els = Array.from(document.querySelectorAll('.reveal'));
    if (!els.length) return undefined;

    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    // No observer support, or the user asked for less motion: show everything.
    if (typeof IntersectionObserver === 'undefined' || reduced) {
      els.forEach((el) => el.classList.add('in'));
      return undefined;
    }

    root.classList.add('js-reveal');

    // Stagger each element against its siblings in the same group.
    els.forEach((el) => {
      const group = el.closest('[data-reveal-group]') || el.parentElement;
      const peers = group ? Array.from(group.querySelectorAll(':scope > .reveal')) : [];
      const index = Math.max(0, peers.indexOf(el));
      const delay = Math.min(index * STAGGER_MS, MAX_STAGGER_MS);
      el.style.setProperty('--reveal-delay', `${delay}ms`);
    });

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -8% 0px' }
    );

    els.forEach((el) => io.observe(el));

    // Anything already above the fold on mount reveals immediately, so the
    // first screen never waits on a scroll event.
    requestAnimationFrame(() => {
      els.forEach((el) => {
        if (el.getBoundingClientRect().top < window.innerHeight) {
          el.classList.add('in');
          io.unobserve(el);
        }
      });
    });

    return () => {
      io.disconnect();
      root.classList.remove('js-reveal');
    };
  }, []);
}

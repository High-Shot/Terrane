import React from 'react';

/**
 * SectionHead — eyebrow + heading + optional lead.
 *
 * The eyebrow (a rust rule followed by a mono label) is a genuine brand
 * signature and is kept. What is new is that it lives in one place, so the
 * homepage's nine sections can share the mark while differing in everything
 * else — the old page repeated the identical eyebrow/H2/card-grid block nine
 * times, which is what made it read as one long section.
 *
 * Props: { eyebrow, title, lead, align, size, className, children }
 */
export default function SectionHead({
  eyebrow,
  title,
  lead,
  align = 'left',
  size = 'h2',
  className = '',
  children,
}) {
  const centered = align === 'center';

  return (
    <div
      className={`${centered ? 'mx-auto text-center' : ''} ${className}`}
      data-reveal-group
    >
      {eyebrow && (
        <p
          className={`reveal eyebrow mono-label ${centered ? 'justify-center' : ''}`}
        >
          {eyebrow}
        </p>
      )}

      {title && (
        <h2 className={`reveal ${size === 'h1' ? 't-h1' : 't-h2'} ${eyebrow ? 'mt-6' : ''}`}>
          {title}
        </h2>
      )}

      {lead && (
        <p className={`reveal t-lead mt-6 ${centered ? 'mx-auto' : ''}`}>{lead}</p>
      )}

      {children}
    </div>
  );
}

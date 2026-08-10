import React from 'react';
import { Link } from 'react-router-dom';
import PageShell from '../components/PageShell';
import { PRODUCT } from '../content/home';

/**
 * Shipping policy.
 *
 * Replaces a page that shipped "[CARRIER — EDIT]", "about X business days",
 * "within X days" and "Last updated: [DATE — EDIT]" to production, above a
 * banner reading "Starter text — review with a professional before launch".
 *
 * This is the finished policy already written for the Shopify storefront
 * (shopify/pages/shipping.html), ported verbatim in substance so the two
 * storefronts cannot state different terms. It also corrects the contact
 * address, which read contact@terranemaps.com here and barcus@terranemaps.com
 * everywhere else.
 */

const SECTIONS = [
  {
    heading: 'Made to order',
    body: 'You frame your place in the studio and we email you a proof. Once you approve it, we print your map, inspect it by hand, mount it, and ship it. Nothing is printed before your approval.',
  },
  {
    heading: 'How long it takes',
    body: 'Most maps ship within one week of proof approval. If anything about your piece needs extra time, we will tell you before we print.',
  },
  {
    heading: 'Where we ship',
    body: 'Free shipping within the United States, with tracking included on every order. We do not offer international shipping yet — if you are outside the US, email us and we will let you know when we can reach you.',
  },
  {
    heading: 'Tracking',
    body: 'You will receive a tracking number by email as soon as your map is on its way.',
  },
];

export default function Shipping() {
  return (
    <PageShell eyebrow="Policy" title="Shipping">
      <div className="max-w-2xl">
        <p className="reveal t-lead">
          Every Terrane map is made to order, so the timeline starts when you
          approve your proof — not the moment you order.
        </p>

        <div className="mt-12 space-y-9" data-reveal-group>
          {SECTIONS.map((s) => (
            <section key={s.heading} className="reveal">
              <h2 className="t-h3">{s.heading}</h2>
              <p className="mt-2.5 leading-relaxed text-[var(--cream-dim)]">{s.body}</p>
            </section>
          ))}

          <section className="reveal">
            <h2 className="t-h3">If it arrives damaged</h2>
            <p className="mt-2.5 leading-relaxed text-[var(--cream-dim)]">
              Your map ships ready to hang, packed to protect the relief in
              transit. If anything looks wrong when it arrives, see{' '}
              <Link to="/returns" className="prose-link">
                Returns
              </Link>{' '}
              — we will remake or refund it, free.
            </p>
          </section>
        </div>

        <p className="reveal mt-12 text-sm text-[var(--slate)]">
          Questions? Email{' '}
          <a href={`mailto:${PRODUCT.contact}`} className="prose-link">
            {PRODUCT.contact}
          </a>
          .
        </p>
        <p className="reveal mono-meta mt-4 text-[var(--slate-dim)]">
          Last updated: July 2026
        </p>
      </div>
    </PageShell>
  );
}

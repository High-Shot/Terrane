import React from 'react';
import PageShell from '../components/PageShell';
import { PRODUCT } from '../content/home';

/**
 * Returns policy.
 *
 * Replaces a page that shipped "within X days", "within X business days" and
 * "Last updated: [DATE — EDIT]" to production under a "Starter text" banner.
 *
 * This is the finished policy already written for the Shopify storefront
 * (shopify/pages/returns.html), ported so both storefronts state identical
 * terms, with the contact address corrected to the real one.
 */

const SECTIONS = [
  {
    heading: 'Made-to-order items',
    body: 'Because each map is custom-made for a single place and printed only once, we do not accept returns or exchanges on completed orders.',
  },
  {
    heading: 'If it arrives damaged or defective',
    body: 'We stand behind every piece. If your map arrives damaged, or there is a defect in how it was printed or finished, we will remake or refund it, free, within 30 days of delivery.',
  },
  {
    heading: 'Cancellations and changes',
    body: 'You can change or cancel your order any time before you approve your proof. Once you approve the proof, your map goes into production and can no longer be changed or cancelled.',
  },
  {
    heading: 'The proof protects you',
    body: 'The proof is your chance to get every detail right. We email you the final render and print nothing until you approve it, so you always see exactly what you are getting first.',
  },
];

export default function Returns() {
  return (
    <PageShell eyebrow="Policy" title="Returns & Remakes">
      <div className="max-w-2xl">
        <p className="reveal t-lead">
          Every Terrane map is built from scratch for one specific place, as an
          edition of one. That shapes how returns work.
        </p>

        <div className="mt-12 space-y-9" data-reveal-group>
          {SECTIONS.map((s) => (
            <section key={s.heading} className="reveal">
              <h2 className="t-h3">{s.heading}</h2>
              <p className="mt-2.5 leading-relaxed text-[var(--cream-dim)]">{s.body}</p>
            </section>
          ))}

          <section className="reveal">
            <h2 className="t-h3">How to reach us</h2>
            <p className="mt-2.5 leading-relaxed text-[var(--cream-dim)]">
              Email{' '}
              <a href={`mailto:${PRODUCT.contact}`} className="prose-link">
                {PRODUCT.contact}
              </a>{' '}
              within 30 days of delivery with your order number and a photo of the
              issue. We will sort out a remake or refund right away — no runaround.
            </p>
          </section>
        </div>

        <p className="reveal mono-meta mt-12 text-[var(--slate-dim)]">
          Last updated: July 2026
        </p>
      </div>
    </PageShell>
  );
}

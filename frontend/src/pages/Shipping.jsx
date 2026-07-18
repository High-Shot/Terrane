import React from 'react';
import { Info } from 'lucide-react';
import PageShell from '../components/PageShell';

const SECTIONS = [
  {
    heading: 'Processing and production time',
    body: 'Every Terrane map is made to order and does not begin production until you approve your proof. After approval, allow about X business days for production before your order ships. (EDIT)',
  },
  {
    heading: 'Shipping methods and delivery',
    body: 'We ship within the United States via [CARRIER — EDIT] with tracking included. Estimated transit time after production is X–Y business days. Confirm carriers, service levels, and delivery estimates here. (EDIT)',
  },
  {
    heading: 'Shipping cost',
    body: 'Standard U.S. shipping is free. Expedited options and their pricing, if offered, are described here. (EDIT)',
  },
  {
    heading: 'International shipping',
    body: 'International shipping may be available on request. Buyers are responsible for any customs duties, taxes, or import fees. Confirm which countries you ship to and how duties are handled. (EDIT)',
  },
  {
    heading: 'Tracking',
    body: 'You will receive a tracking number by email once your order ships. Confirm how and when tracking is sent. (EDIT)',
  },
  {
    heading: 'Lost or damaged shipments',
    body: 'If your order arrives damaged, contact us at contact@terranemaps.com within X days with photos and we will make it right. See our Returns page for details. (EDIT)',
  },
];

export default function Shipping() {
  return (
    <PageShell eyebrow="Policy" title="Shipping">
      <div className="reveal mb-10 flex items-start gap-3 rounded-sm border border-[var(--line-strong)] bg-[var(--panel-solid)] p-4">
        <Info size={18} className="mt-0.5 shrink-0 text-[var(--rust)]" />
        <p className="text-sm leading-relaxed text-[var(--cream-dim)]">
          Starter text — review with a professional before launch.
        </p>
      </div>

      <div className="max-w-2xl space-y-8">
        {SECTIONS.map((s) => (
          <div key={s.heading} className="reveal">
            <h2 className="font-display font-bold text-xl">{s.heading}</h2>
            <p className="mt-2 leading-relaxed text-[var(--cream-dim)]">{s.body}</p>
          </div>
        ))}
        <p className="reveal mono-label text-[var(--slate-dim)]">Last updated: [DATE — EDIT]</p>
      </div>
    </PageShell>
  );
}

import React from 'react';
import { Info } from 'lucide-react';
import PageShell from '../components/PageShell';

const SECTIONS = [
  {
    heading: 'Custom, made-to-order work',
    body: 'Because each Terrane map is custom-built for one place and printed a single time, it cannot be resold. For that reason, custom orders are generally not eligible for return once approved and printed. This is why the proof step exists — nothing prints until you approve it. (EDIT)',
  },
  {
    heading: 'The proof protects you',
    body: 'Before anything prints, we send you a final render to review. You can request changes to the crop, scale, and legend at that stage. Approving the proof confirms the design you will receive. (EDIT)',
  },
  {
    heading: 'Damaged or defective orders',
    body: 'If your order arrives damaged, defective, or materially different from the proof you approved, contact us at contact@terranemaps.com within X days of delivery with photos. We will remake or refund it at no cost. (EDIT)',
  },
  {
    heading: 'Cancellations and changes',
    body: 'You may cancel or change your order any time before you approve the proof. Confirm your cancellation window and whether any deposit is non-refundable. (EDIT)',
  },
  {
    heading: 'Refund method and timing',
    body: 'Approved refunds are issued to the original payment method within X business days. Confirm your refund timing here. (EDIT)',
  },
  {
    heading: 'How to start a return or claim',
    body: 'Email contact@terranemaps.com with your order number and a description of the issue. Confirm your full returns process here. (EDIT)',
  },
];

export default function Returns() {
  return (
    <PageShell eyebrow="Policy" title="Returns & Remakes">
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

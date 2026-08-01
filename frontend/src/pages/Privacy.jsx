import React from 'react';
import { Info } from 'lucide-react';
import PageShell from '../components/PageShell';

const SECTIONS = [
  {
    heading: 'Information we collect',
    body: 'We collect the information you give us when you create an account, design a map, or place an order — such as your name, email, shipping address, order details, and the coordinates or places you submit. We also collect basic usage data through our website. Confirm the full list of data collected. (EDIT)',
  },
  {
    heading: 'How we use your information',
    body: 'We use your information to build and ship your order, communicate about it, provide support, and improve our service. We do not resell your custom map file. Confirm all uses here. (EDIT)',
  },
  {
    heading: 'Payments',
    body: 'Payments are processed by our payment provider, [PAYMENT PROCESSOR — EDIT]. We do not store full card numbers on our servers. Confirm your processor and what they handle. (EDIT)',
  },
  {
    heading: 'Sharing with third parties',
    body: 'We share information only with the vendors needed to run our business — for example payment processing, shipping carriers, and email delivery. We do not sell your personal information. List your sub-processors here. (EDIT)',
  },
  {
    heading: 'Cookies and analytics',
    body: 'We use cookies and similar technologies to keep you signed in and understand how the site is used. Confirm your cookie and analytics tools here. (EDIT)',
  },
  {
    heading: 'Your rights and choices',
    body: 'Depending on where you live, you may have the right to access, correct, or delete your personal information. Describe how users can exercise those rights, and address GDPR/CCPA as applicable. (EDIT)',
  },
  {
    heading: 'Data retention and security',
    body: 'We keep your information for as long as needed to provide the service and meet legal obligations, and we take reasonable measures to protect it. Confirm retention periods and security practices here. (EDIT)',
  },
  {
    heading: 'Contact',
    body: 'Questions about this policy can be sent to contact@terranemaps.com. (EDIT)',
  },
];

export default function Privacy() {
  return (
    <PageShell eyebrow="Legal" title="Privacy Policy">
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

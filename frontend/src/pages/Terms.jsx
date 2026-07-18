import React from 'react';
import { Info } from 'lucide-react';
import PageShell from '../components/PageShell';

const SECTIONS = [
  {
    heading: 'Agreement to terms',
    body: 'By using this website and placing an order, you agree to these Terms of Service. If you do not agree, please do not use the site. (EDIT)',
  },
  {
    heading: 'Made-to-order products',
    body: 'Terrane products are custom, made-to-order relief maps built from the place and options you provide. Production begins only after you approve your proof. See our Returns policy for what this means for cancellations and refunds. (EDIT)',
  },
  {
    heading: 'Orders, pricing, and payment',
    body: 'All prices are shown in U.S. dollars. We reserve the right to correct errors and to refuse or cancel orders. Payment is due at checkout through our payment provider. Confirm your ordering and payment terms here. (EDIT)',
  },
  {
    heading: 'The proof and approval process',
    body: 'You are responsible for reviewing your proof for accuracy — including the place, crop, spelling of any custom legend text, and scale — before approving it. Approval authorizes us to print. (EDIT)',
  },
  {
    heading: 'Intellectual property and your content',
    body: 'Terrane retains ownership of its brand, site, and software. Terrain and map data are derived from public datasets subject to their own licenses. You are responsible for any custom text you submit. Confirm content and IP terms here. (EDIT)',
  },
  {
    heading: 'Acceptable use',
    body: 'You agree not to submit unlawful, infringing, or offensive content, and not to misuse the service. We may refuse orders that violate this section. (EDIT)',
  },
  {
    heading: 'Disclaimers and limitation of liability',
    body: 'The service is provided "as is." To the fullest extent permitted by law, Terrane is not liable for indirect or consequential damages, and total liability is limited as described here. Confirm with a professional. (EDIT)',
  },
  {
    heading: 'Governing law and changes',
    body: 'These terms are governed by the laws of [STATE / COUNTRY — EDIT]. We may update these terms and will post the current version on this page. (EDIT)',
  },
  {
    heading: 'Contact',
    body: 'Questions about these terms can be sent to contact@terranemaps.com. (EDIT)',
  },
];

export default function Terms() {
  return (
    <PageShell eyebrow="Legal" title="Terms of Service">
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

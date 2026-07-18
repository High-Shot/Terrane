import React, { useState } from 'react';
import { Mail, Send } from 'lucide-react';
import PageShell from '../components/PageShell';

const SUPPORT_EMAIL = 'contact@terranemaps.com';

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', message: '' });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const subject = encodeURIComponent(`Terrane inquiry from ${form.name || 'a visitor'}`);
    const body = encodeURIComponent(
      `Name: ${form.name}\nEmail: ${form.email}\n\n${form.message}`
    );
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
  };

  const fieldClass =
    'w-full rounded-sm border border-[var(--line-strong)] bg-[var(--bg-1)] px-4 py-3 text-[var(--cream)] placeholder:text-[var(--slate-dim)] outline-none transition-colors focus:border-[var(--rust)]';

  return (
    <PageShell eyebrow="Get in touch" title="Contact us">
      <div className="grid gap-12 lg:grid-cols-[1.2fr_1fr] lg:items-start">
        <form onSubmit={handleSubmit} className="reveal max-w-xl space-y-6">
          <p className="leading-relaxed text-[var(--cream-dim)]">
            Have a question about a place, an order, or a gift? Send us a note and we will get back
            to you. This form opens your email app with the details filled in.
          </p>

          <div>
            <label htmlFor="name" className="mono-label mb-2 block text-[var(--slate)]">
              Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              value={form.name}
              onChange={handleChange}
              placeholder="Your name"
              className={fieldClass}
            />
          </div>

          <div>
            <label htmlFor="email" className="mono-label mb-2 block text-[var(--slate)]">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={form.email}
              onChange={handleChange}
              placeholder="you@example.com"
              className={fieldClass}
            />
          </div>

          <div>
            <label htmlFor="message" className="mono-label mb-2 block text-[var(--slate)]">
              Message
            </label>
            <textarea
              id="message"
              name="message"
              required
              rows={6}
              value={form.message}
              onChange={handleChange}
              placeholder="Tell us about the place, the occasion, or your question."
              className={`${fieldClass} resize-y`}
            />
          </div>

          <button type="submit" className="btn-rust flex items-center gap-2">
            Send message <Send size={16} />
          </button>
        </form>

        <div className="reveal rounded-sm border border-[var(--line)] bg-[var(--bg-1)] p-8">
          <div className="mono-label text-[var(--rust)]">Support</div>
          <p className="mt-4 leading-relaxed text-[var(--cream-dim)]">
            Prefer to email directly? Reach us at:
          </p>
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="mt-4 inline-flex items-center gap-2 font-display font-bold text-lg text-[var(--cream)] transition-colors hover:text-[var(--rust)]"
          >
            <Mail size={18} className="text-[var(--rust)]" />
            {SUPPORT_EMAIL}
          </a>
          <div className="hairline my-7" />
          <p className="text-sm leading-relaxed text-[var(--slate)]">
            OWNER: confirm the support email address and typical response time here. (EDIT)
          </p>
        </div>
      </div>
    </PageShell>
  );
}

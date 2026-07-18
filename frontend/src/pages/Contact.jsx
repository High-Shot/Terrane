import React, { useState } from 'react';
import { Mail, Send, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';
import PageShell from '../components/PageShell';
import { submitContact, getClientId } from '../lib/api';

const SUPPORT_EMAIL = 'contact@terranemaps.com';

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const mailtoHref = () => {
    const subject = encodeURIComponent(`Terrane inquiry from ${form.name || 'a visitor'}`);
    const body = encodeURIComponent(`Name: ${form.name}\nEmail: ${form.email}\n\n${form.message}`);
    return `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await submitContact({ ...form, client_id: getClientId() });
      setSent(true);
      toast.success('Message sent — we’ll be in touch.');
    } catch (error) {
      console.error('Contact submit failed:', error);
      // Never dead-end: fall back to the visitor's own email client.
      toast.error('Could not send just now — opening your email app instead.');
      window.location.href = mailtoHref();
    } finally {
      setBusy(false);
    }
  };

  const fieldClass =
    'w-full rounded-sm border border-[var(--line-strong)] bg-[var(--bg-1)] px-4 py-3 text-[var(--cream)] placeholder:text-[var(--slate-dim)] outline-none transition-colors focus:border-[var(--rust)] disabled:opacity-60';

  return (
    <PageShell eyebrow="Get in touch" title="Contact us">
      <div className="grid gap-12 lg:grid-cols-[1.2fr_1fr] lg:items-start">
        {sent ? (
          <div className="reveal max-w-xl rounded-sm border border-[var(--line)] bg-[var(--bg-1)] p-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[var(--rust)] bg-[var(--rust)]/15">
              <Check size={24} className="text-[var(--rust)]" />
            </div>
            <h2 className="mt-5 font-display text-2xl font-bold">Message sent</h2>
            <p className="mt-3 leading-relaxed text-[var(--cream-dim)]">
              Thanks, {form.name || 'friend'} — we’ve got your note and will reply to{' '}
              <span className="text-[var(--cream)]">{form.email}</span>.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="reveal max-w-xl space-y-6">
            <p className="leading-relaxed text-[var(--cream-dim)]">
              Have a question about a place, an order, or a gift? Send us a note and we’ll get back to you.
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
                disabled={busy}
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
                disabled={busy}
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
                disabled={busy}
                rows={6}
                value={form.message}
                onChange={handleChange}
                placeholder="Tell us about the place, the occasion, or your question."
                className={`${fieldClass} resize-y`}
              />
            </div>

            <button type="submit" disabled={busy} className="btn-rust flex items-center gap-2">
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              {busy ? 'Sending…' : 'Send message'}
            </button>
          </form>
        )}

        <div className="reveal rounded-sm border border-[var(--line)] bg-[var(--bg-1)] p-8">
          <div className="mono-label text-[var(--rust)]">Support</div>
          <p className="mt-4 leading-relaxed text-[var(--cream-dim)]">
            Prefer to email directly? Reach us at:
          </p>
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="mt-4 inline-flex items-center gap-2 font-display text-lg font-bold text-[var(--cream)] transition-colors hover:text-[var(--rust)]"
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

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PayPalScriptProvider, PayPalButtons, usePayPalScriptReducer } from '@paypal/react-paypal-js';
import { Check, Loader2, Mail, AlertTriangle, Package, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { api, getClientId, fetchBuildRequest } from '../lib/api';

const SUPPORT_EMAIL = 'contact@terranemaps.com';

const STEPS = [
  { key: 'requested', title: 'Request received', desc: 'Your place is in the build queue.' },
  { key: 'proof_sent', title: 'Proof ready', desc: 'We emailed a proof for your approval.' },
  { key: 'approved', title: 'Approved & paid', desc: 'You approved the proof — it goes to print.' },
  { key: 'printing', title: 'Printing', desc: 'Your relief map is being printed and finished.' },
  { key: 'shipped', title: 'Shipped', desc: 'On its way to you.' },
];

const isImageUrl = (u) => /\.(png|jpe?g|gif|webp|avif)(\?.*)?$/i.test(String(u || ''));

const fmtDate = (iso) => (iso ? `${String(iso).slice(0, 10)} ${String(iso).slice(11, 16)}` : '');

const Logo = () => (
  <Link to="/" className="flex items-center gap-3">
    <svg width="26" height="26" viewBox="0 0 40 40" fill="none">
      <g stroke="var(--rust)" strokeWidth="1.6" fill="none">
        <path d="M20 6 C11 6 6 12 6 20 C6 28 12 34 20 34 C28 34 34 28 34 20 C34 12 28 6 20 6Z" opacity="0.55" />
        <path d="M20 11 C14 11 11 15 11 20 C11 25 15 29 20 29 C25 29 29 25 29 20 C29 15 25 11 20 11Z" opacity="0.75" />
        <path d="M20 16 C17 16 16 18 16 20 C16 22 18 24 20 24 C22 24 24 22 24 20 C24 18 22 16 20 16Z" />
      </g>
    </svg>
    <span className="font-display font-extrabold tracking-[0.25em] text-[0.95rem]">TERRANE</span>
  </Link>
);

const Shell = ({ children }) => (
  <div className="min-h-screen bg-[var(--bg-0)] text-[var(--cream)] flex flex-col">
    <header className="sticky top-0 z-40 bg-[var(--bg-0)]/90 backdrop-blur-md border-b border-[var(--line)]">
      <div className="container-x h-[64px] flex items-center justify-between">
        <Logo />
        <span className="mono-label text-[var(--slate-dim)]">Build status</span>
      </div>
    </header>
    <div className="container-x py-12 flex-1 w-full">
      <div className="max-w-2xl mx-auto">{children}</div>
    </div>
    <footer className="border-t border-[var(--line)]">
      <div className="container-x py-6 text-center">
        <Link to="/" className="mono-label text-[var(--slate)] hover:text-[var(--rust)] transition-colors">
          terranemaps.com
        </Link>
      </div>
    </footer>
  </div>
);

// Email fallback whenever secure checkout can't be shown — never a dead end.
function ApproveByEmail({ requestId, title, detail }) {
  const subject = encodeURIComponent(`Approve my Terrane map — request ${requestId}`);
  return (
    <div className="rounded-sm border border-[var(--line-strong)] bg-[var(--bg-0)] p-4 text-center">
      <Mail size={18} className="text-[var(--rust)] mx-auto" />
      <div className="text-[var(--cream)] text-sm font-medium mt-2">{title}</div>
      <p className="text-[var(--slate)] text-xs mt-1.5 leading-relaxed">{detail}</p>
      <a href={`mailto:${SUPPORT_EMAIL}?subject=${subject}`} className="btn-rust w-full inline-block mt-4">
        Email us to approve
      </a>
      <div className="mono-label text-[var(--slate-dim)] mt-3">{SUPPORT_EMAIL}</div>
    </div>
  );
}

// Mirrors OrderModal's PayPal wiring: spinner while loading, retry + email
// fallback when the SDK fails, email fallback when the buyer is ineligible.
function PayPalCheckout({ requestId, onCreateOrder, onApproved, onError, onRetry }) {
  const [{ isPending, isRejected }] = usePayPalScriptReducer();

  if (isRejected) {
    return (
      <div className="space-y-2">
        <ApproveByEmail
          requestId={requestId}
          title="Couldn't load secure checkout"
          detail="PayPal didn't load — an ad blocker or network hiccup can cause this. Try again, or email us and we'll send a secure payment link."
        />
        <button onClick={onRetry} className="btn-ghost w-full">Try again</button>
      </div>
    );
  }

  return (
    <div className="relative min-h-[3rem]">
      {isPending && (
        <div className="flex items-center justify-center gap-2 py-4 text-[var(--slate)]">
          <Loader2 className="animate-spin" size={18} /> Loading secure checkout…
        </div>
      )}
      <PayPalButtons
        style={{ layout: 'vertical', color: 'gold', shape: 'rect', label: 'paypal' }}
        createOrder={onCreateOrder}
        onApprove={onApproved}
        onError={onError}
      >
        <ApproveByEmail
          requestId={requestId}
          title="PayPal checkout isn't available"
          detail="We can't show PayPal checkout right now. Email us and we'll help you approve and pay."
        />
      </PayPalButtons>
    </div>
  );
}

function Timeline({ data }) {
  const historyAt = {};
  (data.status_history || []).forEach((h) => {
    if (h && h.status) historyAt[h.status] = h.at;
  });
  if (!historyAt.requested) historyAt.requested = data.created_at;
  const cancelled = data.status === 'cancelled';
  const currentIdx = cancelled ? -1 : STEPS.findIndex((s) => s.key === data.status);

  return (
    <ol className="mt-2">
      {STEPS.map((s, i) => {
        const state = cancelled ? 'future' : i < currentIdx ? 'done' : i === currentIdx ? 'current' : 'future';
        return (
          <li key={s.key} className="relative flex gap-4 pb-7 last:pb-0">
            {i < STEPS.length - 1 && (
              <span className="absolute left-[11px] top-7 bottom-0 w-px bg-[var(--line)]" aria-hidden="true" />
            )}
            <span
              className={`w-6 h-6 rounded-full border shrink-0 flex items-center justify-center mt-0.5 ${
                state === 'done'
                  ? 'border-[var(--rust)] bg-[var(--rust)]/15 text-[var(--rust)]'
                  : state === 'current'
                  ? 'border-[var(--rust)] bg-[var(--rust)]'
                  : 'border-[var(--line-strong)] bg-[var(--bg-0)]'
              }`}
            >
              {state === 'done' && <Check size={13} />}
            </span>
            <div className="min-w-0">
              <div
                className={`font-display font-bold ${
                  state === 'future' ? 'text-[var(--slate-dim)]' : state === 'current' ? 'text-[var(--rust)]' : 'text-[var(--cream)]'
                }`}
              >
                {s.title}
              </div>
              <div className={`text-sm mt-0.5 ${state === 'future' ? 'text-[var(--slate-dim)]' : 'text-[var(--slate)]'}`}>
                {s.desc}
              </div>
              {state !== 'future' && historyAt[s.key] && (
                <div className="mono-label text-[var(--slate-dim)] mt-1">{fmtDate(historyAt[s.key])}</div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export default function RequestStatus() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState(null); // null = loading, false = unavailable, object = /api/config
  const [processing, setProcessing] = useState(false);
  const [justPaid, setJustPaid] = useState(false);
  const [reloadKey, setReloadKey] = useState(0); // remounts the PayPal SDK on retry
  const createdOrderId = useRef(null); // survives the PayPal button's stale render closures

  const load = useCallback(async () => {
    try {
      const doc = await fetchBuildRequest(id);
      setData(doc);
      setNotFound(false);
    } catch (err) {
      if (err?.response?.status === 404) setNotFound(true);
      else toast.error("Couldn't load your request — try again in a moment.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // Payment config only matters while a proof awaits approval.
  const awaitingApproval = data?.status === 'proof_sent';
  useEffect(() => {
    if (!awaitingApproval) return;
    let active = true;
    api
      .get('/config')
      .then((r) => { if (active) setConfig(r.data); })
      .catch(() => { if (active) setConfig(false); });
    return () => { active = false; };
  }, [awaitingApproval]);

  const createBackendOrder = async () => {
    const { data: order } = await api.post('/orders', {
      client_id: getClientId(),
      design: data.design,
      build_request_id: data.id,
    });
    createdOrderId.current = order.order_id;
    return order;
  };

  const handlePayPalApprove = async (ppData) => {
    try {
      setProcessing(true);
      await api.post(`/orders/${createdOrderId.current}/capture`, { paypal_order_id: ppData.orderID });
      api.post('/events', { name: 'proof_approved', path: `/request/${data.id}`, client_id: getClientId() }).catch(() => {});
      setJustPaid(true);
      toast.success("Approved — we're printing your map");
      await load();
    } catch {
      toast.error("We couldn't confirm your payment — please email us before trying again.");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <Shell>
        <div className="flex items-center justify-center py-24 text-[var(--slate)] gap-2">
          <Loader2 className="animate-spin" size={20} /> Loading your request…
        </div>
      </Shell>
    );
  }

  if (notFound || !data) {
    return (
      <Shell>
        <div className="rounded-sm border border-[var(--line-strong)] bg-[var(--bg-1)] p-8 text-center">
          <AlertTriangle size={20} className="text-[var(--rust)] mx-auto" />
          <h1 className="font-display font-bold text-2xl mt-4">We couldn't find that request</h1>
          <p className="text-[var(--slate)] text-sm mt-2 leading-relaxed">
            The link may be incomplete — try copying it straight from your email. If it still doesn't work, we'll sort it out.
          </p>
          <a
            href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Help finding my build request')}`}
            className="btn-rust inline-block mt-6"
          >
            Email us
          </a>
        </div>
      </Shell>
    );
  }

  const d = data.design || {};
  const cancelled = data.status === 'cancelled';
  const price = Number(data.price || 249);
  const changesHref = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`Changes to my Terrane proof — request ${data.id}`)}`;

  return (
    <Shell>
      <div className="mono-label text-[var(--slate-dim)]">Build request · {String(data.id).slice(0, 8)}</div>
      <h1 className="font-display font-black text-[2rem] leading-tight tracking-[-0.01em] mt-2">
        Your Terrane map — {d.name || 'your place'}
      </h1>
      {d.sub && <p className="text-[var(--slate)] mt-1">{d.sub}</p>}
      <p className="text-[var(--slate)] text-sm mt-2">
        8" × 8" relief map · ${price.toFixed(0)} — you only pay once you approve your proof.
      </p>

      {cancelled && (
        <div className="rounded-sm border border-[var(--line-strong)] bg-[var(--bg-1)] p-4 mt-6 flex items-start gap-3">
          <AlertTriangle size={18} className="text-[var(--slate)] shrink-0 mt-0.5" />
          <div>
            <div className="text-[var(--cream)] text-sm font-medium">This request was cancelled.</div>
            <p className="text-[var(--slate)] text-xs mt-1 leading-relaxed">
              If that's a surprise, or you'd like to restart it,{' '}
              <a href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`My cancelled request ${data.id}`)}`} className="text-[var(--rust)] hover:text-[var(--rust-bright)]">
                email us
              </a>{' '}
              and we'll pick it back up.
            </p>
          </div>
        </div>
      )}

      <div className="rounded-sm border border-[var(--line)] bg-[var(--bg-1)] p-6 mt-6">
        <Timeline data={data} />
      </div>

      {awaitingApproval && !justPaid && (
        <div className="rounded-sm border border-[var(--rust)] bg-[var(--rust)]/5 p-6 mt-6">
          <div className="mono-label text-[var(--rust)]">Your proof is ready</div>
          <p className="text-[var(--cream-dim)] text-sm mt-2 leading-relaxed">
            Take a look below. If you love it, approve and pay ${price.toFixed(0)} and we'll start printing. Nothing prints before you say yes.
          </p>

          {data.proof_url && (
            isImageUrl(data.proof_url) ? (
              <img
                src={data.proof_url}
                alt={`Proof of ${d.name || 'your map'}`}
                className="w-full max-h-[440px] object-contain bg-[var(--bg-0)] border border-[var(--line)] rounded-sm mt-4"
              />
            ) : (
              <a href={data.proof_url} target="_blank" rel="noreferrer" className="btn-ghost inline-flex items-center gap-2 mt-4">
                <ExternalLink size={15} /> View your proof
              </a>
            )
          )}

          {data.note && (
            <p className="text-[var(--slate)] text-sm mt-4">
              Note from the workshop: <span className="text-[var(--cream)]">{data.note}</span>
            </p>
          )}

          <div className="hairline my-5" />

          {processing ? (
            <div className="flex items-center justify-center gap-2 py-4 text-[var(--cream)]">
              <Loader2 className="animate-spin" size={18} /> Confirming your payment…
            </div>
          ) : config === null ? (
            <div className="flex items-center justify-center gap-2 py-4 text-[var(--slate)]">
              <Loader2 className="animate-spin" size={18} /> Preparing checkout…
            </div>
          ) : config && config.paypal_enabled && config.paypal_client_id ? (
            <PayPalScriptProvider key={reloadKey} options={{ clientId: config.paypal_client_id, currency: data.currency || 'USD' }}>
              <PayPalCheckout
                requestId={data.id}
                onCreateOrder={async () => {
                  const order = await createBackendOrder();
                  return order.paypal_order_id;
                }}
                onApproved={handlePayPalApprove}
                onError={() => toast.error('PayPal checkout hit an error')}
                onRetry={() => setReloadKey((k) => k + 1)}
              />
            </PayPalScriptProvider>
          ) : (
            <ApproveByEmail
              requestId={data.id}
              title="Approve by email"
              detail="Online payment isn't available right now. Email us to approve your proof and we'll send a secure payment link."
            />
          )}

          <div className="text-center mt-4">
            <a href={changesHref} className="text-[var(--slate)] text-sm hover:text-[var(--rust)] transition-colors">
              Not quite right? Request changes
            </a>
          </div>
        </div>
      )}

      {(justPaid || data.status === 'approved' || data.status === 'printing') && (
        <div className="rounded-sm border border-[var(--line)] bg-[var(--panel-solid)] p-6 mt-6 flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-[var(--rust)]/15 border border-[var(--rust)] flex items-center justify-center shrink-0">
            <Check className="text-[var(--rust)]" size={18} />
          </div>
          <div>
            <div className="font-display font-bold">
              {justPaid ? "Approved — we're printing your map" : data.status === 'printing' ? 'Your map is on the printer' : 'Approved and paid'}
            </div>
            <p className="text-[var(--slate)] text-sm mt-1 leading-relaxed">
              Your proof is approved and paid for. We're printing and finishing your relief map now — we'll email you the moment it ships. Edition 1 of 1, never resold.
            </p>
          </div>
        </div>
      )}

      {data.status === 'shipped' && (
        <div className="rounded-sm border border-[var(--line)] bg-[var(--panel-solid)] p-6 mt-6 flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-[var(--rust)]/15 border border-[var(--rust)] flex items-center justify-center shrink-0">
            <Package className="text-[var(--rust)]" size={18} />
          </div>
          <div>
            <div className="font-display font-bold">Your map has shipped</div>
            <p className="text-[var(--slate)] text-sm mt-1 leading-relaxed">
              It's on its way to you. Thank you for letting us build this one.
            </p>
            {data.tracking_number && (
              <div className="mono-label text-[var(--cream)] mt-3 border border-[var(--line-strong)] rounded-sm px-3 py-2 inline-block select-all">
                Tracking · {data.tracking_number}
              </div>
            )}
          </div>
        </div>
      )}

      <p className="text-[var(--slate-dim)] text-xs mt-8 text-center">
        Questions any time —{' '}
        <a href={`mailto:${SUPPORT_EMAIL}`} className="text-[var(--slate)] hover:text-[var(--rust)] transition-colors">
          {SUPPORT_EMAIL}
        </a>
      </p>
    </Shell>
  );
}

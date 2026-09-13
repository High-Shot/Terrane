import React, { useRef, useState } from "react";
import { PayPalScriptProvider, PayPalButtons, usePayPalScriptReducer } from "@paypal/react-paypal-js";
import { X, Check, Loader2, ShieldCheck, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { api } from "../lib/api";

const SUPPORT_EMAIL = "contact@terranemaps.com";

// A never-a-dead-end fallback: whenever secure checkout can't be shown, the
// customer still gets a clear explanation and a way to complete their order.
function CheckoutUnavailable({ title, detail, onRetry }) {
  return (
    <div className="rounded-sm border border-[var(--line-strong)] bg-[var(--bg-0)] p-4 text-center">
      <AlertTriangle size={18} className="text-[var(--rust)] mx-auto" />
      <div className="text-[var(--cream)] text-sm font-medium mt-2">{title}</div>
      <p className="text-[var(--slate)] text-xs mt-1.5 leading-relaxed">{detail}</p>
      <div className="flex flex-col gap-2 mt-4">
        {onRetry && <button onClick={onRetry} className="btn-rust w-full">Try again</button>}
        <a href={`mailto:${SUPPORT_EMAIL}?subject=Help completing my Terrane order`} className="btn-ghost w-full">
          Email us to finish your order
        </a>
      </div>
    </div>
  );
}

// Renders the PayPal buttons without ever stranding the customer. The PayPal
// SDK can render nothing in three situations — still loading, failed to load,
// or the buyer is ineligible — each of which is handled here explicitly:
//   - loading  -> a spinner (isPending)
//   - rejected -> a retry + contact fallback (isRejected)
//   - ineligible -> a contact fallback (passed as PayPalButtons children,
//                   which the SDK renders only when the button is ineligible)
function PayPalCheckout({ onCreateOrder, onApproved, onError, onRetry }) {
  const [{ isPending, isRejected }] = usePayPalScriptReducer();

  if (isRejected) {
    return (
      <CheckoutUnavailable
        title="Couldn't load secure checkout"
        detail="PayPal didn't load — an ad blocker, browser extension, or network hiccup can cause this. Try again, or email us and we'll send a secure payment link."
        onRetry={onRetry}
      />
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
        style={{ layout: "vertical", color: "gold", shape: "rect", label: "paypal" }}
        createOrder={onCreateOrder}
        onApprove={onApproved}
        onError={onError}
      >
        <CheckoutUnavailable
          title="PayPal checkout isn't available"
          detail="We can't show PayPal checkout for this order right now. Email us and we'll help you complete your purchase."
        />
      </PayPalButtons>
    </div>
  );
}

export default function OrderModal({ open, onClose, design, clientId, config }) {
  const [phase, setPhase] = useState("review"); // review | processing | done
  const [orderRef, setOrderRef] = useState(null);
  const [reloadKey, setReloadKey] = useState(0); // bump to remount the PayPal SDK on retry
  const createdOrderId = useRef(null); // survives the PayPal button's stale render closures
  const paypalEnabled = config?.paypal_enabled;
  const paypalClientId = config?.paypal_client_id;

  if (!open) return null;

  const createBackendOrder = async () => {
    const { data } = await api.post("/orders", { client_id: clientId, design });
    setOrderRef(data);
    createdOrderId.current = data.order_id;
    return data;
  };

  const captureBackendOrder = async (orderId, paypalOrderId) => {
    // client_id proves we're the buyer who created this order — the backend
    // rejects a capture from anyone else.
    const { data } = await api.post(`/orders/${orderId}/capture`, {
      paypal_order_id: paypalOrderId,
      client_id: clientId,
    });
    return data;
  };

  const handleDemoPay = async () => {
    try {
      setPhase("processing");
      const order = await createBackendOrder();
      await captureBackendOrder(order.order_id, null);
      setPhase("done");
    } catch (e) {
      toast.error("Could not place order");
      setPhase("review");
    }
  };

  const handlePayPalApprove = async (data) => {
    try {
      setPhase("processing");
      await captureBackendOrder(createdOrderId.current, data.orderID);
      setPhase("done");
    } catch (e) {
      toast.error("We couldn't confirm your payment — please email us before trying again.");
      setPhase("review");
    }
  };

  const handlePayPalError = () => {
    toast.error("PayPal checkout hit an error");
    setPhase("review");
  };

  const sizeLabel = design.size === "12x16" ? '12" × 16"' : '16" × 20"';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={phase !== "processing" ? onClose : undefined} />
      <div className="relative w-full max-w-md bg-[var(--bg-1)] border border-[var(--line-strong)] rounded-sm p-7">
        {phase !== "processing" && (
          <button onClick={onClose} className="absolute top-5 right-5 z-10 text-[var(--slate)] hover:text-[var(--cream)]"><X size={20} /></button>
        )}

        {phase === "done" ? (
          <div className="text-center py-6">
            <div className="w-14 h-14 rounded-full bg-[var(--rust)]/15 border border-[var(--rust)] flex items-center justify-center mx-auto">
              <Check className="text-[var(--rust)]" size={28} />
            </div>
            <h2 className="font-display font-bold text-2xl mt-5">Order placed</h2>
            <p className="text-[var(--slate)] text-sm mt-3 leading-relaxed">
              A final proof of <span className="text-[var(--cream)]">{design.name}</span> will be emailed before anything prints.
              {orderRef?.demo && " (Demo — no charge was made.)"}
            </p>
            <div className="mono-label text-[var(--slate-dim)] mt-4">Order {String(orderRef?.order_id || "").slice(0, 8)} · Edition 1 of 1</div>
            <button onClick={onClose} className="btn-ghost w-full mt-7">Close</button>
          </div>
        ) : (
          <>
            <h2 className="font-display font-bold text-2xl">Order this map</h2>
            <div className="mt-5 rounded-sm border border-[var(--line)] bg-[var(--panel-solid)] p-4">
              <div className="font-display font-bold">{design.name}</div>
              <div className="text-[var(--slate)] text-sm mt-1">{design.sub || "Made to order"}</div>
              <div className="hairline my-3" />
              <div className="flex justify-between text-sm">
                <span className="text-[var(--slate)]">{sizeLabel} · {design.orientation}</span>
                <span className="font-display font-bold text-lg">$249.00</span>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-4 text-[var(--slate)]">
              <ShieldCheck size={15} className="text-[var(--rust)]" />
              <span className="text-xs">Proof emailed before print · Edition 1 of 1 · Never resold</span>
            </div>

            <div className="mt-6">
              {phase === "processing" ? (
                <div className="flex items-center justify-center gap-2 py-4 text-[var(--cream)]">
                  <Loader2 className="animate-spin" size={18} /> Processing…
                </div>
              ) : paypalEnabled && paypalClientId ? (
                <PayPalScriptProvider key={reloadKey} options={{ clientId: paypalClientId, currency: "USD" }}>
                  <PayPalCheckout
                    onCreateOrder={async () => {
                      const order = await createBackendOrder();
                      return order.paypal_order_id;
                    }}
                    onApproved={handlePayPalApprove}
                    onError={handlePayPalError}
                    onRetry={() => setReloadKey((k) => k + 1)}
                  />
                </PayPalScriptProvider>
              ) : paypalEnabled ? (
                // Enabled server-side but no client id reached the browser — a
                // misconfiguration. Never silently strand the customer.
                <CheckoutUnavailable
                  title="Checkout is temporarily unavailable"
                  detail="We couldn't start secure checkout. Email us and we'll send you a payment link right away."
                />
              ) : (
                <>
                  <button onClick={handleDemoPay} className="btn-rust w-full">Pay $249 · Demo checkout</button>
                  <p className="text-[var(--slate-dim)] text-xs mt-3 text-center">PayPal keys not configured yet — this places a demo order with no charge.</p>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

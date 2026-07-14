import React, { useState } from "react";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { X, Check, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { api } from "../lib/api";

export default function OrderModal({ open, onClose, design, clientId, config }) {
  const [phase, setPhase] = useState("review"); // review | processing | done
  const [orderRef, setOrderRef] = useState(null);
  const paypalEnabled = config?.paypal_enabled;

  if (!open) return null;

  const createBackendOrder = async () => {
    const { data } = await api.post("/orders", { client_id: clientId, design });
    setOrderRef(data);
    return data;
  };

  const captureBackendOrder = async (orderId, paypalOrderId) => {
    const { data } = await api.post(`/orders/${orderId}/capture`, { paypal_order_id: paypalOrderId });
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
              ) : paypalEnabled ? (
                <PayPalScriptProvider options={{ clientId: config.paypal_client_id, currency: "USD" }}>
                  <PayPalButtons
                    style={{ layout: "vertical", color: "gold", shape: "rect", label: "paypal" }}
                    createOrder={async () => {
                      const order = await createBackendOrder();
                      return order.paypal_order_id;
                    }}
                    onApprove={async (data) => {
                      setPhase("processing");
                      await captureBackendOrder(orderRef.order_id, data.orderID);
                      setPhase("done");
                    }}
                    onError={() => { toast.error("PayPal error"); setPhase("review"); }}
                  />
                </PayPalScriptProvider>
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

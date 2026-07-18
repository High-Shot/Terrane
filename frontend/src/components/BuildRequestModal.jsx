import React, { useState, useEffect } from "react";
import { X, Check, Loader2, Hammer, Mail, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import { submitBuildRequest } from "../lib/api";
import { useAuth } from "../lib/AuthContext";

export default function BuildRequestModal({ open, onClose, design, clientId }) {
  const { user } = useAuth();
  const [phase, setPhase] = useState("form"); // form | done
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState(null);

  // Prefill from the logged-in user whenever the modal opens.
  useEffect(() => {
    if (open) {
      setName(user?.name || "");
      setEmail(user?.email || "");
    }
  }, [open, user]);

  if (!open) return null;

  const closeAndReset = () => {
    if (busy) return;
    onClose();
    // Reset for the next open once the modal is closed.
    setPhase("form");
    setMessage("");
    setResult(null);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Add an email so we can send your proof");
      return;
    }
    setBusy(true);
    try {
      const data = await submitBuildRequest({
        client_id: clientId,
        name: name.trim(),
        email: email.trim(),
        message: message.trim(),
        design,
      });
      setResult(data);
      setPhase("done");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Couldn't submit — try again");
    } finally {
      setBusy(false);
    }
  };

  const inputCls = "w-full bg-[var(--bg-0)] border border-[var(--line-strong)] rounded-sm pl-10 pr-4 py-3 text-[var(--cream)] placeholder:text-[var(--slate-dim)] focus:outline-none focus:border-[var(--rust)] transition-colors disabled:opacity-60";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closeAndReset} />
      <div className="relative w-full max-w-md bg-[var(--bg-1)] border border-[var(--line-strong)] rounded-sm p-7">
        {!busy && (
          <button onClick={closeAndReset} aria-label="Close" className="absolute top-5 right-5 z-10 text-[var(--slate)] hover:text-[var(--cream)]"><X size={20} /></button>
        )}

        {phase === "done" ? (
          <div className="text-center py-6">
            <div className="w-14 h-14 rounded-full bg-[var(--rust)]/15 border border-[var(--rust)] flex items-center justify-center mx-auto">
              <Check className="text-[var(--rust)]" size={28} />
            </div>
            <h2 className="font-display font-bold text-2xl mt-5">Your map is on its way to our workshop</h2>
            <p className="text-[var(--slate)] text-sm mt-3 leading-relaxed">
              We'll build your 3D relief render of <span className="text-[var(--cream)]">{design?.name}</span> and email a proof to{" "}
              <span className="text-[var(--cream)]">{email}</span> to approve before anything prints. You only pay once you've said yes.
            </p>
            {result?.request_id && (
              <div className="mono-label text-[var(--slate-dim)] mt-4">Request {String(result.request_id).slice(0, 8)}</div>
            )}
            <button onClick={closeAndReset} className="btn-ghost w-full mt-7">Close</button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-1">
              <Hammer size={18} className="text-[var(--rust)]" />
              <span className="mono-label text-[var(--slate)]">Build request</span>
            </div>
            <h2 className="font-display font-black text-[1.9rem] tracking-[-0.01em] leading-tight">Build my map</h2>

            <div className="mt-5 rounded-sm border border-[var(--line)] bg-[var(--panel-solid)] p-4">
              <div className="font-display font-bold">{design?.name}</div>
              {design?.sub && <div className="text-[var(--slate)] text-sm mt-1">{design.sub}</div>}
              <div className="hairline my-3" />
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--slate)]">8" × 8" relief map</span>
                <span className="font-display font-bold text-lg">$249</span>
              </div>
              <p className="text-[var(--slate-dim)] text-xs mt-2">$249 · you only pay after you approve your proof.</p>
            </div>

            <form onSubmit={submit} className="mt-5 space-y-3">
              <div className="relative">
                <label htmlFor="br-name" className="sr-only">Name</label>
                <UserIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--slate)]" />
                <input id="br-name" value={name} onChange={(e) => setName(e.target.value)} disabled={busy}
                  placeholder="Your name" className={inputCls} />
              </div>
              <div className="relative">
                <label htmlFor="br-email" className="sr-only">Email</label>
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--slate)]" />
                <input id="br-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={busy}
                  placeholder="you@email.com" className={inputCls} />
              </div>
              <div>
                <label htmlFor="br-message" className="sr-only">Message (optional)</label>
                <textarea id="br-message" value={message} onChange={(e) => setMessage(e.target.value)} disabled={busy} rows={3}
                  placeholder="Anything we should know — the reason, a date, a second line for the legend"
                  className="w-full bg-[var(--bg-0)] border border-[var(--line-strong)] rounded-sm px-4 py-3 text-[var(--cream)] placeholder:text-[var(--slate-dim)] text-sm focus:outline-none focus:border-[var(--rust)] transition-colors disabled:opacity-60 resize-none" />
              </div>
              <button type="submit" disabled={busy} className="btn-rust w-full flex items-center justify-center gap-2 mt-1">
                {busy ? <Loader2 size={15} className="animate-spin" /> : <Hammer size={15} />}
                Build my map
              </button>
            </form>

            <div className="mono-label text-[var(--slate-dim)] mt-4 text-center">Final proof emailed before anything prints</div>
          </>
        )}
      </div>
    </div>
  );
}

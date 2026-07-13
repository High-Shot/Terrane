import React, { useState } from "react";
import { X, Loader2, Mail, Lock, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../lib/AuthContext";

export default function AuthModal({ open, onClose, onSuccess }) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState("login"); // login | register
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      let u;
      if (mode === "register") {
        if (name.trim().length < 2) throw { response: { data: { detail: "Please enter your name" } } };
        u = await register({ email, password, name });
      } else {
        u = await login({ email, password });
      }
      toast.success(mode === "register" ? `Welcome, ${u.name}` : `Welcome back, ${u.name}`);
      onSuccess && onSuccess(u);
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const inputCls = "w-full bg-[var(--bg-0)] border border-[var(--line-strong)] rounded-sm pl-10 pr-4 py-3 text-[var(--cream)] placeholder:text-[var(--slate-dim)] focus:outline-none focus:border-[var(--rust)] transition-colors";

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={busy ? undefined : onClose} />
      <div className="relative w-full max-w-md bg-[var(--bg-1)] border border-[var(--line-strong)] rounded-sm p-8">
        <button onClick={onClose} className="absolute top-5 right-5 text-[var(--slate)] hover:text-[var(--cream)]"><X size={20} /></button>

        <div className="flex items-center gap-3 mb-1">
          <svg width="24" height="24" viewBox="0 0 40 40" fill="none">
            <g stroke="var(--rust)" strokeWidth="1.6" fill="none">
              <path d="M20 6 C11 6 6 12 6 20 C6 28 12 34 20 34 C28 34 34 28 34 20 C34 12 28 6 20 6Z" opacity="0.55" />
              <path d="M20 11 C14 11 11 15 11 20 C11 25 15 29 20 29 C25 29 29 25 29 20 C29 15 25 11 20 11Z" opacity="0.75" />
              <path d="M20 16 C17 16 16 18 16 20 C16 22 18 24 20 24 C22 24 24 22 24 20 C24 18 22 16 20 16Z" />
            </g>
          </svg>
          <span className="mono-label text-[var(--slate)]">{mode === "register" ? "Create account" : "Sign in"}</span>
        </div>
        <h2 className="font-display font-black text-[1.9rem] tracking-[-0.01em] leading-tight">
          {mode === "register" ? "Keep every place you frame." : "Welcome back."}
        </h2>
        <p className="text-[var(--slate)] text-sm mt-2">
          {mode === "register" ? "Your designs, routes, and orders, saved to your account." : "Sign in to sync your saved designs and orders."}
        </p>

        <form onSubmit={submit} className="mt-6 space-y-3">
          {mode === "register" && (
            <div className="relative">
              <UserIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--slate)]" />
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className={inputCls} />
            </div>
          )}
          <div className="relative">
            <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--slate)]" />
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" className={inputCls} />
          </div>
          <div className="relative">
            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--slate)]" />
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password (min 6 characters)" className={inputCls} />
          </div>
          <button type="submit" disabled={busy} className="btn-rust w-full flex items-center justify-center gap-2 mt-2">
            {busy && <Loader2 size={15} className="animate-spin" />}
            {mode === "register" ? "Create account" : "Sign in"}
          </button>
        </form>

        <div className="mt-5 text-center text-sm text-[var(--slate)]">
          {mode === "register" ? "Already have an account?" : "New to Terrane?"}{" "}
          <button onClick={() => setMode(mode === "register" ? "login" : "register")} className="text-[var(--rust)] hover:text-[var(--rust-bright)] transition-colors">
            {mode === "register" ? "Sign in" : "Create one"}
          </button>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw, Loader2, ChevronDown, ChevronUp, ExternalLink, Save, ShieldAlert, Lock } from 'lucide-react';
import { toast } from 'sonner';
import AuthModal from '../components/AuthModal';
import { adminListRequests, adminUpdateRequest, adminStats } from '../lib/api';
import { useAuth } from '../lib/AuthContext';

const STATUSES = ['requested', 'proof_sent', 'approved', 'printing', 'shipped', 'cancelled'];

const STATUS_COLORS = {
  requested: '#8299ac', // slate
  proof_sent: '#cd7b41', // rust
  approved: '#7fa066', // green-ish
  printing: '#f2ead6', // cream
  shipped: '#57a05f', // green
  cancelled: '#607585', // dim
};

const statusLabel = (s) => String(s || '').replace(/_/g, ' ');

const fmtDate = (iso) => (iso ? `${String(iso).slice(0, 10)} ${String(iso).slice(11, 16)}` : '—');

function StatusChip({ status, count }) {
  const c = STATUS_COLORS[status] || '#8299ac';
  return (
    <span
      className="mono-label inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm border whitespace-nowrap"
      style={{ color: c, borderColor: `${c}55`, backgroundColor: `${c}14` }}
    >
      {count != null && <span>{count}</span>}
      {statusLabel(status)}
    </span>
  );
}

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

const Header = () => (
  <header className="sticky top-0 z-40 bg-[var(--bg-0)]/90 backdrop-blur-md border-b border-[var(--line)]">
    <div className="container-x h-[64px] flex items-center justify-between">
      <Logo />
      <span className="mono-label text-[var(--slate-dim)]">Fulfillment ops</span>
    </div>
  </header>
);

const inputCls =
  'w-full bg-[var(--bg-0)] border border-[var(--line-strong)] rounded-sm px-3 py-2.5 text-sm text-[var(--cream)] placeholder:text-[var(--slate-dim)] focus:outline-none focus:border-[var(--rust)] transition-colors disabled:opacity-60';

const EVENT_CHIPS = [
  { key: 'studio_opened', label: 'Studio opened' },
  { key: 'build_request_submitted', label: 'Requests submitted' },
  { key: 'pageview', label: 'Pageviews' },
];

function StatsStrip({ stats }) {
  if (!stats) return null;
  const byStatus = stats.requests_by_status || {};
  const totals = stats.event_totals || {};
  return (
    <div className="rounded-sm border border-[var(--line)] bg-[var(--panel-solid)] p-4 flex flex-wrap items-center gap-2">
      {STATUSES.filter((s) => byStatus[s]).map((s) => (
        <StatusChip key={s} status={s} count={byStatus[s]} />
      ))}
      {Object.keys(byStatus).length === 0 && (
        <span className="text-[var(--slate)] text-sm">No requests yet.</span>
      )}
      <span className="hidden sm:block w-px h-5 bg-[var(--line-strong)] mx-1" aria-hidden />
      {EVENT_CHIPS.map(({ key, label }) => (
        <span key={key} className="mono-label text-[var(--slate)] border border-[var(--line)] rounded-sm px-2.5 py-1 whitespace-nowrap">
          <span className="text-[var(--cream)]">{totals[key] || 0}</span> {label} · 30d
        </span>
      ))}
    </div>
  );
}

function RequestRow({ r, expanded, onToggle, edit, setEdit, saving, onSetStatus, onSaveFields }) {
  const d = r.design || {};
  const studioHref = `/studio?lat=${d.lat}&lng=${d.lng}&name=${encodeURIComponent(d.name || '')}`;
  return (
    <div className="data-card rounded-sm border border-[var(--line)] bg-[var(--bg-1)]">
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(); } }}
        className="w-full text-left p-4 flex flex-col md:flex-row md:items-center gap-2 md:gap-4 cursor-pointer"
      >
        <div className="flex-1 min-w-0">
          <div className="font-display font-bold truncate">{d.name || 'Untitled place'}</div>
          <div className="text-[var(--slate)] text-sm truncate">
            {r.name || 'Anonymous'} ·{' '}
            <a
              href={`mailto:${r.email}`}
              onClick={(e) => e.stopPropagation()}
              className="text-[var(--rust)] hover:text-[var(--rust-bright)] transition-colors"
            >
              {r.email}
            </a>
          </div>
        </div>
        <div className="mono-label text-[var(--slate-dim)] whitespace-nowrap">{fmtDate(r.created_at)}</div>
        <StatusChip status={r.status} />
        <span className="text-[var(--slate)] self-start md:self-auto">
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </span>
      </div>

      {expanded && (
        <div className="border-t border-[var(--line)] p-4 space-y-5">
          {r.message && (
            <div>
              <div className="mono-label text-[var(--slate-dim)] mb-1.5">Message</div>
              <p className="text-[var(--cream-dim)] text-sm leading-relaxed whitespace-pre-wrap">{r.message}</p>
            </div>
          )}

          <div>
            <div className="mono-label text-[var(--slate-dim)] mb-1.5">Design</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div><span className="text-[var(--slate)]">Center</span><div className="font-mono text-xs mt-0.5">{d.lat != null ? Number(d.lat).toFixed(5) : '—'}, {d.lng != null ? Number(d.lng).toFixed(5) : '—'}</div></div>
              <div><span className="text-[var(--slate)]">Size</span><div className="mt-0.5">{d.size || '8x8'}</div></div>
              <div><span className="text-[var(--slate)]">Theme</span><div className="mt-0.5">{d.theme || d.style || '—'}</div></div>
              <div><span className="text-[var(--slate)]">Zoom</span><div className="mt-0.5">{d.zoom != null ? Number(d.zoom).toFixed(2) : '—'}</div></div>
            </div>
            {d.bbox != null && (
              <pre className="font-mono text-xs text-[var(--slate)] bg-[var(--bg-0)] border border-[var(--line)] rounded-sm p-3 mt-3 overflow-auto max-h-32">
                {JSON.stringify(d.bbox)}
              </pre>
            )}
            <Link to={studioHref} className="inline-flex items-center gap-1.5 text-[var(--rust)] hover:text-[var(--rust-bright)] transition-colors text-sm mt-3">
              <ExternalLink size={14} /> Open in studio
            </Link>
          </div>

          <div>
            <div className="mono-label text-[var(--slate-dim)] mb-2">Status</div>
            <div className="flex flex-wrap gap-2">
              {STATUSES.map((s) => {
                const active = r.status === s;
                return (
                  <button
                    key={s}
                    disabled={saving || active}
                    onClick={() => onSetStatus(s)}
                    className={`mono-label px-3 py-2 rounded-sm border transition-colors disabled:cursor-default ${
                      active
                        ? 'border-[var(--rust)] text-[var(--rust)] bg-[var(--rust)]/10'
                        : 'border-[var(--line-strong)] text-[var(--slate)] hover:text-[var(--cream)] hover:border-[var(--cream)] disabled:opacity-50'
                    }`}
                  >
                    {statusLabel(s)}
                  </button>
                );
              })}
            </div>
            <p className="text-[var(--slate-dim)] text-xs mt-2">
              Setting a status emails the customer (proof_sent, shipped) or the workshop (approved). Unsaved fields below are included.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="mono-label text-[var(--slate-dim)] block mb-1.5" htmlFor={`proof-${r.id}`}>Proof URL</label>
              <input id={`proof-${r.id}`} value={edit.proof_url} disabled={saving}
                onChange={(e) => setEdit((p) => ({ ...p, proof_url: e.target.value }))}
                placeholder="https://… (image link shown to the customer)" className={inputCls} />
            </div>
            <div>
              <label className="mono-label text-[var(--slate-dim)] block mb-1.5" htmlFor={`track-${r.id}`}>Tracking number</label>
              <input id={`track-${r.id}`} value={edit.tracking_number} disabled={saving}
                onChange={(e) => setEdit((p) => ({ ...p, tracking_number: e.target.value }))}
                placeholder="Carrier tracking number" className={inputCls} />
            </div>
            <div>
              <label className="mono-label text-[var(--slate-dim)] block mb-1.5" htmlFor={`note-${r.id}`}>Note to customer</label>
              <input id={`note-${r.id}`} value={edit.note} disabled={saving}
                onChange={(e) => setEdit((p) => ({ ...p, note: e.target.value }))}
                placeholder="Shown on the status page and in the proof email" className={inputCls} />
            </div>
          </div>
          <button onClick={onSaveFields} disabled={saving} className="btn-rust flex items-center gap-2 !py-2.5 !px-5">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
          </button>

          {(r.status_history || []).length > 0 && (
            <div>
              <div className="mono-label text-[var(--slate-dim)] mb-1.5">History</div>
              <div className="space-y-1">
                {r.status_history.map((h, i) => (
                  <div key={i} className="font-mono text-xs text-[var(--slate)]">
                    {fmtDate(h.at)} — {statusLabel(h.status)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Admin() {
  const { user, ready } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [requests, setRequests] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [edit, setEdit] = useState({ proof_url: '', tracking_number: '', note: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setForbidden(false);
    try {
      const list = await adminListRequests();
      setRequests(Array.isArray(list) ? list : []);
      try {
        setStats(await adminStats());
      } catch {
        /* stats are best-effort */
      }
    } catch (err) {
      if (err?.response?.status === 403) setForbidden(true);
      else toast.error(err?.response?.data?.detail || "Couldn't load build requests");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (ready && user) load();
  }, [ready, user, load]);

  const toggleExpand = (r) => {
    if (expandedId === r.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(r.id);
    setEdit({ proof_url: r.proof_url || '', tracking_number: r.tracking_number || '', note: r.note || '' });
  };

  // Only send fields the admin actually changed, so untouched values are left alone.
  const fieldPatch = (r) => {
    const patch = {};
    if ((r.proof_url || '') !== edit.proof_url) patch.proof_url = edit.proof_url;
    if ((r.tracking_number || '') !== edit.tracking_number) patch.tracking_number = edit.tracking_number;
    if ((r.note || '') !== edit.note) patch.note = edit.note;
    return patch;
  };

  const applyUpdate = async (r, patch) => {
    if (!Object.keys(patch).length) {
      toast('Nothing to save');
      return;
    }
    setSaving(true);
    try {
      const updated = await adminUpdateRequest(r.id, patch);
      setRequests((prev) => prev.map((x) => (x.id === r.id ? updated : x)));
      toast.success(patch.status ? `Marked ${statusLabel(patch.status)}` : 'Saved');
      try {
        setStats(await adminStats());
      } catch {
        /* best-effort */
      }
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  if (!ready) {
    return (
      <div className="min-h-screen bg-[var(--bg-0)] text-[var(--cream)]">
        <Header />
        <div className="flex items-center justify-center py-32 text-[var(--slate)]">
          <Loader2 className="animate-spin" size={20} />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[var(--bg-0)] text-[var(--cream)]">
        <Header />
        <div className="container-x py-24 flex justify-center">
          <div className="w-full max-w-md rounded-sm border border-[var(--line-strong)] bg-[var(--bg-1)] p-8 text-center">
            <Lock size={20} className="text-[var(--rust)] mx-auto" />
            <h1 className="font-display font-bold text-2xl mt-4">Admin sign-in required</h1>
            <p className="text-[var(--slate)] text-sm mt-2 leading-relaxed">
              Sign in with an admin account to manage build requests.
            </p>
            <button onClick={() => setAuthOpen(true)} className="btn-rust w-full mt-6">Sign in</button>
          </div>
        </div>
        <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-0)] text-[var(--cream)]">
      <Header />
      <div className="container-x py-10 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="mono-label text-[var(--rust)]">Admin</div>
            <h1 className="font-display font-bold text-3xl mt-1">Build requests</h1>
          </div>
          <button onClick={load} disabled={loading} className="btn-ghost flex items-center gap-2 !py-2.5 !px-4">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        {forbidden ? (
          <div className="rounded-sm border border-[var(--line-strong)] bg-[var(--bg-1)] p-8 text-center max-w-lg mx-auto">
            <ShieldAlert size={20} className="text-[var(--rust)] mx-auto" />
            <p className="text-[var(--cream)] mt-4">This account isn't an admin.</p>
            <p className="text-[var(--slate)] text-sm mt-2">
              Add your email to <span className="font-mono text-xs text-[var(--cream-dim)]">ADMIN_EMAILS</span> in{' '}
              <span className="font-mono text-xs text-[var(--cream-dim)]">backend/.env</span>.
            </p>
          </div>
        ) : (
          <>
            <StatsStrip stats={stats} />

            {loading && requests.length === 0 ? (
              <div className="flex items-center justify-center py-20 text-[var(--slate)] gap-2">
                <Loader2 className="animate-spin" size={18} /> Loading requests…
              </div>
            ) : requests.length === 0 ? (
              <div className="rounded-sm border border-[var(--line)] bg-[var(--bg-1)] p-10 text-center text-[var(--slate)]">
                No build requests yet.
              </div>
            ) : (
              <div className="space-y-3">
                {requests.map((r) => (
                  <RequestRow
                    key={r.id}
                    r={r}
                    expanded={expandedId === r.id}
                    onToggle={() => toggleExpand(r)}
                    edit={edit}
                    setEdit={setEdit}
                    saving={saving}
                    onSetStatus={(s) => applyUpdate(r, { status: s, ...fieldPatch(r) })}
                    onSaveFields={() => applyUpdate(r, fieldPatch(r))}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

import React from 'react';
import { X, Trash2, Check } from 'lucide-react';
import { fmtLat, fmtLng } from '../../lib/format';

export default function MyDesignsDrawer({ open, onClose, designs, onDelete, onLoad }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[var(--bg-1)] border-l border-[var(--line-strong)] h-full overflow-y-auto p-7">
        <div className="flex items-center justify-between mb-7">
          <h2 className="font-display font-bold text-xl">My Designs</h2>
          <button onClick={onClose} className="text-[var(--slate)] hover:text-[var(--cream)]"><X size={22} /></button>
        </div>
        {designs.length === 0 ? (
          <div className="text-center py-20">
            <div className="mono-label text-[var(--slate-dim)]">No saved designs yet</div>
            <p className="text-[var(--slate)] text-sm mt-3">Frame a place and hit Save to keep it here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {designs.map((d) => (
              <div key={d.id} className="rounded-sm border border-[var(--line)] bg-[var(--panel-solid)] overflow-hidden">
                <div className="h-28 relative">
                  <img src={d.image} alt={d.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent, rgba(11,28,41,0.9))' }} />
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-display font-bold">{d.name}</div>
                      <div className="mono-label text-[var(--rust)] mt-1 !text-[0.6rem]">{fmtLat(d.lat)}, {fmtLng(d.lng)}</div>
                    </div>
                    <button onClick={() => onDelete(d.id)} className="text-[var(--slate)] hover:text-[var(--rust)]"><Trash2 size={16} /></button>
                  </div>
                  <div className="flex items-center gap-3 mt-3 text-[var(--slate)] text-xs">
                    <span className="flex items-center gap-1"><Check size={12} className="text-[var(--rust)]" /> {d.size === '8x8' ? '8\u00d78' : d.size}</span>
                    <span>{d.style}</span>
                  </div>
                  <button onClick={() => onLoad(d)} className="btn-ghost w-full mt-4 !py-2">Load in studio</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

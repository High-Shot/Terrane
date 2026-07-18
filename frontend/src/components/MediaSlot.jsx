import React from 'react';
import { Image as ImageIcon } from 'lucide-react';

/**
 * MediaSlot — a clearly-marked placeholder where the owner drops in a real
 * photo. Renders a dashed box at the given aspect ratio with a caption and a
 * "Replace" tag so it is obvious where each asset goes.
 *
 * Props:
 *   label     - caption text describing the photo that belongs here
 *   ratio     - CSS aspect-ratio value, e.g. '4/3', '1/1', '16/10' (default '4/3')
 *   className - extra classes for layout (margins, width, reveal, etc.)
 */
export default function MediaSlot({ label = 'PHOTO', ratio = '4/3', className = '' }) {
  return (
    <div
      className={`relative flex flex-col items-center justify-center gap-3 rounded-sm border border-dashed border-[var(--line-strong)] bg-[var(--panel-solid)]/40 px-6 text-center ${className}`}
      style={{ aspectRatio: ratio }}
    >
      <span className="absolute right-3 top-3 rounded-sm bg-[var(--rust)] px-2 py-1 mono-label text-[0.55rem] text-[#1a0f06]">
        Replace
      </span>
      <ImageIcon size={26} className="text-[var(--slate-dim)]" />
      <span className="max-w-[85%] mono-label leading-relaxed text-[var(--slate)]">{label}</span>
    </div>
  );
}

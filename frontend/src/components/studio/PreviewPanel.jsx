import React from 'react';
import { Plus, Minus, Info } from 'lucide-react';
import MapPreview from '../MapPreview';
import { fmtLat, fmtLng, printScaleLabel, formatSizeLabel } from '../../lib/format';

export default function PreviewPanel({ place, mode, style, legendName, legendLine2, route, routeColor, mapRef, frame, onFrameChange }) {
  const scaleLabel = printScaleLabel(frame?.bounds);
  const zoomIn = () => mapRef.current && mapRef.current.zoomIn();
  const zoomOut = () => mapRef.current && mapRef.current.zoomOut();

  const stats = [
    ['Center', `${fmtLat(place.lat)}, ${fmtLng(place.lng)}`],
    ['Scale', scaleLabel],
    ['Elev at center', place.elev != null ? `${place.elev} FT` : '—'],
    ['Format', formatSizeLabel()],
  ];

  return (
    <div className="lg:sticky lg:top-[88px] lg:self-start">
      <div className="flex justify-center mb-5">
        <div className="flex items-center gap-2 border border-[var(--line-strong)] rounded-full px-4 py-2">
          <span className="w-2 h-2 rounded-full bg-[var(--rust)] animate-pulse" />
          <span className="mono-label text-[var(--cream)]">Live map preview</span>
        </div>
      </div>

      <div className="mx-auto relative rounded-sm overflow-hidden border border-[var(--line-strong)] bg-[var(--bg-2)] shadow-[0_40px_100px_-40px_rgba(0,0,0,0.9)] max-w-[560px] aspect-square">
        <MapPreview lat={place.lat} lng={place.lng} mode={mode} style={style} mapRef={mapRef}
          routePoints={route?.points} routeColor={routeColor} routeBounds={route?.bounds} onFrameChange={onFrameChange} />
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(180deg, transparent 45%, rgba(11,28,41,0.92))' }} />

        <div className="absolute top-4 right-4 z-[400] flex flex-col rounded-sm overflow-hidden border border-[var(--line-strong)] bg-[var(--bg-0)]/80">
          <button onClick={zoomIn} className="p-2 text-[var(--cream)] hover:bg-[var(--rust)]/20 transition-colors"><Plus size={16} /></button>
          <span className="h-px bg-[var(--line)]" />
          <button onClick={zoomOut} className="p-2 text-[var(--cream)] hover:bg-[var(--rust)]/20 transition-colors"><Minus size={16} /></button>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-6 pointer-events-none z-[400]">
          <div className="font-display font-bold text-2xl leading-tight">{legendName || place.name}</div>
          {(legendLine2 || place.sub) && <div className="text-[var(--slate)] text-sm mt-1">{legendLine2 || place.sub}</div>}
          <div className="font-mono text-[0.72rem] text-[var(--cream-dim)] mt-3 tracking-wide">
            {fmtLat(place.lat)}, {fmtLng(place.lng)} &nbsp; {scaleLabel} &nbsp; USGS 3DEP · NOAA · OSM
          </div>
          <div className="mono-label text-[var(--rust)] mt-3">Edition 1 of 1</div>
        </div>

        <div className="absolute bottom-4 right-4 z-[400] flex items-center gap-1.5 bg-[var(--bg-0)]/85 border border-[var(--line)] rounded-full px-3 py-1.5">
          <Info size={13} className="text-[var(--slate)]" />
          <span className="mono-label text-[var(--slate)] !text-[0.6rem]">{mode === 'streets' ? 'OpenStreetMap' : 'USGS 3DEP, NOAA via Terrain Tiles'}</span>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-x-8 gap-y-3 justify-center">
        {stats.map(([k, v]) => (
          <div key={k} className="text-center">
            <span className="mono-label text-[var(--slate-dim)]">{k} </span>
            <span className="font-mono text-[var(--cream)] text-[0.78rem]">{v}</span>
          </div>
        ))}
      </div>
      <p className="text-center text-[var(--slate-dim)] text-xs mt-5 max-w-2xl mx-auto leading-relaxed">
        A live preview to frame your place. We build your 3D-printed relief from survey elevation data and email a proof for your approval before anything prints.
      </p>
    </div>
  );
}

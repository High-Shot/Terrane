import React, { Suspense, useState } from 'react';
import { Plus, Minus, Compass, Loader2, AlertTriangle } from 'lucide-react';
import { fmtLat, fmtLng, printScaleLabel, formatSizeLabel } from '../../lib/format';

// Lazy-loaded so MapLibre (a large dependency) ships in its own chunk and never
// weighs down the marketing pages, which don't render the studio.
const MapPreview = React.lazy(() => import('../MapPreview'));

export default function PreviewPanel({ place, mode, style, legendName, legendLine2, route, routeColor, mapRef, frame, onFrameChange }) {
  const [mapHealth, setMapHealth] = useState('loading'); // loading | ok | no-tiles
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
          <span className="mono-label text-[var(--cream)]">Live 3D preview</span>
        </div>
      </div>

      <div className="mx-auto relative rounded-sm overflow-hidden border border-[var(--line-strong)] bg-[var(--bg-2)] shadow-[0_40px_100px_-40px_rgba(0,0,0,0.9)] max-w-[560px] aspect-square">
        <Suspense fallback={
          <div className="absolute inset-0 flex items-center justify-center bg-[var(--bg-2)]">
            <Loader2 size={22} className="animate-spin text-[var(--rust)]" />
          </div>
        }>
          <MapPreview lat={place.lat} lng={place.lng} mode={mode} style={style} mapRef={mapRef}
            routePoints={route?.points} routeColor={routeColor} routeBounds={route?.bounds}
            onFrameChange={onFrameChange} onHealth={setMapHealth} />
        </Suspense>
        {mapHealth === 'no-tiles' && (
          <div className="absolute top-4 left-4 right-16 z-[410] flex items-start gap-2 rounded-sm border border-[var(--rust)] bg-[var(--bg-0)]/95 px-3 py-2.5">
            <AlertTriangle size={15} className="text-[var(--rust)] mt-0.5 shrink-0" />
            <span className="text-[var(--cream-dim)] text-xs leading-relaxed">
              Map imagery isn't loading — an ad&#8209;blocker, browser shield, or network filter is likely blocking map servers.
              Try pausing extensions for this site or another network.
            </span>
          </div>
        )}
        {/* Legend legibility scrim — kept light so the 3D terrain still reads. */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(180deg, transparent 60%, rgba(11,28,41,0.85))' }} />

        <div className="absolute top-4 right-4 z-[400] flex flex-col rounded-sm overflow-hidden border border-[var(--line-strong)] bg-[var(--bg-0)]/80">
          <button onClick={zoomIn} aria-label="Zoom in" className="p-2 text-[var(--cream)] hover:bg-[var(--rust)]/20 transition-colors"><Plus size={16} /></button>
          <span className="h-px bg-[var(--line)]" />
          <button onClick={zoomOut} aria-label="Zoom out" className="p-2 text-[var(--cream)] hover:bg-[var(--rust)]/20 transition-colors"><Minus size={16} /></button>
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
          <Compass size={13} className="text-[var(--slate)]" />
          <span className="mono-label text-[var(--slate)] !text-[0.6rem]">Drag to rotate · scroll to zoom</span>
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
        A live 3D preview of your place — terrain, streets, and buildings, the same layers we print. Your final proof is rendered from survey elevation data and emailed for your approval before anything prints.
      </p>
    </div>
  );
}

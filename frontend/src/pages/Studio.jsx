import React, { useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Search, Crosshair, Upload, Plus, Minus, Info, Save, ShoppingCart, X, Trash2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { MAP_STYLES, SAMPLE_PLACES } from '../mock/mock';

const fmtLat = (lat) => `${Math.abs(lat).toFixed(4)} ${lat >= 0 ? 'N' : 'S'}`;
const fmtLng = (lng) => `${Math.abs(lng).toFixed(4)} ${lng >= 0 ? 'E' : 'W'}`;

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

const Segmented = ({ options, value, onChange }) => (
  <div className="flex border border-[var(--line-strong)] rounded-sm overflow-hidden">
    {options.map((o) => (
      <button
        key={o.value}
        onClick={() => onChange(o.value)}
        className={`flex-1 py-2.5 mono-label transition-colors ${
          value === o.value ? 'bg-[var(--rust)]/15 text-[var(--rust)] border-[var(--rust)]' : 'text-[var(--slate)] hover:text-[var(--cream)]'
        }`}
      >
        {o.label}
      </button>
    ))}
  </div>
);

const SectionTitle = ({ n, title }) => (
  <div className="flex items-center gap-3 mb-5">
    <span className="mono-label text-[var(--rust)]">{n}</span>
    <span className="mono-label text-[var(--slate)]">{title}</span>
    <span className="flex-1 h-px bg-[var(--line)]" />
  </div>
);

export default function Studio() {
  const [tab, setTab] = useState('search');
  const [searchQ, setSearchQ] = useState('');
  const [place, setPlace] = useState(SAMPLE_PLACES[0]);
  const [latIn, setLatIn] = useState('');
  const [lngIn, setLngIn] = useState('');
  const [routeColor, setRouteColor] = useState('#cd7b41');

  const [mode, setMode] = useState('relief'); // relief | streets
  const [style, setStyle] = useState('harbor');
  const [size, setSize] = useState('12x16');
  const [orientation, setOrientation] = useState('portrait');

  const [legendName, setLegendName] = useState('Fairhope, Alabama');
  const [legendLine2, setLegendLine2] = useState('');

  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef(null);

  const [showDesigns, setShowDesigns] = useState(false);
  const [designs, setDesigns] = useState(() => {
    try { return JSON.parse(localStorage.getItem('terrane_designs') || '[]'); } catch { return []; }
  });

  const activeStyle = MAP_STYLES.find((s) => s.id === style) || MAP_STYLES[0];
  const scaleRatio = size === '12x16' ? '1 : 24,000' : '1 : 19,300';
  const formatLabel = `${size === '12x16' ? '12" \u00d7 16"' : '16" \u00d7 20"'} ${orientation === 'portrait' ? 'PORTRAIT' : 'LANDSCAPE'}`;
  const isPortrait = orientation === 'portrait';

  const handleSearch = () => {
    if (!searchQ.trim()) { toast.error('Type a place to search'); return; }
    const found = SAMPLE_PLACES.find((p) => p.name.toLowerCase().includes(searchQ.trim().toLowerCase()));
    const chosen = found || { name: searchQ.trim(), sub: 'Custom location', lat: 30 + Math.random() * 15, lng: -(80 + Math.random() * 40), elev: Math.round(100 + Math.random() * 4000) };
    setPlace(chosen);
    setLegendName(chosen.name);
    toast.success(`Framed ${chosen.name}`);
  };

  const handleCoords = () => {
    const la = parseFloat(latIn), ln = parseFloat(lngIn);
    if (isNaN(la) || isNaN(ln)) { toast.error('Enter valid decimal degrees'); return; }
    const chosen = { name: `${fmtLat(la)}, ${fmtLng(ln)}`, sub: 'Custom coordinates', lat: la, lng: ln, elev: Math.round(50 + Math.random() * 3000) };
    setPlace(chosen);
    setLegendName(chosen.name);
    toast.success('Moved to coordinates');
  };

  const handleDrag = useCallback((e) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.x;
    const dy = e.clientY - dragRef.current.y;
    setOffset({ x: dragRef.current.ox + dx, y: dragRef.current.oy + dy });
  }, []);
  const startDrag = (e) => {
    dragRef.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
    window.addEventListener('mousemove', handleDrag);
    window.addEventListener('mouseup', endDrag);
  };
  const endDrag = () => {
    dragRef.current = null;
    window.removeEventListener('mousemove', handleDrag);
    window.removeEventListener('mouseup', endDrag);
  };

  const persist = (list) => { localStorage.setItem('terrane_designs', JSON.stringify(list)); setDesigns(list); };

  const handleSave = () => {
    const design = {
      id: Date.now(), name: legendName || place.name, sub: legendLine2 || place.sub,
      coords: `${fmtLat(place.lat)}, ${fmtLng(place.lng)}`, mode, style, size, orientation,
      elev: place.elev, image: activeStyle.img, savedAt: new Date().toLocaleDateString(),
    };
    persist([design, ...designs]);
    toast.success('Design saved', { description: 'Find it under My Designs.' });
  };

  const handleOrder = () => {
    toast.success('Added to your order \u00b7 $249', {
      description: 'A final proof will be emailed before anything prints. (Demo \u2014 no charge.)',
    });
  };

  const deleteDesign = (id) => { persist(designs.filter((d) => d.id !== id)); };

  return (
    <div className="min-h-screen bg-[var(--bg-0)]">
      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-[var(--bg-0)]/90 backdrop-blur-md border-b border-[var(--line)]">
        <div className="max-w-[1500px] mx-auto px-6 h-[64px] flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-3">
            <button onClick={() => setShowDesigns(true)} className="btn-ghost !py-2 !px-4">My designs {designs.length ? `(${designs.length})` : ''}</button>
            <button onClick={() => toast('Sign in is not wired up in this demo')} className="btn-ghost !py-2 !px-4">Sign in</button>
          </div>
        </div>
      </header>

      <div className="max-w-[1500px] mx-auto px-6 py-8 grid lg:grid-cols-[400px_1fr] gap-8">
        {/* LEFT CONTROL PANEL */}
        <div className="space-y-8">
          <div className="rounded-sm border border-[var(--line)] bg-[var(--panel-solid)] p-7">
            <h1 className="font-display font-black text-[1.8rem] tracking-[-0.01em]">The Studio</h1>
            <p className="text-[var(--slate)] text-sm mt-3 leading-relaxed">
              The lake, the block, the trailhead, the hill you swore was bigger. Point to it, frame it the way you remember it, and see exactly what we will build. Nothing prints until you approve the final render by email.
            </p>
          </div>

          {/* 01 PLACE */}
          <div className="rounded-sm border border-[var(--line)] bg-[var(--panel-solid)] p-7">
            <SectionTitle n="01" title="Place" />
            <Segmented
              value={tab}
              onChange={setTab}
              options={[{ label: 'Search', value: 'search' }, { label: 'Coordinates', value: 'coords' }, { label: 'GPX file', value: 'gpx' }]}
            />

            {tab === 'search' && (
              <div className="mt-5">
                <label className="text-[var(--cream-dim)] text-sm">Address, city, or landmark</label>
                <input
                  value={searchQ} onChange={(e) => setSearchQ(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Fairhope, Alabama"
                  className="w-full mt-2 bg-[var(--bg-0)] border border-[var(--line-strong)] rounded-sm px-4 py-3 text-[var(--cream)] placeholder:text-[var(--slate-dim)] focus:outline-none focus:border-[var(--rust)] transition-colors"
                />
                <div className="flex flex-wrap gap-2 mt-3">
                  {SAMPLE_PLACES.slice(0, 3).map((p) => (
                    <button key={p.name} onClick={() => { setSearchQ(p.name); setPlace(p); setLegendName(p.name); }}
                      className="mono-label text-[var(--slate)] border border-[var(--line)] px-2.5 py-1.5 rounded-sm hover:border-[var(--rust)] hover:text-[var(--rust)] transition-colors">
                      {p.name.split(',')[0]}
                    </button>
                  ))}
                </div>
                <button onClick={handleSearch} className="btn-rust w-full mt-4 flex items-center justify-center gap-2"><Search size={15} /> Find it</button>
              </div>
            )}

            {tab === 'coords' && (
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[var(--cream-dim)] text-sm">Latitude</label>
                  <input value={latIn} onChange={(e) => setLatIn(e.target.value)} placeholder="30.5230"
                    className="w-full mt-2 bg-[var(--bg-0)] border border-[var(--line-strong)] rounded-sm px-4 py-3 text-[var(--cream)] placeholder:text-[var(--slate-dim)] focus:outline-none focus:border-[var(--rust)] transition-colors" />
                </div>
                <div>
                  <label className="text-[var(--cream-dim)] text-sm">Longitude</label>
                  <input value={lngIn} onChange={(e) => setLngIn(e.target.value)} placeholder="-87.9033"
                    className="w-full mt-2 bg-[var(--bg-0)] border border-[var(--line-strong)] rounded-sm px-4 py-3 text-[var(--cream)] placeholder:text-[var(--slate-dim)] focus:outline-none focus:border-[var(--rust)] transition-colors" />
                </div>
                <button onClick={handleCoords} className="btn-rust col-span-2 mt-1 flex items-center justify-center gap-2"><Crosshair size={15} /> Go to coordinates</button>
                <p className="col-span-2 text-[var(--slate-dim)] text-xs">Decimal degrees. South and west are negative.</p>
              </div>
            )}

            {tab === 'gpx' && (
              <div className="mt-5">
                <label className="block border border-dashed border-[var(--line-strong)] rounded-sm p-8 text-center cursor-pointer hover:border-[var(--rust)] transition-colors">
                  <Upload size={22} className="mx-auto text-[var(--rust)]" />
                  <div className="text-[var(--cream-dim)] text-sm mt-3">Drop a GPX file here, or click to choose one</div>
                  <div className="mono-label text-[var(--slate-dim)] mt-2">Strava \u00b7 Garmin \u00b7 Komoot \u00b7 Apple Fitness</div>
                  <input type="file" accept=".gpx" className="hidden" onChange={() => toast.success('Route loaded', { description: 'Every switchback you earned.' })} />
                </label>
                <p className="text-[var(--slate)] text-xs mt-3">Your route is drawn at true position and inlaid into the print. Every switchback you earned.</p>
                <div className="mt-4 flex items-center gap-3">
                  <span className="text-[var(--cream-dim)] text-sm">Route color</span>
                  <input type="color" value={routeColor} onChange={(e) => setRouteColor(e.target.value)} className="w-9 h-9 rounded-sm bg-transparent border border-[var(--line-strong)] cursor-pointer" />
                </div>
              </div>
            )}
          </div>

          {/* 02 FRAME */}
          <div className="rounded-sm border border-[var(--line)] bg-[var(--panel-solid)] p-7">
            <SectionTitle n="02" title="Frame" />
            <Segmented value={mode} onChange={setMode}
              options={[{ label: 'Terrain relief', value: 'relief' }, { label: 'City streets', value: 'streets' }]} />

            <div className="grid grid-cols-3 gap-3 mt-4">
              {MAP_STYLES.map((s) => (
                <button key={s.id} onClick={() => setStyle(s.id)}
                  className={`rounded-sm overflow-hidden border transition-all ${style === s.id ? 'border-[var(--rust)]' : 'border-[var(--line)] hover:border-[var(--line-strong)]'}`}>
                  <div className="h-14 relative">
                    <img src={s.img} alt={s.name} className="w-full h-full object-cover" />
                    <div className="absolute inset-0" style={{ background: s.tint }} />
                  </div>
                  <div className={`mono-label py-1.5 ${style === s.id ? 'text-[var(--rust)]' : 'text-[var(--slate)]'}`}>{s.name}</div>
                </button>
              ))}
            </div>

            <div className="mt-4">
              <Segmented value={size} onChange={setSize}
                options={[{ label: '12" \u00d7 16"', value: '12x16' }, { label: '16" \u00d7 20"', value: '16x20' }]} />
            </div>
            <div className="mt-3">
              <Segmented value={orientation} onChange={setOrientation}
                options={[{ label: 'Portrait', value: 'portrait' }, { label: 'Landscape', value: 'landscape' }]} />
            </div>
            <p className="text-[var(--slate)] text-xs mt-4">Pan and zoom the preview to set your crop. What you frame is what we build.</p>
          </div>

          {/* 03 LEGEND */}
          <div className="rounded-sm border border-[var(--line)] bg-[var(--panel-solid)] p-7">
            <SectionTitle n="03" title="Legend" />
            <label className="text-[var(--cream-dim)] text-sm">Place name on the legend</label>
            <input value={legendName} onChange={(e) => setLegendName(e.target.value)}
              className="w-full mt-2 bg-[var(--bg-0)] border border-[var(--line-strong)] rounded-sm px-4 py-3 text-[var(--cream)] focus:outline-none focus:border-[var(--rust)] transition-colors" />
            <input value={legendLine2} onChange={(e) => setLegendLine2(e.target.value)}
              placeholder="Second line, optional. A date, a name, the reason it matters."
              className="w-full mt-3 bg-[var(--bg-0)] border border-[var(--line-strong)] rounded-sm px-4 py-3 text-[var(--cream)] placeholder:text-[var(--slate-dim)] text-sm focus:outline-none focus:border-[var(--rust)] transition-colors" />
          </div>

          {/* 04 SAVE / ORDER */}
          <div className="rounded-sm border border-[var(--line)] bg-[var(--panel-solid)] p-7">
            <SectionTitle n="04" title="Save or order" />
            <div className="grid grid-cols-2 gap-3">
              <button onClick={handleSave} className="btn-ghost flex items-center justify-center gap-2"><Save size={15} /> Save</button>
              <button onClick={handleOrder} className="btn-rust flex items-center justify-center gap-2"><ShoppingCart size={15} /> Order · $249</button>
            </div>
            <div className="mt-5 space-y-2">
              <div className="mono-label text-[var(--slate-dim)]">Edition 1 of 1 \u00b7 Your file is never resold</div>
              <div className="mono-label text-[var(--slate-dim)]">Final proof emailed before anything prints</div>
            </div>
          </div>
        </div>

        {/* RIGHT PREVIEW */}
        <div className="lg:sticky lg:top-[88px] lg:self-start">
          <div className="flex justify-center mb-5">
            <div className="flex items-center gap-2 border border-[var(--line-strong)] rounded-full px-4 py-2">
              <span className="w-2 h-2 rounded-full bg-[var(--rust)] animate-pulse" />
              <span className="mono-label text-[var(--cream)]">Preview relief in 3D</span>
            </div>
          </div>

          <div className={`mx-auto relative rounded-sm overflow-hidden border border-[var(--line-strong)] bg-[var(--bg-2)] shadow-[0_40px_100px_-40px_rgba(0,0,0,0.9)] ${isPortrait ? 'max-w-[520px] aspect-[3/4]' : 'max-w-[720px] aspect-[4/3]'}`}>
            {/* Map image with pan/zoom */}
            <div className="absolute inset-0 overflow-hidden cursor-grab active:cursor-grabbing" onMouseDown={startDrag}>
              <img
                src={activeStyle.img} alt="preview" draggable={false}
                className="w-full h-full object-cover select-none transition-transform duration-75"
                style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})` }}
              />
              <div className="absolute inset-0 pointer-events-none" style={{ background: activeStyle.tint }} />
              <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(180deg, transparent 45%, rgba(11,28,41,0.92))' }} />
              {mode === 'streets' && (
                <div className="absolute inset-0 pointer-events-none opacity-40" style={{ backgroundImage: 'linear-gradient(rgba(242,234,214,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(242,234,214,0.15) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
              )}
            </div>

            {/* Zoom controls */}
            <div className="absolute top-4 right-4 flex flex-col rounded-sm overflow-hidden border border-[var(--line-strong)] bg-[var(--bg-0)]/80">
              <button onClick={() => setZoom((z) => Math.min(3, +(z + 0.2).toFixed(2)))} className="p-2 text-[var(--cream)] hover:bg-[var(--rust)]/20 transition-colors"><Plus size={16} /></button>
              <span className="h-px bg-[var(--line)]" />
              <button onClick={() => setZoom((z) => Math.max(1, +(z - 0.2).toFixed(2)))} className="p-2 text-[var(--cream)] hover:bg-[var(--rust)]/20 transition-colors"><Minus size={16} /></button>
            </div>

            {/* Legend overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-6 pointer-events-none">
              <div className="font-display font-bold text-2xl leading-tight">{legendName || place.name}</div>
              {(legendLine2 || place.sub) && <div className="text-[var(--slate)] text-sm mt-1">{legendLine2 || place.sub}</div>}
              <div className="font-mono text-[0.72rem] text-[var(--cream-dim)] mt-3 tracking-wide">
                {fmtLat(place.lat)}, {fmtLng(place.lng)} &nbsp; {scaleRatio} &nbsp; USGS 3DEP · NOAA · OSM
              </div>
              <div className="mono-label text-[var(--rust)] mt-3">Edition 1 of 1</div>
            </div>

            <div className="absolute bottom-4 right-4 flex items-center gap-1.5 bg-[var(--bg-0)]/85 border border-[var(--line)] rounded-full px-3 py-1.5">
              <Info size={13} className="text-[var(--slate)]" />
              <span className="mono-label text-[var(--slate)] !text-[0.6rem]">USGS 3DEP, NOAA via Terrain Tiles</span>
            </div>
          </div>

          {/* Info bar */}
          <div className="mt-6 flex flex-wrap gap-x-8 gap-y-3 justify-center">
            {[
              ['Center', `${fmtLat(place.lat)}, ${fmtLng(place.lng)}`],
              ['Scale', scaleRatio],
              ['Elev', `${place.elev} FT`],
              ['Relief in frame', `\u2248${Math.round(place.elev * 1.05)} FT`],
              ['Format', formatLabel],
            ].map(([k, v]) => (
              <div key={k} className="text-center">
                <span className="mono-label text-[var(--slate-dim)]">{k} </span>
                <span className="font-mono text-[var(--cream)] text-[0.78rem]">{v}</span>
              </div>
            ))}
          </div>
          <p className="text-center text-[var(--slate-dim)] text-xs mt-5 max-w-2xl mx-auto leading-relaxed">
            The 3D preview exaggerates relief so it reads on screen. The final proof is rendered from survey-grade elevation data at true scale and emailed for your approval before printing.
          </p>
        </div>
      </div>

      {/* My Designs drawer */}
      {showDesigns && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowDesigns(false)} />
          <div className="relative w-full max-w-md bg-[var(--bg-1)] border-l border-[var(--line-strong)] h-full overflow-y-auto p-7">
            <div className="flex items-center justify-between mb-7">
              <h2 className="font-display font-bold text-xl">My Designs</h2>
              <button onClick={() => setShowDesigns(false)} className="text-[var(--slate)] hover:text-[var(--cream)]"><X size={22} /></button>
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
                          <div className="mono-label text-[var(--rust)] mt-1 !text-[0.6rem]">{d.coords}</div>
                        </div>
                        <button onClick={() => deleteDesign(d.id)} className="text-[var(--slate)] hover:text-[var(--rust)]"><Trash2 size={16} /></button>
                      </div>
                      <div className="flex items-center gap-3 mt-3 text-[var(--slate)] text-xs">
                        <span className="flex items-center gap-1"><Check size={12} className="text-[var(--rust)]" /> {d.size === '12x16' ? '12\u00d716' : '16\u00d720'}</span>
                        <span>{d.orientation}</span>
                        <span>{d.style}</span>
                        <span className="ml-auto">{d.savedAt}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

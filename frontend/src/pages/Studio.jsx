import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Search, Crosshair, Upload, Save, Hammer, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { MAP_STYLES } from '../mock/mock';
import BuildRequestModal from '../components/BuildRequestModal';
import AuthModal from '../components/AuthModal';
import PreviewPanel from '../components/studio/PreviewPanel';
import MyDesignsDrawer from '../components/studio/MyDesignsDrawer';
import useDesigns from '../hooks/useDesigns';
import { api, getClientId, uploadRoute, fetchRoute } from '../lib/api';
import { useAuth } from '../lib/AuthContext';
import { fmtLat, fmtLng } from '../lib/format';

const QUICK = [
  { name: 'Fairhope, Alabama', sub: 'Eastern shore, Mobile Bay', lat: 30.5230, lng: -87.9033 },
  { name: 'Lake Tahoe', sub: 'Sierra Nevada', lat: 39.0968, lng: -120.0324 },
  { name: 'Moab, Utah', sub: 'Colorado Plateau', lat: 38.5733, lng: -109.5498 },
];

// The product is a single 8" × 8" square relief map.
const SIZE = '8x8';
const ORIENTATION = 'square';

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
      <button key={o.value} onClick={() => onChange(o.value)}
        className={`flex-1 py-2.5 mono-label transition-colors ${value === o.value ? 'bg-[var(--rust)]/15 text-[var(--rust)]' : 'text-[var(--slate)] hover:text-[var(--cream)]'}`}>
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
  const clientId = getClientId();
  const mapRef = useRef(null);
  const { user, logout } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);

  const [tab, setTab] = useState('search');
  const [searchQ, setSearchQ] = useState('');
  const [suggests, setSuggests] = useState([]);
  const [searching, setSearching] = useState(false);
  const [place, setPlace] = useState({ name: 'Fairhope, Alabama', sub: 'Eastern shore, Mobile Bay', lat: 30.5230, lng: -87.9033, elev: 141 });
  const [latIn, setLatIn] = useState('');
  const [lngIn, setLngIn] = useState('');
  const [routeColor, setRouteColor] = useState('#cd7b41');
  const [route, setRoute] = useState(null); // { id, name, points, bounds, center, distance_mi, distance_km, point_count }
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const fileInputRef = useRef(null);
  const skipSearchRef = useRef(false); // suppress autocomplete refetch after a programmatic selection
  const searchBoxRef = useRef(null);

  const [mode, setMode] = useState('relief');
  const [style, setStyle] = useState('harbor');
  const [frame, setFrame] = useState(null); // { bounds, zoom, center } — the exact framed view

  const [legendName, setLegendName] = useState('Fairhope, Alabama');
  const [legendLine2, setLegendLine2] = useState('');

  const [showDesigns, setShowDesigns] = useState(false);
  const [buildOpen, setBuildOpen] = useState(false);

  const { designs, loadDesigns, saveDesign, deleteDesign } = useDesigns(clientId, user);

  const activeStyle = MAP_STYLES.find((s) => s.id === style) || MAP_STYLES[0];

  // Fetch elevation whenever place coordinates change
  const fetchElevation = useCallback(async (lat, lng) => {
    try {
      const { data } = await api.get('/elevation', { params: { lat, lng } });
      setPlace((p) => ({ ...p, elev: data.elevation_ft }));
    } catch (error) {
      console.error('Failed to fetch elevation:', error);
      // Non-blocking: keep the previous elevation value rather than interrupting the design flow.
    }
  }, []);
  // Intentionally only re-run on coordinate change; fetchElevation is stable (useCallback with []).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchElevation(place.lat, place.lng); }, [place.lat, place.lng]);

  // Debounced autocomplete
  useEffect(() => {
    if (skipSearchRef.current) { skipSearchRef.current = false; setSuggests([]); return; }
    if (tab !== 'search' || searchQ.trim().length < 3) { setSuggests([]); return; }
    const t = setTimeout(async () => {
      try {
        const { data } = await api.get('/geocode', { params: { q: searchQ.trim() } });
        setSuggests(data.results || []);
      } catch { setSuggests([]); }
    }, 350);
    return () => clearTimeout(t);
  }, [searchQ, tab]);

  // Close suggestions when clicking outside the search box
  useEffect(() => {
    const onDown = (e) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target)) setSuggests([]);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const applyPlace = (p) => {
    skipSearchRef.current = true;
    setPlace({ ...p, elev: place.elev });
    setLegendName(p.name);
    setSuggests([]);
    setSearchQ(p.name);
  };

  const handleSearch = async () => {
    if (!searchQ.trim()) { toast.error('Type a place to search'); return; }
    setSearching(true);
    try {
      const { data } = await api.get('/geocode', { params: { q: searchQ.trim() } });
      if (data.results && data.results.length) {
        applyPlace(data.results[0]);
        toast.success(`Framed ${data.results[0].name}`);
      } else {
        toast.error('No place found — try a different search');
      }
    } catch {
      toast.error('Search failed. Try again.');
    } finally { setSearching(false); }
  };

  const handleCoords = () => {
    const la = parseFloat(latIn), ln = parseFloat(lngIn);
    if (isNaN(la) || isNaN(ln) || la < -90 || la > 90 || ln < -180 || ln > 180) { toast.error('Enter valid decimal degrees'); return; }
    const chosen = { name: `${fmtLat(la)}, ${fmtLng(ln)}`, sub: 'Custom coordinates', lat: la, lng: ln };
    setPlace({ ...chosen, elev: place.elev });
    setLegendName(chosen.name);
    toast.success('Moved to coordinates');
  };

  const handleGpx = async (fileList) => {
    const file = fileList && fileList[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.gpx')) { toast.error('Please choose a .gpx file'); return; }
    setUploading(true);
    setUploadPct(0);
    try {
      const data = await uploadRoute(file, clientId, setUploadPct);
      setRoute(data);
      const [clat, clng] = data.center;
      setPlace((p) => ({ ...p, name: data.name, sub: 'GPX route', lat: clat, lng: clng }));
      setLegendName(data.name);
      toast.success('Route loaded', { description: `${data.distance_mi} mi · ${data.point_count} points. Every switchback you earned.` });
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Could not read that GPX file');
    } finally {
      setUploading(false);
    }
  };

  const clearRoute = () => { setRoute(null); if (fileInputRef.current) fileInputRef.current.value = ''; };

  const currentDesign = () => ({
    client_id: clientId, name: legendName || place.name, sub: legendLine2 || place.sub,
    lat: place.lat, lng: place.lng, mode, style, size: SIZE, orientation: ORIENTATION, elev: place.elev, image: activeStyle.img,
    bbox: frame?.bounds ?? null, zoom: frame?.zoom ?? null, pitch: frame?.pitch ?? null, bearing: frame?.bearing ?? null,
    route_id: route?.id || null, route_color: routeColor,
  });

  const handleSave = () => saveDesign(currentDesign());

  const handleLoadDesign = async (d) => {
    applyPlace({ name: d.name, sub: d.sub, lat: d.lat, lng: d.lng });
    setMode(d.mode); setStyle(d.style);
    setLegendName(d.name); setLegendLine2(d.sub || '');
    if (d.route_color) setRouteColor(d.route_color);
    if (d.route_id) {
      try { const r = await fetchRoute(d.route_id); setRoute(r); setTab('gpx'); }
      catch (error) { console.error('Failed to load route:', error); setRoute(null); }
    } else {
      setRoute(null);
    }
    setShowDesigns(false);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-0)]">
      <header className="sticky top-0 z-40 bg-[var(--bg-0)]/90 backdrop-blur-md border-b border-[var(--line)]">
        <div className="max-w-[1500px] mx-auto px-6 h-[64px] flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-3">
            <button onClick={() => { setShowDesigns(true); loadDesigns(); }} className="btn-ghost !py-2 !px-4">My designs {designs.length ? `(${designs.length})` : ''}</button>
            {user ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 border border-[var(--line-strong)] rounded-sm px-3 py-1.5">
                  <span className="w-6 h-6 rounded-full bg-[var(--rust)] text-[#1a0f06] font-display font-bold text-xs flex items-center justify-center">{user.name.charAt(0).toUpperCase()}</span>
                  <span className="text-[var(--cream)] text-sm max-w-[120px] truncate">{user.name}</span>
                </div>
                <button onClick={() => { logout(); toast('Signed out'); }} className="btn-ghost !py-2 !px-4">Sign out</button>
              </div>
            ) : (
              <button onClick={() => setAuthOpen(true)} className="btn-ghost !py-2 !px-4">Sign in</button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-[1500px] mx-auto px-6 py-8 grid lg:grid-cols-[400px_1fr] gap-8">
        {/* LEFT PANEL */}
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
            <Segmented value={tab} onChange={setTab}
              options={[{ label: 'Search', value: 'search' }, { label: 'Coordinates', value: 'coords' }, { label: 'GPX file', value: 'gpx' }]} />

            {tab === 'search' && (
              <div className="mt-5 relative" ref={searchBoxRef}>
                <label className="text-[var(--cream-dim)] text-sm">Address, city, or landmark</label>
                <input value={searchQ} onChange={(e) => setSearchQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Fairhope, Alabama"
                  className="w-full mt-2 bg-[var(--bg-0)] border border-[var(--line-strong)] rounded-sm px-4 py-3 text-[var(--cream)] placeholder:text-[var(--slate-dim)] focus:outline-none focus:border-[var(--rust)] transition-colors" />
                {suggests.length > 0 && (
                  <div className="absolute left-0 right-0 z-20 mt-1 bg-[var(--bg-1)] border border-[var(--line-strong)] rounded-sm max-h-64 overflow-y-auto shadow-xl">
                    {suggests.map((s) => (
                      <button key={`${s.lat},${s.lng},${s.name}`} onClick={() => applyPlace(s)} className="w-full text-left px-4 py-2.5 hover:bg-[var(--rust)]/10 border-b border-[var(--line)] last:border-0">
                        <div className="text-[var(--cream)] text-sm">{s.name}</div>
                        <div className="text-[var(--slate)] text-xs mt-0.5">{s.sub}</div>
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap gap-2 mt-3">
                  {QUICK.map((p) => (
                    <button key={p.name} onClick={() => applyPlace(p)}
                      className="mono-label text-[var(--slate)] border border-[var(--line)] px-2.5 py-1.5 rounded-sm hover:border-[var(--rust)] hover:text-[var(--rust)] transition-colors">
                      {p.name.split(',')[0]}
                    </button>
                  ))}
                </div>
                <button onClick={handleSearch} disabled={searching} className="btn-rust w-full mt-4 flex items-center justify-center gap-2">
                  {searching ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />} Find it
                </button>
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
                {!route ? (
                  <>
                    <label className="block border border-dashed border-[var(--line-strong)] rounded-sm p-8 text-center cursor-pointer hover:border-[var(--rust)] transition-colors"
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => { e.preventDefault(); handleGpx(e.dataTransfer.files); }}>
                      {uploading ? <Loader2 size={22} className="mx-auto text-[var(--rust)] animate-spin" /> : <Upload size={22} className="mx-auto text-[var(--rust)]" />}
                      <div className="text-[var(--cream-dim)] text-sm mt-3">{uploading ? 'Reading your route…' : 'Drop a GPX file here, or click to choose one'}</div>
                      <div className="mono-label text-[var(--slate-dim)] mt-2">Strava · Garmin · Komoot · Apple Fitness</div>
                      <input ref={fileInputRef} type="file" accept=".gpx" className="hidden" onChange={(e) => handleGpx(e.target.files)} />
                    </label>
                    {uploading && (
                      <div className="mt-3 h-1.5 bg-[var(--bg-0)] rounded-full overflow-hidden">
                        <div className="h-full bg-[var(--rust)] transition-all duration-200" style={{ width: `${uploadPct}%` }} />
                      </div>
                    )}
                    <p className="text-[var(--slate)] text-xs mt-3">Your route is drawn at true position and inlaid into the print. Every switchback you earned.</p>
                  </>
                ) : (
                  <div className="rounded-sm border border-[var(--line-strong)] bg-[var(--bg-0)] p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-display font-bold text-[var(--cream)]">{route.name}</div>
                        <div className="mono-label text-[var(--rust)] mt-1 !text-[0.6rem]">{route.distance_mi} MI · {route.point_count} POINTS</div>
                      </div>
                      <button onClick={clearRoute} className="text-[var(--slate)] hover:text-[var(--rust)]" title="Remove route"><Trash2 size={16} /></button>
                    </div>
                    <div className="mono-label text-[var(--slate-dim)] mt-3 !text-[0.58rem] truncate">{route.original_filename}</div>
                  </div>
                )}
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
            <Segmented value={mode} onChange={setMode} options={[{ label: '3D terrain', value: 'relief' }, { label: 'Top-down', value: 'streets' }]} />
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
            <p className="text-[var(--slate)] text-xs mt-4">Pan, zoom, and drag to rotate or tilt the preview. What you frame — including the 3D angle — is what we build into a single 8" × 8" relief map.</p>
          </div>

          {/* 03 LEGEND */}
          <div className="rounded-sm border border-[var(--line)] bg-[var(--panel-solid)] p-7">
            <SectionTitle n="03" title="Legend" />
            <label className="text-[var(--cream-dim)] text-sm">Place name on the legend</label>
            <input value={legendName} onChange={(e) => setLegendName(e.target.value)}
              className="w-full mt-2 bg-[var(--bg-0)] border border-[var(--line-strong)] rounded-sm px-4 py-3 text-[var(--cream)] focus:outline-none focus:border-[var(--rust)] transition-colors" />
            <input value={legendLine2} onChange={(e) => setLegendLine2(e.target.value)} placeholder="Second line, optional. A date, a name, the reason it matters."
              className="w-full mt-3 bg-[var(--bg-0)] border border-[var(--line-strong)] rounded-sm px-4 py-3 text-[var(--cream)] placeholder:text-[var(--slate-dim)] text-sm focus:outline-none focus:border-[var(--rust)] transition-colors" />
          </div>

          {/* 04 SAVE / BUILD */}
          <div className="rounded-sm border border-[var(--line)] bg-[var(--panel-solid)] p-7">
            <SectionTitle n="04" title="Save or build" />
            <div className="grid grid-cols-2 gap-3">
              <button onClick={handleSave} className="btn-ghost flex items-center justify-center gap-2"><Save size={15} /> Save</button>
              <button onClick={() => setBuildOpen(true)} className="btn-rust flex items-center justify-center gap-2"><Hammer size={15} /> Build my map</button>
            </div>
            <div className="mt-5 space-y-2">
              <div className="mono-label text-[var(--slate-dim)]">No upfront payment · $249, only after you approve</div>
              <div className="mono-label text-[var(--slate-dim)]">Final proof emailed before anything prints</div>
            </div>
          </div>
        </div>

        <PreviewPanel
          place={place}
          mode={mode}
          style={style}
          legendName={legendName}
          legendLine2={legendLine2}
          route={route}
          routeColor={routeColor}
          mapRef={mapRef}
          frame={frame}
          onFrameChange={setFrame}
        />
      </div>

      <MyDesignsDrawer
        open={showDesigns}
        onClose={() => setShowDesigns(false)}
        designs={designs}
        onDelete={deleteDesign}
        onLoad={handleLoadDesign}
      />

      <BuildRequestModal open={buildOpen} onClose={() => setBuildOpen(false)} design={currentDesign()} clientId={clientId} />
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} onSuccess={() => loadDesigns()} />
    </div>
  );
}

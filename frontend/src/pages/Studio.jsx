import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Search, Crosshair, Upload, Save, Hammer, Trash2, Loader2, Download } from 'lucide-react';
import { toast } from 'sonner';
import BuildRequestModal from '../components/BuildRequestModal';
import AuthModal from '../components/AuthModal';
import PreviewPanel from '../components/studio/PreviewPanel';
import MyDesignsDrawer from '../components/studio/MyDesignsDrawer';
import useDesigns from '../hooks/useDesigns';
import { getClientId, uploadRoute, fetchRoute, searchPlaces, fetchElevationFt } from '../lib/api';
import { track } from '../lib/analytics';
import { useAuth } from '../lib/AuthContext';
import { fmtLat, fmtLng, printScaleLabel } from '../lib/format';
import { THEMES, DEFAULT_LAYERS, getTheme } from '../lib/mapThemes';
import { themeSwatchColors } from '../lib/mapStyle';
import { exportPosterPNG, exportPosterPDF } from '../lib/exporters';

const QUICK = [
  { name: 'Fairhope, Alabama', sub: 'Eastern shore, Mobile Bay', lat: 30.5230, lng: -87.9033 },
  { name: 'Lake Tahoe', sub: 'Sierra Nevada', lat: 39.0968, lng: -120.0324 },
  { name: 'Moab, Utah', sub: 'Colorado Plateau', lat: 38.5733, lng: -109.5498 },
];

// The product is a single 8" × 8" square relief map.
const SIZE = '8x8';
const ORIENTATION = 'square';

// Degrees-minutes-seconds, e.g. 30° 31′ 23″ N — used for the export legend.
const fmtDMS = (value, isLat) => {
  const hemi = isLat ? (value >= 0 ? 'N' : 'S') : (value >= 0 ? 'E' : 'W');
  const abs = Math.abs(value);
  let d = Math.floor(abs);
  let mF = (abs - d) * 60;
  let m = Math.floor(mF);
  let s = Math.round((mF - m) * 60);
  if (s === 60) { s = 0; m += 1; }
  if (m === 60) { m = 0; d += 1; }
  return `${d}° ${m}′ ${s}″ ${hemi}`;
};

const slugify = (s) => ((s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'terrane-map');

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

// Switch-style toggle row for the Layers section.
const ToggleRow = ({ label, checked, onChange, indent = false }) => (
  <button type="button" onClick={() => onChange(!checked)} aria-pressed={checked}
    className={`w-full flex items-center justify-between py-2 group ${indent ? 'pl-6' : ''}`}>
    <span className={`text-sm transition-colors group-hover:text-[var(--cream)] ${checked ? 'text-[var(--cream)]' : 'text-[var(--slate)]'}`}>{label}</span>
    <span className={`relative w-9 h-5 rounded-full border shrink-0 transition-colors ${checked ? 'border-[var(--rust)] bg-[var(--rust)]/25' : 'border-[var(--line-strong)] bg-[var(--bg-0)]'}`}>
      <span className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full transition-all ${checked ? 'left-[18px] bg-[var(--rust)]' : 'left-[4px] bg-[var(--slate-dim)]'}`} />
    </span>
  </button>
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
  const [themeId, setThemeId] = useState('harbor');
  const [layers, setLayers] = useState({ ...DEFAULT_LAYERS });
  const [distanceM, setDistanceM] = useState(4000); // half-width of the frame, meters from center to edge
  const [frame, setFrame] = useState(null); // { bounds, zoom, center } — the exact framed view

  const [legendName, setLegendName] = useState('Fairhope, Alabama');
  const [legendLine2, setLegendLine2] = useState('');
  const [dms, setDms] = useState(false); // coordinates format on the export legend

  const [showDesigns, setShowDesigns] = useState(false);
  const [buildOpen, setBuildOpen] = useState(false);
  const [exporting, setExporting] = useState(null); // 'png' | 'pdf' | null

  const { designs, loadDesigns, saveDesign, deleteDesign } = useDesigns(clientId, user);

  const setLayer = (key, val) => setLayers((L) => ({ ...L, [key]: val }));

  // Fetch elevation whenever place coordinates change
  const fetchElevation = useCallback(async (lat, lng) => {
    try {
      const ft = await fetchElevationFt(lat, lng); // backend first, open-meteo direct as fallback
      setPlace((p) => ({ ...p, elev: ft }));
    } catch (error) {
      console.error('Failed to fetch elevation:', error);
      // Non-blocking: keep the previous elevation value rather than interrupting the design flow.
    }
  }, []);
  // Intentionally only re-run on coordinate change; fetchElevation is stable (useCallback with []).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchElevation(place.lat, place.lng); }, [place.lat, place.lng]);

  // Frame distance → refit the map to a bbox spanning ±distanceM around the
  // place center (debounced so dragging the slider doesn't spam fitBounds).
  const distSkipRef = useRef(true); // don't reframe on mount — the map frames itself
  useEffect(() => {
    if (distSkipRef.current) { distSkipRef.current = false; return; }
    const t = setTimeout(() => {
      const map = mapRef.current;
      if (!map) return;
      const lat = place.lat, lng = place.lng;
      const dLat = distanceM / 111320;
      const dLng = distanceM / (111320 * Math.cos((lat * Math.PI) / 180));
      // MapLibre bounds are [[lng, lat], [lng, lat]] = [[west, south], [east, north]].
      map.fitBounds([[lng - dLng, lat - dLat], [lng + dLng, lat + dLat]], { padding: 20, duration: 400 });
    }, 150);
    return () => clearTimeout(t);
    // Reframe only when the distance changes; a place change already flies the map.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [distanceM]);

  // Debounced autocomplete
  useEffect(() => {
    if (skipSearchRef.current) { skipSearchRef.current = false; setSuggests([]); return; }
    if (tab !== 'search' || searchQ.trim().length < 3) { setSuggests([]); return; }
    const t = setTimeout(async () => {
      try {
        const results = await searchPlaces(searchQ.trim());
        setSuggests(results || []);
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

  // One-shot on mount: analytics beacon + deep-link support.
  //
  // Two link shapes are honored:
  //   /studio?lat=..&lng=..&name=..&sub=..  — place pages, framed immediately
  //   /studio?q=<free text>                 — the homepage hero search box,
  //                                           geocoded here on arrival
  //
  // Ref-guarded so it runs exactly once (StrictMode double-invokes effects in
  // dev); malformed params are ignored and the default place stands.
  const bootRef = useRef(false);
  useEffect(() => {
    if (bootRef.current) return;
    bootRef.current = true;
    track('studio_opened');

    let params;
    try {
      params = new URLSearchParams(window.location.search);
    } catch {
      return; // malformed query string — keep the default place
    }

    const lat = parseFloat(params.get('lat'));
    const lng = parseFloat(params.get('lng'));
    if (
      Number.isFinite(lat) && Number.isFinite(lng) &&
      lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
    ) {
      applyPlace({
        name: params.get('name') || `${lat}, ${lng}`,
        sub: params.get('sub') || '',
        lat: +lat,
        lng: +lng,
      });
      return;
    }

    const q = (params.get('q') || '').trim().slice(0, 120);
    if (!q) return;

    // Show the term in the box straight away so the field never looks empty
    // while the geocoder is still working.
    setSearchQ(q);
    setSearching(true);
    let cancelled = false;
    searchPlaces(q)
      .then((results) => {
        if (cancelled) return;
        if (results && results.length) {
          applyPlace(results[0]);
          track('place_searched', { q: q.slice(0, 80), via: 'deeplink' });
          toast.success(`Framed ${results[0].name}`);
        } else {
          toast.error(`No place found for “${q}” — try a different search`);
        }
      })
      .catch(() => {
        if (!cancelled) toast.error('Search failed. Try again.');
      })
      .finally(() => {
        if (!cancelled) setSearching(false);
      });

    return () => { cancelled = true; };
    // Intentionally mount-only; applyPlace identity is irrelevant for a one-shot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = async () => {
    if (!searchQ.trim()) { toast.error('Type a place to search'); return; }
    setSearching(true);
    try {
      const results = await searchPlaces(searchQ.trim());
      if (results && results.length) {
        applyPlace(results[0]);
        track('place_searched', { q: searchQ.trim().slice(0, 80) });
        toast.success(`Framed ${results[0].name}`);
      } else if (results) {
        toast.error('No place found — try a different search');
      } else {
        // null = backend AND direct geocoders unreachable
        toast.error('Search is unreachable — check your connection, or use the Coordinates tab.');
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

  const coordsText = dms
    ? `${fmtDMS(place.lat, true)}, ${fmtDMS(place.lng, false)}`
    : `${fmtLat(place.lat)}, ${fmtLng(place.lng)}`;

  const handleExport = async (kind) => {
    const map = mapRef.current;
    if (!map) { toast.error('The map preview is still loading'); return; }
    setExporting(kind);
    try {
      const opts = {
        map,
        title: legendName || place.name,
        subtitle: legendLine2 || place.sub,
        coordsText,
        scaleText: printScaleLabel(frame?.bounds),
        theme: getTheme(themeId),
        filename: slugify(place.name),
      };
      if (kind === 'pdf') await exportPosterPDF(opts);
      else await exportPosterPNG(opts);
      track('export_download', { format: kind });
      toast.success(kind === 'pdf' ? 'Poster PDF downloaded' : 'Poster PNG downloaded');
    } catch (e) {
      toast.error(e?.message || 'Export failed — try again');
    } finally {
      setExporting(null);
    }
  };

  const currentDesign = () => ({
    client_id: clientId, name: legendName || place.name, sub: legendLine2 || place.sub,
    lat: place.lat, lng: place.lng, mode, style: themeId, theme: themeId, layers, distance_m: distanceM, dms,
    size: SIZE, orientation: ORIENTATION, elev: place.elev, image: '',
    bbox: frame?.bounds ?? null, zoom: frame?.zoom ?? null, pitch: frame?.pitch ?? null, bearing: frame?.bearing ?? null,
    route_id: route?.id || null, route_color: routeColor,
  });

  const handleSave = () => saveDesign(currentDesign());

  const handleLoadDesign = async (d) => {
    applyPlace({ name: d.name, sub: d.sub, lat: d.lat, lng: d.lng });
    setMode(d.mode);
    setThemeId(d.theme || d.style || 'harbor');
    setLayers(d.layers ? { ...DEFAULT_LAYERS, ...d.layers } : { ...DEFAULT_LAYERS });
    if (typeof d.dms === 'boolean') setDms(d.dms);
    if (d.distance_m != null) setDistanceM(d.distance_m);
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
                <label htmlFor="studio-search" className="text-[var(--cream-dim)] text-sm">Address, city, or landmark</label>
                <input id="studio-search" value={searchQ} onChange={(e) => setSearchQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
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
                  <label htmlFor="studio-lat" className="text-[var(--cream-dim)] text-sm">Latitude</label>
                  <input id="studio-lat" value={latIn} onChange={(e) => setLatIn(e.target.value)} placeholder="30.5230"
                    className="w-full mt-2 bg-[var(--bg-0)] border border-[var(--line-strong)] rounded-sm px-4 py-3 text-[var(--cream)] placeholder:text-[var(--slate-dim)] focus:outline-none focus:border-[var(--rust)] transition-colors" />
                </div>
                <div>
                  <label htmlFor="studio-lng" className="text-[var(--cream-dim)] text-sm">Longitude</label>
                  <input id="studio-lng" value={lngIn} onChange={(e) => setLngIn(e.target.value)} placeholder="-87.9033"
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
                  <label htmlFor="studio-route-color" className="text-[var(--cream-dim)] text-sm">Route color</label>
                  <input id="studio-route-color" type="color" value={routeColor} onChange={(e) => setRouteColor(e.target.value)} className="w-9 h-9 rounded-sm bg-transparent border border-[var(--line-strong)] cursor-pointer" />
                </div>
              </div>
            )}
          </div>

          {/* 02 FRAME */}
          <div className="rounded-sm border border-[var(--line)] bg-[var(--panel-solid)] p-7">
            <SectionTitle n="02" title="Frame" />
            <Segmented value={mode} onChange={setMode} options={[{ label: '3D terrain', value: 'relief' }, { label: 'Top-down', value: 'streets' }]} />
            <div className="grid grid-cols-4 gap-2 mt-4">
              {THEMES.map((t) => (
                <button key={t.id} onClick={() => setThemeId(t.id)}
                  className={`rounded-sm overflow-hidden border p-1.5 transition-all ${themeId === t.id ? 'border-[var(--rust)]' : 'border-[var(--line)] hover:border-[var(--line-strong)]'}`}>
                  <span className="flex h-6 rounded-[2px] overflow-hidden">
                    {themeSwatchColors(t).map((c, i) => (
                      <span key={i} className="flex-1" style={{ background: c }} />
                    ))}
                  </span>
                  <span className={`block mono-label pt-1.5 ${themeId === t.id ? 'text-[var(--rust)]' : 'text-[var(--slate)]'}`}>{t.name}</span>
                </button>
              ))}
            </div>
            <div className="mt-5">
              <div className="flex items-baseline justify-between">
                <label className="text-[var(--cream-dim)] text-sm">Frame distance</label>
                <span className="font-mono text-[0.72rem] text-[var(--cream)]">
                  {(distanceM / 1000).toFixed(1)} km · {(distanceM / 1609.344).toFixed(1)} mi
                </span>
              </div>
              <input type="range" min="200" max="50000" step="100" value={distanceM}
                aria-label="Frame distance from center to edge, in meters"
                onChange={(e) => setDistanceM(Number(e.target.value))}
                className="w-full mt-3 accent-[var(--rust)] cursor-pointer" />
            </div>
            <p className="text-[var(--slate)] text-xs mt-4">Pan, zoom, and drag to rotate or tilt the preview. What you frame — including the 3D angle — is what we build into a single 8" × 8" relief map.</p>
          </div>

          {/* 03 LAYERS */}
          <div className="rounded-sm border border-[var(--line)] bg-[var(--panel-solid)] p-7">
            <SectionTitle n="03" title="Layers" />
            <div className="-my-1">
              <ToggleRow label="Water" checked={!!layers.water} onChange={(v) => setLayer('water', v)} />
              <ToggleRow label="Land texture" checked={!!layers.landcover} onChange={(v) => setLayer('landcover', v)} />
              <ToggleRow label="Parks" checked={!!layers.parks} onChange={(v) => setLayer('parks', v)} />
              <ToggleRow label="Buildings" checked={!!layers.buildings} onChange={(v) => setLayer('buildings', v)} />
              <ToggleRow label="Roads" checked={!!layers.roads} onChange={(v) => setLayer('roads', v)} />
              {layers.roads && (
                <>
                  <ToggleRow indent label="Paths & trails" checked={!!layers.roadPath} onChange={(v) => setLayer('roadPath', v)} />
                  <ToggleRow indent label="Small streets" checked={!!layers.roadMinorLow} onChange={(v) => setLayer('roadMinorLow', v)} />
                  <ToggleRow indent label="Road outlines" checked={!!layers.roadOutline} onChange={(v) => setLayer('roadOutline', v)} />
                </>
              )}
              <ToggleRow label="Rail" checked={!!layers.rail} onChange={(v) => setLayer('rail', v)} />
              <ToggleRow label="Aeroways" checked={!!layers.aeroway} onChange={(v) => setLayer('aeroway', v)} />
            </div>
          </div>

          {/* 04 LEGEND */}
          <div className="rounded-sm border border-[var(--line)] bg-[var(--panel-solid)] p-7">
            <SectionTitle n="04" title="Legend" />
            <label htmlFor="studio-legend-name" className="text-[var(--cream-dim)] text-sm">Place name on the legend</label>
            <input id="studio-legend-name" value={legendName} onChange={(e) => setLegendName(e.target.value)}
              className="w-full mt-2 bg-[var(--bg-0)] border border-[var(--line-strong)] rounded-sm px-4 py-3 text-[var(--cream)] focus:outline-none focus:border-[var(--rust)] transition-colors" />
            <input value={legendLine2} onChange={(e) => setLegendLine2(e.target.value)} aria-label="Second legend line (optional)" placeholder="Second line, optional. A date, a name, the reason it matters."
              className="w-full mt-3 bg-[var(--bg-0)] border border-[var(--line-strong)] rounded-sm px-4 py-3 text-[var(--cream)] placeholder:text-[var(--slate-dim)] text-sm focus:outline-none focus:border-[var(--rust)] transition-colors" />
            <div className="mt-4">
              <label className="text-[var(--cream-dim)] text-sm">Coordinates format</label>
              <div className="mt-2">
                <Segmented value={dms ? 'dms' : 'decimal'} onChange={(v) => setDms(v === 'dms')}
                  options={[{ label: 'Decimal', value: 'decimal' }, { label: 'DMS', value: 'dms' }]} />
              </div>
              <div className="font-mono text-[0.72rem] text-[var(--slate-dim)] mt-2">{coordsText}</div>
            </div>
          </div>

          {/* 05 SAVE / BUILD */}
          <div className="rounded-sm border border-[var(--line)] bg-[var(--panel-solid)] p-7">
            <SectionTitle n="05" title="Save or build" />
            <div className="grid grid-cols-2 gap-3">
              <button onClick={handleSave} className="btn-ghost flex items-center justify-center gap-2"><Save size={15} /> Save</button>
              <button onClick={() => setBuildOpen(true)} className="btn-rust flex items-center justify-center gap-2"><Hammer size={15} /> Build my map</button>
            </div>
            <div className="grid grid-cols-[1fr_auto] gap-3 mt-3">
              <button onClick={() => handleExport('png')} disabled={!frame || !!exporting}
                className="btn-ghost flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                {exporting === 'png' ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />} Download preview · PNG
              </button>
              <button onClick={() => handleExport('pdf')} disabled={!frame || !!exporting}
                className="btn-ghost flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                {exporting === 'pdf' ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />} PDF
              </button>
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
          themeId={themeId}
          layers={layers}
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

import React, { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

// The studio preview renders the layers we 3D-print — terrain relief, streets,
// water, and buildings — so a customer sees the physical object they'll receive.
//
// Loading strategy (resilience-first):
//   1. Start from a SELF-CONTAINED raster style (no style JSON to fetch): ESRI
//      shaded relief + OSM streets — the stack the original studio rendered
//      reliably. First paint does not depend on any style-server being up.
//   2. Probe the OpenFreeMap vector style in the background; when reachable,
//      upgrade in place for full vector styling + 3D extruded buildings.
//   3. 3D terrain (AWS terrarium DEM) is applied on top of either base, and is
//      DISABLED automatically if DEM tiles error, so a blocked elevation host
//      can never blank the whole map.
//   4. If no base tile loads at all within the watchdog window, report it via
//      onHealth so the UI can say so instead of showing a silent blank square.
const VECTOR_STYLE_URLS = {
  harbor: "https://tiles.openfreemap.org/styles/liberty",
  chart: "https://tiles.openfreemap.org/styles/bright",
  basalt: "https://tiles.openfreemap.org/styles/positron",
};
const DEM_SOURCE = "terrane-dem";
const TERRAIN_TILES = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png";
const VECTOR_PROBE_TIMEOUT_MS = 4000;
const TILE_WATCHDOG_MS = 7000;

// "relief" = tilted 3D terrain; "streets" = flat top-down.
const exaggerationFor = (mode) => (mode === "streets" ? 0 : 1.4);
const pitchFor = (mode) => (mode === "streets" ? 0 : 55);

// Proven raster stack, embedded so first paint needs no style fetch.
function rasterBaseStyle() {
  return {
    version: 8,
    sources: {
      "terrane-relief": {
        type: "raster",
        tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Shaded_Relief/MapServer/tile/{z}/{y}/{x}"],
        tileSize: 256,
        maxzoom: 13,
        attribution: "USGS 3DEP, NOAA · Esri",
      },
      "terrane-osm": {
        type: "raster",
        tiles: [
          "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
          "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
          "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png",
        ],
        tileSize: 256,
        maxzoom: 19,
        attribution: "© OpenStreetMap contributors",
      },
    },
    layers: [
      { id: "bg", type: "background", paint: { "background-color": "#0e2231" } },
      { id: "relief", type: "raster", source: "terrane-relief" },
      { id: "streets", type: "raster", source: "terrane-osm", paint: { "raster-opacity": 0.55 } },
    ],
  };
}

const firstSymbolId = (map) => {
  const layers = (map.getStyle() && map.getStyle().layers) || [];
  const sym = layers.find((l) => l.type === "symbol");
  return sym ? sym.id : undefined;
};

// Fetch a vector style JSON ourselves (with a hard timeout) so a dead style
// host can never leave MapLibre stuck — we only setStyle once we HAVE the JSON.
async function fetchVectorStyle(styleKey) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), VECTOR_PROBE_TIMEOUT_MS);
  try {
    const r = await fetch(VECTOR_STYLE_URLS[styleKey] || VECTOR_STYLE_URLS.harbor, { signal: ctrl.signal });
    if (!r.ok) throw new Error(`style http ${r.status}`);
    return await r.json();
  } finally {
    clearTimeout(timer);
  }
}

// CRITICAL: with terrain enabled, MapLibre's render pass depends on DEM tiles —
// if the elevation host is unreachable, the WHOLE map renders blank even though
// street/relief tiles load fine. So terrain is only ever enabled after a probe
// proves the DEM host is reachable. Worst case: a flat map that always paints.
let demProbePromise = null;
function probeDem() {
  if (!demProbePromise) {
    demProbePromise = (async () => {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), VECTOR_PROBE_TIMEOUT_MS);
      try {
        const r = await fetch("https://s3.amazonaws.com/elevation-tiles-prod/terrarium/0/0/0.png", { signal: ctrl.signal });
        return r.ok;
      } catch {
        return false;
      } finally {
        clearTimeout(timer);
      }
    })().then((ok) => {
      // eslint-disable-next-line no-console
      if (!ok) console.warn("[Terrane] elevation tiles unreachable — 3D relief disabled, map stays flat");
      return ok;
    });
  }
  return demProbePromise;
}

function applyTerrain(map, exaggeration) {
  if (!map.getSource(DEM_SOURCE)) {
    map.addSource(DEM_SOURCE, {
      type: "raster-dem",
      tiles: [TERRAIN_TILES],
      encoding: "terrarium",
      tileSize: 256,
      maxzoom: 14,
    });
  }
  map.setTerrain(exaggeration > 0 ? { source: DEM_SOURCE, exaggeration } : null);
  if (!map.getLayer("terrane-hillshade")) {
    map.addLayer(
      { id: "terrane-hillshade", type: "hillshade", source: DEM_SOURCE, paint: { "hillshade-exaggeration": 0.4 } },
      firstSymbolId(map)
    );
  }
}

// 3D buildings — only possible on the vector base (OpenMapTiles schema).
function applyBuildings(map) {
  const layers = (map.getStyle() && map.getStyle().layers) || [];
  if (layers.some((l) => l.type === "fill-extrusion")) return;
  if (!map.getSource("openmaptiles")) return;
  map.addLayer(
    {
      id: "terrane-buildings-3d",
      type: "fill-extrusion",
      source: "openmaptiles",
      "source-layer": "building",
      minzoom: 13,
      paint: {
        "fill-extrusion-color": "#46586a",
        "fill-extrusion-height": ["coalesce", ["get", "render_height"], ["get", "height"], 6],
        "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], ["get", "min_height"], 0],
        "fill-extrusion-opacity": 0.92,
      },
    },
    firstSymbolId(map)
  );
}

function applyRoute(map, routePoints, routeColor) {
  const hasRoute = Array.isArray(routePoints) && routePoints.length > 1;
  // GPX points are [lat, lng]; MapLibre wants [lng, lat].
  const data = {
    type: "Feature",
    properties: {},
    geometry: { type: "LineString", coordinates: hasRoute ? routePoints.map(([la, ln]) => [ln, la]) : [] },
  };
  const src = map.getSource("terrane-route");
  if (src) {
    src.setData(data);
  } else {
    map.addSource("terrane-route", { type: "geojson", data });
    map.addLayer({
      id: "terrane-route-casing",
      type: "line",
      source: "terrane-route",
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": "#0b1c29", "line-width": 6, "line-opacity": 0.6 },
    });
    map.addLayer({
      id: "terrane-route-line",
      type: "line",
      source: "terrane-route",
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": routeColor || "#cd7b41", "line-width": 3.5 },
    });
  }
  if (map.getLayer("terrane-route-line")) {
    map.setPaintProperty("terrane-route-line", "line-color", routeColor || "#cd7b41");
  }
}

export default function MapPreview({
  lat,
  lng,
  mode,
  style,
  mapRef,
  routePoints,
  routeColor = "#cd7b41",
  routeBounds,
  onFrameChange,
  onHealth,
}) {
  const containerRef = useRef(null);
  const mapObj = useRef(null);
  const styleRef = useRef(style);
  const vectorOk = useRef(false);
  const demOk = useRef(false);
  const baseTileLoaded = useRef(false);
  const healthRef = useRef("loading");
  const watchdog = useRef(null);
  // Latest props for handlers/closures that persist across renders.
  const stateRef = useRef({ mode, routePoints, routeColor });
  stateRef.current = { mode, routePoints, routeColor };

  const setHealth = (h) => {
    if (healthRef.current === h) return;
    healthRef.current = h;
    if (onHealth) onHealth(h);
  };

  // Init once.
  useEffect(() => {
    if (mapObj.current || !containerRef.current) return undefined;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: rasterBaseStyle(), // instant, dependency-free first style
      center: [lng, lat],
      zoom: 12,
      pitch: pitchFor(mode),
      bearing: 0,
      maxPitch: 75,
      attributionControl: false,
    });
    mapObj.current = map;
    if (mapRef) mapRef.current = map;
    // Top-left keeps required attribution clear of the legend overlay.
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "top-left");

    const emit = () => {
      if (!onFrameChange) return;
      const b = map.getBounds();
      const c = map.getCenter();
      onFrameChange({
        bounds: [[b.getSouth(), b.getWest()], [b.getNorth(), b.getEast()]],
        zoom: map.getZoom(),
        center: [c.lat, c.lng],
        pitch: map.getPitch(),
        bearing: map.getBearing(),
      });
    };

    // Re-apply our layers whenever a style finishes loading (initial raster,
    // vector upgrade, or theme switch — setStyle wipes custom sources/layers).
    // Terrain is gated on the DEM probe — never enabled unless elevation
    // tiles are actually reachable (a failing DEM blanks the entire canvas).
    map.on("style.load", () => {
      probeDem().then((ok) => {
        demOk.current = ok;
        if (ok && mapObj.current && map.isStyleLoaded()) {
          applyTerrain(map, exaggerationFor(stateRef.current.mode));
        }
      });
      applyBuildings(map);
      applyRoute(map, stateRef.current.routePoints, stateRef.current.routeColor);
      emit();
    });

    map.on("error", (e) => {
      // eslint-disable-next-line no-console
      console.warn("[Terrane map]", e && e.sourceId ? `source=${e.sourceId}` : "", (e && e.error && e.error.message) || "unknown");
    });

    // Watchdog: track whether any BASE tile (non-DEM) ever arrives.
    map.on("data", (e) => {
      if (e && e.tile && e.sourceId && e.sourceId !== DEM_SOURCE) {
        baseTileLoaded.current = true;
        setHealth("ok");
      }
    });
    watchdog.current = setTimeout(() => {
      if (!baseTileLoaded.current) {
        // eslint-disable-next-line no-console
        console.warn("[Terrane] no map tiles loaded — a network filter or ad-blocker is likely blocking map servers");
        setHealth("no-tiles");
      }
    }, TILE_WATCHDOG_MS);

    map.on("load", emit);
    map.on("moveend", emit);
    map.on("pitchend", emit);
    map.on("rotateend", emit);

    // Background upgrade to the full vector style (3D buildings) when reachable.
    let cancelled = false;
    fetchVectorStyle(styleRef.current)
      .then((json) => {
        if (cancelled || !mapObj.current) return;
        vectorOk.current = true;
        map.setStyle(json, { diff: false });
      })
      .catch(() => {
        // eslint-disable-next-line no-console
        console.warn("[Terrane] vector base unavailable — staying on the relief basemap");
      });

    const ro = new ResizeObserver(() => map.resize());
    ro.observe(containerRef.current);

    return () => {
      cancelled = true;
      clearTimeout(watchdog.current);
      ro.disconnect();
      map.remove();
      mapObj.current = null;
      if (mapRef) mapRef.current = null;
    };
    // Init is intentionally one-shot; prop changes are handled by the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recenter on place change / fit to a GPX route.
  useEffect(() => {
    const map = mapObj.current;
    if (!map) return;
    if (routeBounds && routeBounds.length === 2) {
      const [[s, w], [n, e]] = routeBounds;
      map.fitBounds([[w, s], [e, n]], { padding: 60, duration: 800 });
    } else {
      map.flyTo({ center: [lng, lat], duration: 800 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng, routeBounds]);

  // Theme switch — try the matching vector style (self-healing even if the
  // first probe failed); if unreachable, keep whatever base is showing.
  useEffect(() => {
    const map = mapObj.current;
    if (!map || styleRef.current === style) return;
    styleRef.current = style;
    fetchVectorStyle(style)
      .then((json) => {
        if (!mapObj.current) return;
        vectorOk.current = true;
        map.setStyle(json, { diff: false });
      })
      .catch(() => {
        // eslint-disable-next-line no-console
        console.warn("[Terrane] vector style unavailable — keeping current basemap");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [style]);

  // 3D terrain vs flat top-down (terrain only when the DEM probe passed).
  useEffect(() => {
    const map = mapObj.current;
    if (!map) return;
    if (demOk.current && map.getSource(DEM_SOURCE)) {
      const ex = exaggerationFor(mode);
      map.setTerrain(ex > 0 ? { source: DEM_SOURCE, exaggeration: ex } : null);
    }
    map.easeTo({ pitch: pitchFor(mode), duration: 600 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // Route change.
  useEffect(() => {
    const map = mapObj.current;
    if (!map || !map.isStyleLoaded()) return;
    applyRoute(map, routePoints, routeColor);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routePoints, routeColor]);

  // Inline position/size: MapLibre's own stylesheet sets `.maplibregl-map
  // { position: relative }` on this element, which overrides utility classes
  // and collapses the div to 0 height (blank, clipped canvas). Inline styles
  // always win, guaranteeing the render target fills the square preview box.
  return <div ref={containerRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", background: "#0e2231" }} />;
}

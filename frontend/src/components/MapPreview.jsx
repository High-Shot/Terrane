import React, { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

// The studio preview renders the same layers we 3D-print — terrain relief,
// streets, water, and extruded buildings — so a customer sees the physical
// object they'll receive. Data is keyless:
//   - Primary base (streets + 3D buildings + water + land): OpenFreeMap hosted
//     vector styles (OpenMapTiles schema, source id "openmaptiles").
//   - Fallback base (if the vector host is unreachable): ESRI shaded-relief +
//     OSM raster tiles — the sources the previous studio used reliably.
//   - Elevation for 3D terrain + hillshade (both bases): AWS "terrarium" DEM.
const STYLE_URLS = {
  harbor: "https://tiles.openfreemap.org/styles/liberty",
  chart: "https://tiles.openfreemap.org/styles/bright",
  basalt: "https://tiles.openfreemap.org/styles/positron",
};
const DEM_SOURCE = "terrane-dem";
const TERRAIN_TILES = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png";
const STYLE_LOAD_FALLBACK_MS = 4000;

const styleUrlFor = (style) => STYLE_URLS[style] || STYLE_URLS.harbor;
// "relief" = tilted 3D terrain; "streets" = flat top-down.
const exaggerationFor = (mode) => (mode === "streets" ? 0 : 1.4);
const pitchFor = (mode) => (mode === "streets" ? 0 : 55);

// Self-contained raster fallback style (no external style JSON to fetch).
function rasterFallbackStyle() {
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
      { id: "streets", type: "raster", source: "terrane-osm", paint: { "raster-opacity": 0.6 } },
    ],
  };
}

const firstSymbolId = (map) => {
  const layers = (map.getStyle() && map.getStyle().layers) || [];
  const sym = layers.find((l) => l.type === "symbol");
  return sym ? sym.id : undefined;
};

// (Re)apply terrain relief + hillshade — works on either base style. setStyle()
// wipes custom sources/layers, so this runs on every style load. Idempotent.
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

// Ensure 3D buildings exist. Liberty already extrudes them; minimal vector
// styles don't, so add our own from the OpenMapTiles building layer.
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
}) {
  const containerRef = useRef(null);
  const mapObj = useRef(null);
  const styleRef = useRef(style);
  const loadedRef = useRef(false);
  const fbTimer = useRef(null);
  // Latest props for handlers/closures that persist across renders.
  const stateRef = useRef({ mode, routePoints, routeColor });
  stateRef.current = { mode, routePoints, routeColor };

  // Init once.
  useEffect(() => {
    if (mapObj.current || !containerRef.current) return undefined;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: styleUrlFor(style),
      center: [lng, lat],
      zoom: 12,
      pitch: pitchFor(mode),
      bearing: 0,
      maxPitch: 75,
      attributionControl: false,
    });
    mapObj.current = map;
    if (mapRef) mapRef.current = map;
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-left");

    const setup = () => {
      applyTerrain(map, exaggerationFor(stateRef.current.mode));
      applyBuildings(map);
      applyRoute(map, stateRef.current.routePoints, stateRef.current.routeColor);
    };

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

    const goRasterFallback = () => {
      if (loadedRef.current || !mapObj.current) return;
      // The vector base didn't load in time (host down / network / blocker).
      // eslint-disable-next-line no-console
      console.warn("[Terrane] vector base map unavailable — using raster relief fallback");
      map.setStyle(rasterFallbackStyle());
    };

    // A style ("style.load") fires only when a style actually finishes loading —
    // for the initial vector style OR the raster fallback. If the vector fetch
    // fails, it never fires and the timer swaps in the raster base.
    map.on("style.load", () => {
      loadedRef.current = true;
      clearTimeout(fbTimer.current);
      setup();
      emit();
    });
    map.on("load", emit);
    map.on("moveend", emit);
    map.on("pitchend", emit);
    map.on("rotateend", emit);
    // eslint-disable-next-line no-console
    map.on("error", (e) => console.warn("[Terrane map]", (e && e.error && e.error.message) || e));

    fbTimer.current = setTimeout(goRasterFallback, STYLE_LOAD_FALLBACK_MS);

    const ro = new ResizeObserver(() => map.resize());
    ro.observe(containerRef.current);

    return () => {
      clearTimeout(fbTimer.current);
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

  // Style/theme change — re-arm the vector-load fallback for the new style.
  useEffect(() => {
    const map = mapObj.current;
    if (!map || styleRef.current === style) return;
    styleRef.current = style;
    loadedRef.current = false;
    map.setStyle(styleUrlFor(style));
    clearTimeout(fbTimer.current);
    fbTimer.current = setTimeout(() => {
      if (!loadedRef.current || !mapObj.current) {
        // eslint-disable-next-line no-console
        console.warn("[Terrane] vector base map unavailable — using raster relief fallback");
        map.setStyle(rasterFallbackStyle(), { diff: false });
      }
    }, STYLE_LOAD_FALLBACK_MS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [style]);

  // 3D terrain vs flat top-down.
  useEffect(() => {
    const map = mapObj.current;
    if (!map) return;
    if (map.getSource(DEM_SOURCE)) {
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

  return <div ref={containerRef} className="absolute inset-0" style={{ background: "#0e2231" }} />;
}

/**
 * mapStyle.js — code-generated MapLibre GL styles for the Terrane map studio.
 *
 * Produces a complete style object (spec version 8) that renders
 * OpenMapTiles-schema vector tiles from MapTiler. Deliberately label-free:
 * no glyphs, no sprite, no symbol layers — a clean poster look that also
 * avoids any font fetching.
 *
 * Pure data module: must NOT import maplibre-gl.
 */

import { DEFAULT_LAYERS, getTheme } from "./mapThemes";

const TILE_URL_TEMPLATE = "https://api.maptiler.com/tiles/v3/{z}/{x}/{y}.pbf?key=";
const ATTRIBUTION = "© MapTiler © OpenStreetMap contributors";

/** Road-fill widths get multiplied by this for the casing (outline) pass. */
const CASING_RATIO = 1.5;

/**
 * Road classification table, in bottom→top draw order.
 *   key     — theme.map.roads color key (underscores become hyphens in ids)
 *   flag    — extra visibility flag required beyond `roads` (optional)
 *   classes — OpenMapTiles "transportation" class values
 *   width   — flat [zoom, px, zoom, px] stops for the fill line
 *   casing  — whether this class gets an outline pass
 */
const ROAD_SPECS = [
  {
    key: "path",
    flag: "roadPath",
    classes: ["path", "pedestrian", "cycleway", "track"],
    width: [12, 0.4, 16, 1.6],
    casing: false,
  },
  {
    key: "minor_low",
    flag: "roadMinorLow",
    classes: ["residential", "service", "living_street", "unclassified", "minor"],
    width: [11, 0.4, 16, 2.2],
    casing: false,
  },
  {
    key: "minor_mid",
    classes: ["tertiary"],
    width: [10, 0.6, 16, 3],
    casing: true,
  },
  {
    key: "minor_high",
    classes: ["primary", "secondary", "trunk"],
    width: [8, 0.8, 16, 4],
    casing: true,
  },
  {
    key: "major",
    classes: ["motorway"],
    width: [7, 1, 16, 5.5],
    casing: true,
  },
];

/** ["interpolate",["linear"],["zoom"], z1, w1, z2, w2, ...] */
function zoomInterpolate(stops) {
  return ["interpolate", ["linear"], ["zoom"], ...stops];
}

/** Same stops with every width scaled (used for casing widths). */
function scaleStops(stops, factor) {
  return stops.map((v, i) => (i % 2 === 1 ? +(v * factor).toFixed(3) : v));
}

/** Filter: feature "class" is one of `classes`. */
function classFilter(classes) {
  return ["match", ["get", "class"], classes, true, false];
}

function roadLayerId(key) {
  return `tr-road-${key.replace(/_/g, "-")}`;
}

/**
 * Generate a complete MapLibre style object.
 *
 * @param {object|string} theme      A theme object from mapThemes (or a theme id).
 * @param {object}        layers     Visibility flags shaped like DEFAULT_LAYERS;
 *                                   a false flag omits those layers entirely.
 *                                   Missing flags fall back to DEFAULT_LAYERS.
 * @param {string}        maptilerKey MapTiler API key for the tile URL.
 * @returns {object} MapLibre GL style (version 8).
 */
export function generateMapStyle(theme, layers, maptilerKey) {
  const t =
    typeof theme === "string"
      ? getTheme(theme)
      : theme && theme.map
        ? theme
        : getTheme();
  const flags = { ...DEFAULT_LAYERS, ...(layers || {}) };
  const m = t.map;
  const styleLayers = [];

  // --- background (always present) ------------------------------------------
  styleLayers.push({
    id: "tr-background",
    type: "background",
    paint: { "background-color": m.land },
  });

  // --- landcover -------------------------------------------------------------
  if (flags.landcover) {
    styleLayers.push({
      id: "tr-landcover",
      type: "fill",
      source: "openmaptiles",
      "source-layer": "landcover",
      paint: {
        "fill-color": m.landcover,
        "fill-opacity": 0.7,
        "fill-antialias": false,
      },
    });
  }

  // --- parks -----------------------------------------------------------------
  if (flags.parks) {
    styleLayers.push({
      id: "tr-parks",
      type: "fill",
      source: "openmaptiles",
      "source-layer": "park",
      paint: {
        "fill-color": m.parks,
        "fill-opacity": 0.75,
      },
    });
  }

  // --- water + waterways -----------------------------------------------------
  if (flags.water) {
    styleLayers.push({
      id: "tr-water",
      type: "fill",
      source: "openmaptiles",
      "source-layer": "water",
      paint: { "fill-color": m.water },
    });
    styleLayers.push({
      id: "tr-waterway",
      type: "line",
      source: "openmaptiles",
      "source-layer": "waterway",
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": m.waterway,
        "line-width": zoomInterpolate([8, 0.5, 14, 2]),
      },
    });
  }

  // --- aeroway (runways / taxiways) -----------------------------------------
  if (flags.aeroway) {
    styleLayers.push({
      id: "tr-aeroway",
      type: "line",
      source: "openmaptiles",
      "source-layer": "aeroway",
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": m.aeroway,
        "line-width": zoomInterpolate([10, 1, 14, 4]),
        "line-opacity": 0.85,
      },
    });
  }

  // --- buildings -------------------------------------------------------------
  if (flags.buildings) {
    styleLayers.push({
      id: "tr-buildings",
      type: "fill",
      source: "openmaptiles",
      "source-layer": "building",
      minzoom: 13,
      paint: {
        "fill-color": m.buildings,
        "fill-opacity": 0.85,
      },
    });
  }

  // --- roads -----------------------------------------------------------------
  if (flags.roads) {
    // Casing pass first, so every outline sits under every road fill.
    if (flags.roadOutline) {
      for (const spec of ROAD_SPECS) {
        if (!spec.casing) continue;
        styleLayers.push({
          id: `tr-road-casing-${spec.key.replace(/_/g, "-")}`,
          type: "line",
          source: "openmaptiles",
          "source-layer": "transportation",
          filter: classFilter(spec.classes),
          layout: { "line-cap": "round", "line-join": "round" },
          paint: {
            "line-color": m.roads.outline,
            "line-width": zoomInterpolate(scaleStops(spec.width, CASING_RATIO)),
          },
        });
      }
    }

    // Road fills, minor→major so bigger roads draw on top.
    for (const spec of ROAD_SPECS) {
      if (spec.flag && !flags[spec.flag]) continue;
      styleLayers.push({
        id: roadLayerId(spec.key),
        type: "line",
        source: "openmaptiles",
        "source-layer": "transportation",
        filter: classFilter(spec.classes),
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": m.roads[spec.key],
          "line-width": zoomInterpolate(spec.width),
        },
      });
    }
  }

  // --- rail ------------------------------------------------------------------
  if (flags.rail) {
    styleLayers.push({
      id: "tr-rail",
      type: "line",
      source: "openmaptiles",
      "source-layer": "transportation",
      filter: classFilter(["rail", "transit"]),
      layout: { "line-join": "round" },
      paint: {
        "line-color": m.rail,
        "line-width": zoomInterpolate([10, 0.5, 16, 1.5]),
        "line-dasharray": [2, 1.6],
      },
    });
  }

  return {
    version: 8,
    name: `Terrane — ${t.name}`,
    // No glyphs / sprite on purpose: label-free poster style, zero font fetches.
    sources: {
      openmaptiles: {
        type: "vector",
        tiles: [TILE_URL_TEMPLATE + (maptilerKey || "")],
        maxzoom: 14,
        attribution: ATTRIBUTION,
      },
    },
    layers: styleLayers,
  };
}

/**
 * Four representative hexes for UI swatch chips: [land, water, major road, parks].
 */
export function themeSwatchColors(theme) {
  const t =
    typeof theme === "string"
      ? getTheme(theme)
      : theme && theme.map
        ? theme
        : getTheme();
  return [t.map.land, t.map.water, t.map.roads.major, t.map.parks];
}

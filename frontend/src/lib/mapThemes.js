/**
 * mapThemes.js — Terrane poster map themes.
 *
 * Each theme is pure data consumed by the style generator (mapStyle.js) and by
 * the poster exporters (exporters.js). Key names are a stable contract:
 *
 *   {
 *     id, name,
 *     ui:  { bg, text },                       // poster background + text color
 *     map: {
 *       land, landcover, water, waterway,
 *       parks, buildings, aeroway, rail,
 *       roads: { major, minor_high, minor_mid, minor_low, path, outline }
 *     }
 *   }
 *
 * All colors are 6-digit hex. Water and land stay clearly distinguishable in
 * every theme so coastlines always read on the printed poster.
 */

export const THEMES = [
  {
    // Terrane signature: deep navy harbor water, warm cream land, rust arterials.
    id: "harbor",
    name: "Harbor",
    ui: { bg: "#0b1b28", text: "#f2ead6" },
    map: {
      land: "#f2ead6",
      landcover: "#e9dfc6",
      water: "#0e2231",
      waterway: "#1d3a50",
      parks: "#ddd6b2",
      buildings: "#e4d9bd",
      aeroway: "#d9cfb3",
      rail: "#b3a78c",
      roads: {
        major: "#cd7b41",
        minor_high: "#a08059",
        minor_mid: "#b39a75",
        minor_low: "#c6b592",
        path: "#d3c5a6",
        outline: "#faf4e4",
      },
    },
  },
  {
    // Light nautical chart: pale paper, soundings-blue water, fine gray line work.
    id: "chart",
    name: "Chart",
    ui: { bg: "#f2ecdc", text: "#3c4c55" },
    map: {
      land: "#f7f3e8",
      landcover: "#efe9d6",
      water: "#a9c8d6",
      waterway: "#93b9cb",
      parks: "#e2e5cc",
      buildings: "#e9e1cc",
      aeroway: "#ddd6c0",
      rail: "#b7b09d",
      roads: {
        major: "#5f6b70",
        minor_high: "#7d8890",
        minor_mid: "#98a1a6",
        minor_low: "#b3babc",
        path: "#c7ccc9",
        outline: "#ffffff",
      },
    },
  },
  {
    // Dark monochrome basalt: near-black land, charcoal water, rust motorways.
    id: "basalt",
    name: "Basalt",
    ui: { bg: "#0b0c0d", text: "#e8e6e1" },
    map: {
      land: "#101113",
      landcover: "#16181a",
      water: "#1d2126",
      waterway: "#272c32",
      parks: "#171c18",
      buildings: "#1a1c1f",
      aeroway: "#232629",
      rail: "#3b3f44",
      roads: {
        major: "#cd7b41",
        minor_high: "#9aa0a6",
        minor_mid: "#71777d",
        minor_low: "#4b5055",
        path: "#3a3f44",
        outline: "#0a0b0c",
      },
    },
  },
  {
    // Muted sage greens over soft cream.
    id: "sage",
    name: "Sage",
    ui: { bg: "#3d4b3f", text: "#f0eee0" },
    map: {
      land: "#f0eee0",
      landcover: "#e2e4ca",
      water: "#7d9c8d",
      waterway: "#6f9080",
      parks: "#ccd5ae",
      buildings: "#e2ddc6",
      aeroway: "#d6d3ba",
      rail: "#a8a68c",
      roads: {
        major: "#5c6b52",
        minor_high: "#79856c",
        minor_mid: "#939c83",
        minor_low: "#aeb49c",
        path: "#c2c6ae",
        outline: "#f8f6ea",
      },
    },
  },
  {
    // Classic blueprint: cyanotype blue ground, white and pale-blue linework.
    id: "blueprint",
    name: "Blueprint",
    ui: { bg: "#0e2c56", text: "#eaf2fc" },
    map: {
      land: "#163a6e",
      landcover: "#1a4078",
      water: "#0e2c56",
      waterway: "#2a568f",
      parks: "#1d4680",
      buildings: "#26528d",
      aeroway: "#3f6aa4",
      rail: "#6f93c4",
      roads: {
        major: "#ffffff",
        minor_high: "#dce8f7",
        minor_mid: "#b9cfea",
        minor_low: "#8fb0d9",
        path: "#6f96c8",
        outline: "#0e2c56",
      },
    },
  },
  {
    // Pure black-and-white, maximum contrast.
    id: "noir",
    name: "Noir",
    ui: { bg: "#000000", text: "#ffffff" },
    map: {
      land: "#ffffff",
      landcover: "#f4f4f4",
      water: "#000000",
      waterway: "#1a1a1a",
      parks: "#ececec",
      buildings: "#e0e0e0",
      aeroway: "#d9d9d9",
      rail: "#8c8c8c",
      roads: {
        major: "#000000",
        minor_high: "#1f1f1f",
        minor_mid: "#3d3d3d",
        minor_low: "#616161",
        path: "#8a8a8a",
        outline: "#ffffff",
      },
    },
  },
  {
    // Warm clay and earth tones; deep terracotta water against pale sand.
    id: "terracotta",
    name: "Terracotta",
    ui: { bg: "#6f3423", text: "#f4e7d3" },
    map: {
      land: "#f4e7d3",
      landcover: "#ecdabf",
      water: "#a65538",
      waterway: "#b8674a",
      parks: "#e0d2a9",
      buildings: "#e6d3b8",
      aeroway: "#d9c4a6",
      rail: "#b09277",
      roads: {
        major: "#843b24",
        minor_high: "#a06a4a",
        minor_mid: "#b3886a",
        minor_low: "#c7a98c",
        path: "#d5bda2",
        outline: "#faf0e0",
      },
    },
  },
  {
    // Cool alpine grays and ice blues with dark pine parks.
    id: "alpine",
    name: "Alpine",
    ui: { bg: "#24333c", text: "#edf2f4" },
    map: {
      land: "#eef1f2",
      landcover: "#e2e8e9",
      water: "#93b8c8",
      waterway: "#7fa9bc",
      parks: "#4f6a58",
      buildings: "#d3dade",
      aeroway: "#c8d1d5",
      rail: "#8e9aa0",
      roads: {
        major: "#35505c",
        minor_high: "#5b7280",
        minor_mid: "#7e929c",
        minor_low: "#a3b2b9",
        path: "#bcc7cc",
        outline: "#f8fafb",
      },
    },
  },
];

/**
 * Default layer-visibility flags for the studio. A false flag means the style
 * generator omits those layers entirely from the produced style.
 */
export const DEFAULT_LAYERS = {
  water: true,
  landcover: true,
  parks: true,
  buildings: true,
  roads: true,
  rail: true,
  aeroway: false,
  roadPath: true,
  roadMinorLow: true,
  roadOutline: true,
};

/**
 * Look up a theme by id. Unknown / missing ids fall back to the signature
 * theme (THEMES[0], "harbor") so callers always get a valid theme.
 */
export function getTheme(id) {
  return THEMES.find((t) => t.id === id) || THEMES[0];
}

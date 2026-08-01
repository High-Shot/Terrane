// Coordinate formatting helpers shared across the studio.
export const fmtLat = (lat) => `${Math.abs(lat).toFixed(4)} ${lat >= 0 ? 'N' : 'S'}`;
export const fmtLng = (lng) => `${Math.abs(lng).toFixed(4)} ${lng >= 0 ? 'E' : 'W'}`;

// The product is a single 8" × 8" square relief map.
export const formatSizeLabel = () => '8" × 8"';

// Ground width (east-west, in meters) covered by the framed bounds, measured at
// the center latitude. bounds is [[south, west], [north, east]].
export function groundWidthMeters(bounds) {
  if (!bounds || bounds.length !== 2) return null;
  const [[south, west], [north, east]] = bounds;
  if ([south, west, north, east].some((v) => typeof v !== 'number' || isNaN(v))) return null;
  const R = 6371000; // Earth radius in meters
  const midLat = ((south + north) / 2) * (Math.PI / 180);
  const dLng = (east - west) * (Math.PI / 180);
  return Math.abs(R * dLng * Math.cos(midLat));
}

// A true-scale ratio for the physical print, e.g. "≈ 1 : 24,300".
// Rounds to a sensible round number. Returns "—" when bounds are missing.
export function printScaleLabel(bounds, physicalInches = 8) {
  const ground = groundWidthMeters(bounds);
  if (!ground || ground <= 0) return '—';
  const physicalMeters = physicalInches * 0.0254;
  const ratio = ground / physicalMeters;
  // Round to a sensible number of significant figures for a clean ratio.
  let rounded;
  if (ratio >= 100000) rounded = Math.round(ratio / 5000) * 5000;
  else if (ratio >= 10000) rounded = Math.round(ratio / 100) * 100;
  else if (ratio >= 1000) rounded = Math.round(ratio / 50) * 50;
  else rounded = Math.round(ratio / 10) * 10;
  return `≈ 1 : ${rounded.toLocaleString('en-US')}`;
}

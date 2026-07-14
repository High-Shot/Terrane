// Coordinate formatting helpers shared across the studio.
export const fmtLat = (lat) => `${Math.abs(lat).toFixed(4)} ${lat >= 0 ? 'N' : 'S'}`;
export const fmtLng = (lng) => `${Math.abs(lng).toFixed(4)} ${lng >= 0 ? 'E' : 'W'}`;

export const scaleForSize = (size) => (size === '12x16' ? '1 : 24,000' : '1 : 19,300');
export const formatLabel = (size, orientation) =>
  `${size === '12x16' ? '12" \u00d7 16"' : '16" \u00d7 20"'} ${orientation === 'portrait' ? 'PORTRAIT' : 'LANDSCAPE'}`;

import React, { useId, useMemo } from 'react';
import { heightField, contourAt, toPath, padFraction, formatCoords } from '../lib/terrain';

/**
 * Plate — a framed contour rendering of a place, with the printed legend.
 *
 * This is the site's primary visual unit. It replaced the stock photography the
 * homepage used to lean on: for a product whose whole claim is "this is your
 * actual ground, measured", borrowed mountain photos undercut the pitch.
 *
 * The contours are illustrative (see lib/terrain.js) — the caption says so
 * wherever a plate could be mistaken for a photograph of the finished object.
 *
 * Props:
 *   place    - display name, e.g. 'Fairhope, Alabama'
 *   sub      - secondary line, e.g. 'Eastern shore, Mobile Bay'
 *   lat/lng  - decimal degrees; rendered to 4dp in the legend
 *   scale    - printed scale ratio string
 *   edition  - edition line (default '1 of 1')
 *   relief   - 0..1, flat coastal → steep mountain country
 *   seed     - override the terrain seed (defaults to `place`)
 *   legend   - show the legend block (default true)
 *   route    - draw an illustrative GPX-style track
 *   className
 */
export default function Plate({
  place,
  sub,
  lat,
  lng,
  scale = '1 : 24,000',
  edition = '1 of 1',
  relief = 0.5,
  seed,
  legend = true,
  route = false,
  className = '',
}) {
  const uid = useId().replace(/:/g, '');
  const S = 400; // SVG user-space size; the element itself scales fluidly.

  const { water, bands, routePath, crop } = useMemo(() => {
    const hf = heightField(seed || place || 'terrane', 96, relief);

    // The field carries a padded rim (see lib/terrain.js). Scale the padded
    // grid up and shift it so only the inner window lands inside the viewBox.
    const p = padFraction(hf);
    const k = 1 / (1 - 2 * p);
    const cropTransform = `translate(${(-k * p * S).toFixed(2)} ${(-k * p * S).toFixed(2)}) scale(${k.toFixed(4)})`;

    const waterLevel = 0.17;
    const waterLines = contourAt(hf, waterLevel);

    // Twelve contour intervals above the waterline. Every fourth is an index
    // contour, drawn heavier — the convention on a USGS quadrangle.
    const levels = [];
    const count = 12;
    for (let i = 1; i <= count; i += 1) {
      const t = i / (count + 1);
      levels.push({
        level: waterLevel + t * (1 - waterLevel),
        t,
        index: i % 4 === 0,
      });
    }

    const built = levels.map(({ level, t, index }) => ({
      d: toPath(contourAt(hf, level), S, 4),
      t,
      index,
    }));

    let rp = null;
    if (route) {
      // Stands in for an uploaded GPX track. Layered sines rather than a single
      // arc, so it wanders like a trail instead of reading as a drawn curve.
      const pts = [];
      for (let i = 0; i <= 48; i += 1) {
        const u = i / 48;
        const x = 0.1 + u * 0.8 + Math.sin(u * Math.PI * 2.6) * 0.035;
        const y =
          0.7 -
          Math.sin(u * Math.PI * 0.92) * 0.34 +
          Math.sin(u * Math.PI * 3.3 + 0.8) * 0.055 +
          Math.sin(u * Math.PI * 7.7) * 0.018;
        pts.push([x * S, y * S]);
      }
      rp = pts
        .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`)
        .join('');
    }

    return {
      // Fill only closed rings — an open path would fill against a chord.
      water: toPath(waterLines, S, 4, true),
      bands: built,
      routePath: rp,
      crop: cropTransform,
    };
  }, [place, seed, relief, route]);

  const coords = formatCoords(lat, lng);

  return (
    <figure className={`plate ${className}`}>
      <div className="relative">
        <svg
          viewBox={`0 0 ${S} ${S}`}
          className="block w-full h-auto"
          role="img"
          aria-label={`Contour rendering of ${place || 'a place'}`}
        >
          <defs>
            {/* Water body: a shade cooler and deeper than the plate ground. */}
            <linearGradient id={`w-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0a2131" />
              <stop offset="100%" stopColor="#071a27" />
            </linearGradient>
            {/* Low-angle light from the north-west, as relief maps are shaded. */}
            <linearGradient id={`s-${uid}`} x1="0" y1="0" x2="0.85" y2="1">
              <stop offset="0%" stopColor="#f4ecd8" stopOpacity="0.07" />
              <stop offset="55%" stopColor="#f4ecd8" stopOpacity="0" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0.3" />
            </linearGradient>
            <clipPath id={`c-${uid}`}>
              <rect x="0" y="0" width={S} height={S} />
            </clipPath>
          </defs>

          <g clipPath={`url(#c-${uid})`}>
            <rect x="0" y="0" width={S} height={S} fill="var(--ink)" />

            {/* Graticule — the survey grid under the terrain. */}
            <g stroke="var(--cream)" strokeOpacity="0.05" strokeWidth="0.75">
              {[1, 2, 3, 4].map((i) => (
                <line key={`v${i}`} x1={(S / 5) * i} y1="0" x2={(S / 5) * i} y2={S} />
              ))}
              {[1, 2, 3, 4].map((i) => (
                <line key={`h${i}`} x1="0" y1={(S / 5) * i} x2={S} y2={(S / 5) * i} />
              ))}
            </g>

            {/* Terrain, scaled so the padded rim falls outside the frame. */}
            <g transform={crop}>
              <path d={water} fill={`url(#w-${uid})`} fillRule="evenodd" />
              <path
                d={water}
                fill="none"
                stroke="#5f93b5"
                strokeOpacity="0.5"
                strokeWidth="1.1"
                vectorEffect="non-scaling-stroke"
              />

              {/* Contours: rust, brightening and thickening with elevation. */}
              {bands.map(({ d, t, index }, i) => (
                <path
                  key={i}
                  d={d}
                  fill="none"
                  stroke={index ? 'var(--cream)' : 'var(--rust)'}
                  strokeOpacity={index ? 0.34 + t * 0.3 : 0.3 + t * 0.55}
                  strokeWidth={index ? 1.25 : 0.75}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </g>

            {routePath && (
              <>
                <path
                  d={routePath}
                  fill="none"
                  stroke="var(--ink)"
                  strokeOpacity="0.8"
                  strokeWidth="4.5"
                  strokeLinecap="round"
                />
                <path
                  d={routePath}
                  fill="none"
                  stroke="var(--rust-bright)"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeDasharray="7 4"
                />
              </>
            )}

            <rect x="0" y="0" width={S} height={S} fill={`url(#s-${uid})`} />
          </g>

          {/* Register marks, as on a printed plate. */}
          <g stroke="var(--rust)" strokeOpacity="0.5" strokeWidth="1" fill="none">
            <path d="M14 8 L8 8 L8 14" />
            <path d={`M${S - 14} 8 L${S - 8} 8 L${S - 8} 14`} />
            <path d={`M14 ${S - 8} L8 ${S - 8} L8 ${S - 14}`} />
            <path d={`M${S - 14} ${S - 8} L${S - 8} ${S - 8} L${S - 8} ${S - 14}`} />
          </g>
        </svg>
      </div>

      {/* The four legend fields below are the ones the printed legend carries:
          coordinates to four decimals, a true scale ratio, the datasets, and
          the edition. Coordinates sit in the grid rather than beside the place
          name, where they wrapped badly for longer names. */}
      {legend && (
        <figcaption className="border-t border-[var(--line)] bg-[var(--bg-1)] px-5 py-4 sm:px-6 sm:py-5">
          <div className="t-h3">{place}</div>
          {sub && <div className="mt-1 text-sm text-[var(--slate)]">{sub}</div>}

          <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
            {[
              ['Coordinates', coords || '—'],
              ['Scale', scale],
              ['Data', 'USGS · NOAA · OSM'],
              ['Edition', edition],
            ].map(([k, v]) => (
              <div key={k}>
                <div className="mono-meta text-[var(--slate-dim)]">{k}</div>
                <div
                  className={`mt-1 font-mono tnum text-[0.78rem] ${
                    k === 'Coordinates' ? 'text-[var(--rust)]' : 'text-[var(--cream)]'
                  }`}
                >
                  {v}
                </div>
              </div>
            ))}
          </div>
        </figcaption>
      )}
    </figure>
  );
}

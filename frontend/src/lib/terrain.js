/**
 * Deterministic terrain generation for the site's contour artwork.
 *
 * These renders are illustrative brand furniture, not survey output — the real
 * geometry is built from USGS 3DEP / NOAA / OSM in the studio. They exist so
 * the marketing pages can show cartography instead of stock photography, and
 * so every place has a distinct plate without needing a photo shoot first.
 *
 * Every plate is a pure function of its seed string, so a given place always
 * renders identically across reloads and across server/client.
 */

/* ---- Deterministic PRNG (mulberry32) ------------------------------------ */

function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---- Value noise -------------------------------------------------------- */

const smooth = (t) => t * t * (3 - 2 * t);
const lerp = (a, b, t) => a + (b - a) * t;

function makeLattice(size, rand) {
  const grid = new Float32Array(size * size);
  for (let i = 0; i < grid.length; i += 1) grid[i] = rand();
  return { grid, size };
}

function sampleLattice({ grid, size }, x, y) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = smooth(x - xi);
  const yf = smooth(y - yi);
  const at = (gx, gy) => grid[(((gy % size) + size) % size) * size + (((gx % size) + size) % size)];
  const top = lerp(at(xi, yi), at(xi + 1, yi), xf);
  const bottom = lerp(at(xi, yi + 1), at(xi + 1, yi + 1), xf);
  return lerp(top, bottom, yf);
}

/**
 * Build a normalised [0,1] heightfield of `res` x `res` samples, plus a border
 * of `pad` cells that ramps above the top of the range.
 *
 * The pad exists so that contours enclosing low ground — water, mainly — close
 * into proper polygons instead of running off the edge of the grid. An open
 * polyline cannot be filled correctly, which showed up as angular slivers of
 * water in the corners. The caller crops the pad away (see PAD_FRACTION), so
 * the closure happens just outside the visible frame and the water still reads
 * as running off the edge of the plate.
 *
 * `relief` biases the result between broad coastal shelves (low) and steep
 * mountain country (high), which is what makes a lake plate read differently
 * from a canyon plate.
 */
export function heightField(seedStr, res = 96, relief = 0.5, pad = 7) {
  const rand = mulberry32(hashString(seedStr));
  const octaves = [
    { lattice: makeLattice(4, rand), freq: 2.0, amp: 1.0 },
    { lattice: makeLattice(8, rand), freq: 4.0, amp: 0.5 },
    { lattice: makeLattice(16, rand), freq: 8.0, amp: 0.26 },
    { lattice: makeLattice(32, rand), freq: 16.0, amp: 0.13 },
  ];

  // A soft off-centre dome keeps the interesting terrain inside the frame
  // instead of running off the edges.
  const cx = 0.42 + rand() * 0.16;
  const cy = 0.42 + rand() * 0.16;

  const total = res + pad * 2;
  const field = new Float32Array(total * total);
  let min = Infinity;
  let max = -Infinity;

  for (let y = 0; y < total; y += 1) {
    for (let x = 0; x < total; x += 1) {
      // Sample in the coordinate space of the *visible* grid, so the padding
      // is a genuine continuation of the terrain rather than a separate patch.
      const u = (x - pad) / res;
      const v = (y - pad) / res;

      let n = 0;
      let norm = 0;
      for (const o of octaves) {
        n += sampleLattice(o.lattice, u * o.freq, v * o.freq) * o.amp;
        norm += o.amp;
      }
      n /= norm;

      const dx = u - cx;
      const dy = v - cy;
      const dome = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy) * 1.75);

      // `relief` sharpens the exponent: high relief = tighter, taller ground.
      const shaped = Math.pow(n, 1 + relief * 1.6) * (0.45 + dome * 0.85);

      field[y * total + x] = shaped;

      // Only the visible window sets the normalisation range, so the rim we
      // add below cannot squash the contrast of the terrain on show.
      if (x >= pad && x < pad + res && y >= pad && y < pad + res) {
        if (shaped < min) min = shaped;
        if (shaped > max) max = shaped;
      }
    }
  }

  const span = max - min || 1;
  for (let i = 0; i < field.length; i += 1) field[i] = (field[i] - min) / span;

  // Ramp the pad up above the top of the range. The ramp starts exactly at the
  // visible edge, so terrain inside the frame is untouched.
  if (pad > 0) {
    for (let y = 0; y < total; y += 1) {
      for (let x = 0; x < total; x += 1) {
        const outside = Math.max(
          pad - x,
          pad - y,
          x - (pad + res - 1),
          y - (pad + res - 1),
          0
        );
        if (!outside) continue;
        const t = Math.min(1, outside / pad);
        const i = y * total + x;
        field[i] = Math.max(field[i], 0) * (1 - t) + 1.35 * t;
      }
    }
  }

  return { field, res: total, pad, inner: res };
}

/** Fraction of the padded field to crop from each edge when rendering. */
export function padFraction({ pad, res }) {
  return pad ? pad / res : 0;
}

/* ---- Marching squares --------------------------------------------------- */

/**
 * Extract iso-contours at `level` from a heightfield.
 *
 * Returns an array of polylines in [0,1] space. Segments are emitted per cell
 * and then stitched end-to-end, which keeps the SVG path count low enough that
 * a dozen levels still render as a handful of paths.
 */
export function contourAt({ field, res }, level) {
  const at = (x, y) => field[y * res + x];
  const segments = [];

  const interp = (x1, y1, v1, x2, y2, v2) => {
    const t = (level - v1) / (v2 - v1 || 1e-6);
    return [(x1 + (x2 - x1) * t) / (res - 1), (y1 + (y2 - y1) * t) / (res - 1)];
  };

  for (let y = 0; y < res - 1; y += 1) {
    for (let x = 0; x < res - 1; x += 1) {
      const tl = at(x, y);
      const tr = at(x + 1, y);
      const br = at(x + 1, y + 1);
      const bl = at(x, y + 1);

      let idx = 0;
      if (tl > level) idx |= 8;
      if (tr > level) idx |= 4;
      if (br > level) idx |= 2;
      if (bl > level) idx |= 1;
      if (idx === 0 || idx === 15) continue;

      const top = () => interp(x, y, tl, x + 1, y, tr);
      const right = () => interp(x + 1, y, tr, x + 1, y + 1, br);
      const bottom = () => interp(x, y + 1, bl, x + 1, y + 1, br);
      const left = () => interp(x, y, tl, x, y + 1, bl);

      // Every segment is emitted with the same side of the contour on the same
      // hand, so segments chain head-to-tail and closed regions come back as
      // closed rings. Complementary cases (n and 15-n) are exact reverses.
      // Without this the chains broke apart and open paths were being filled
      // with a straight closing chord — the stray triangles in the water.
      switch (idx) {
        case 1: segments.push([left(), bottom()]); break;
        case 14: segments.push([bottom(), left()]); break;
        case 2: segments.push([bottom(), right()]); break;
        case 13: segments.push([right(), bottom()]); break;
        case 3: segments.push([left(), right()]); break;
        case 12: segments.push([right(), left()]); break;
        case 4: segments.push([right(), top()]); break;
        case 11: segments.push([top(), right()]); break;
        case 6: segments.push([bottom(), top()]); break;
        case 9: segments.push([top(), bottom()]); break;
        case 7: segments.push([left(), top()]); break;
        case 8: segments.push([top(), left()]); break;
        // Saddles: the centre value decides which pair of corners connects.
        case 5:
          if ((tl + tr + br + bl) / 4 > level) {
            segments.push([left(), top()], [right(), bottom()]);
          } else {
            segments.push([right(), top()], [left(), bottom()]);
          }
          break;
        case 10:
          if ((tl + tr + br + bl) / 4 > level) {
            segments.push([top(), right()], [bottom(), left()]);
          } else {
            segments.push([top(), left()], [bottom(), right()]);
          }
          break;
        default: break;
      }
    }
  }

  return stitch(segments);
}

const key = (p) => `${Math.round(p[0] * 8192)},${Math.round(p[1] * 8192)}`;

/**
 * Chain oriented segments end-to-start into polylines.
 *
 * Returns `{ points, closed }` per line. A line is closed when the walk
 * returns to where it started, which is what makes a fillable ring.
 */
function stitch(segments) {
  const startIndex = new Map();
  segments.forEach((seg, i) => {
    const k = key(seg[0]);
    const bucket = startIndex.get(k);
    if (bucket) bucket.push(i);
    else startIndex.set(k, [i]);
  });

  const used = new Array(segments.length).fill(false);
  const lines = [];

  const takeFrom = (k) => {
    const bucket = startIndex.get(k);
    if (!bucket) return undefined;
    for (let i = 0; i < bucket.length; i += 1) {
      if (!used[bucket[i]]) return bucket[i];
    }
    return undefined;
  };

  for (let i = 0; i < segments.length; i += 1) {
    if (used[i]) continue;
    used[i] = true;

    const points = [segments[i][0], segments[i][1]];
    const startKey = key(segments[i][0]);
    let closed = false;

    for (let guard = 0; guard < segments.length + 2; guard += 1) {
      const endKey = key(points[points.length - 1]);
      if (endKey === startKey) {
        closed = true;
        break;
      }
      const next = takeFrom(endKey);
      if (next === undefined) break;
      used[next] = true;
      points.push(segments[next][1]);
    }

    lines.push({ points, closed });
  }

  return lines;
}

/**
 * Turn polylines into an SVG path `d` at the given size.
 *
 * `onlyClosed` restricts output to closed rings — required for anything that
 * gets filled, since an open path fills against an invented straight chord.
 */
export function toPath(lines, size, minPoints = 3, onlyClosed = false) {
  let d = '';
  for (const line of lines) {
    const pts = line.points || line;
    const closed = line.closed ?? false;
    if (onlyClosed && !closed) continue;
    if (pts.length < minPoints) continue;

    d += `M${(pts[0][0] * size).toFixed(1)} ${(pts[0][1] * size).toFixed(1)}`;
    for (let i = 1; i < pts.length; i += 1) {
      d += `L${(pts[i][0] * size).toFixed(1)} ${(pts[i][1] * size).toFixed(1)}`;
    }
    if (closed) d += 'Z';
  }
  return d;
}

/** Format decimal degrees the way the printed legend does. */
export function formatCoords(lat, lng) {
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
  const ns = lat >= 0 ? 'N' : 'S';
  const ew = lng >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(4)} ${ns}, ${Math.abs(lng).toFixed(4)} ${ew}`;
}

/**
 * exporters.js — print-quality poster export for the Terrane map studio.
 *
 * Dependency-free. Composes a square poster canvas from a live MapLibre map
 * (created by the UI with preserveDrawingBuffer: true) plus a themed text
 * block, then downloads it as:
 *
 *   - PNG with a hand-spliced pHYs chunk so the file declares its print DPI, or
 *   - a minimal hand-written single-page PDF-1.4 with the poster embedded as
 *     a DCTDecode (JPEG) image on a page sized to exact physical inches.
 *
 * Both entry points throw a descriptive Error on failure so the caller can
 * toast the message.
 *
 *   opts = {
 *     map,                     // MapLibre Map instance (required)
 *     title, subtitle,         // poster text
 *     coordsText, scaleText,   // mono footer line, joined with "  ·  "
 *     theme,                   // theme object from mapThemes (required)
 *     sizeInches = 8,          // physical poster size (square)
 *     dpi = 300,               // print resolution
 *     filename = "terrane-map" // download name, extension added
 *   }
 */

/** Canvas dimension cap — stays well inside every browser's canvas limits. */
const MAX_POSTER_PX = 4096;

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/** Parse "#rgb" or "#rrggbb" into { r, g, b }. */
function hexToRgb(hex) {
  let h = String(hex || "").replace("#", "").trim();
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  const n = parseInt(h, 16);
  if (h.length !== 6 || Number.isNaN(n)) return { r: 0, g: 0, b: 0 };
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

/** Promisified canvas.toBlob with a descriptive failure. */
function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob(
        (blob) =>
          blob
            ? resolve(blob)
            : reject(
                new Error(
                  "canvas.toBlob returned null — the canvas may be tainted or too large"
                )
              ),
        type,
        quality
      );
    } catch (err) {
      reject(err);
    }
  });
}

/** Trigger a browser download for a Blob via a temporary <a download>. */
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke after the click has been consumed by the download pipeline.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Draw text centered at (cx, baseline) with manual letterspacing. */
function drawLetterSpaced(ctx, text, cx, baseline, tracking) {
  const chars = Array.from(text);
  let total = 0;
  for (const ch of chars) total += ctx.measureText(ch).width + tracking;
  total -= tracking; // no trailing gap
  const prevAlign = ctx.textAlign;
  ctx.textAlign = "left";
  let x = cx - total / 2;
  for (const ch of chars) {
    ctx.fillText(ch, x, baseline);
    x += ctx.measureText(ch).width + tracking;
  }
  ctx.textAlign = prevAlign;
}

/** Shrink a font size until `text` fits within maxWidth (down to 55% of base). */
function fitFontSize(ctx, text, baseSize, maxWidth, fontTemplate) {
  let size = baseSize;
  ctx.font = fontTemplate(size);
  while (ctx.measureText(text).width > maxWidth && size > baseSize * 0.55) {
    size -= Math.max(1, baseSize * 0.04);
    ctx.font = fontTemplate(size);
  }
  return size;
}

/**
 * Compose the square poster canvas: map snapshot (cover-fit, center-cropped),
 * bottom gradient scrim, and the themed text block. Returns the canvas.
 */
async function composePosterCanvas(opts) {
  const {
    map,
    title = "",
    subtitle = "",
    coordsText = "",
    scaleText = "",
    theme,
    sizeInches = 8,
    dpi = 300,
  } = opts || {};

  if (!map || typeof map.getCanvas !== "function") {
    throw new Error("Poster export needs opts.map — a live MapLibre map instance.");
  }
  if (!theme || !theme.ui || !theme.ui.bg || !theme.ui.text) {
    throw new Error("Poster export needs opts.theme — a Terrane theme object with ui colors.");
  }

  const px = Math.min(Math.round(sizeInches * dpi), MAX_POSTER_PX);
  if (!(px > 0)) {
    throw new Error(`Invalid poster size: ${sizeInches}in × ${dpi}dpi.`);
  }

  // Fonts are loaded by the page (Archivo / JetBrains Mono); wait so canvas
  // text renders with the real faces, not fallbacks.
  if (typeof document !== "undefined" && document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch (_) {
      // Non-fatal — worst case the text renders in a fallback face.
    }
  }

  const src = map.getCanvas();
  if (!src || !src.width || !src.height) {
    throw new Error("The map canvas is empty — wait for the map to finish loading.");
  }

  const canvas = document.createElement("canvas");
  canvas.width = px;
  canvas.height = px;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not create a 2D canvas context for the poster.");
  }

  // 1) Background (also shows through any transparent map pixels).
  ctx.fillStyle = theme.ui.bg;
  ctx.fillRect(0, 0, px, px);

  // 2) Map snapshot, cover-fit: scale so the shorter source side fills the
  //    square, center the overflow (i.e. center-crop the longer side).
  //    Works because the UI creates the Map with preserveDrawingBuffer: true —
  //    otherwise the WebGL buffer would read back blank.
  const scale = Math.max(px / src.width, px / src.height);
  const dw = src.width * scale;
  const dh = src.height * scale;
  ctx.drawImage(src, (px - dw) / 2, (px - dh) / 2, dw, dh);

  // 3) Bottom scrim: transparent → theme.ui.bg @ 92% over the bottom ~22%.
  const { r, g, b } = hexToRgb(theme.ui.bg);
  const scrimTop = px * 0.78;
  const grad = ctx.createLinearGradient(0, scrimTop, 0, px);
  grad.addColorStop(0, `rgba(${r},${g},${b},0)`);
  grad.addColorStop(0.4, `rgba(${r},${g},${b},0.55)`);
  grad.addColorStop(1, `rgba(${r},${g},${b},0.92)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, scrimTop, px, px - scrimTop);

  // 4) Text block, centered, laid out at fixed fractions of the poster.
  const cx = px / 2;
  const maxTextWidth = px * 0.86;
  ctx.fillStyle = theme.ui.text;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  if (title) {
    const size = fitFontSize(
      ctx,
      title,
      px / 14,
      maxTextWidth,
      (s) => `bold ${s}px Archivo, sans-serif`
    );
    ctx.font = `bold ${size}px Archivo, sans-serif`;
    ctx.globalAlpha = 1;
    ctx.fillText(title, cx, px * 0.866);
  }

  if (subtitle) {
    const size = fitFontSize(
      ctx,
      subtitle,
      px / 32,
      maxTextWidth,
      (s) => `${s}px Archivo, sans-serif`
    );
    ctx.font = `${size}px Archivo, sans-serif`;
    ctx.globalAlpha = 0.7;
    ctx.fillText(subtitle, cx, px * 0.897);
  }

  // Thin divider rule.
  ctx.globalAlpha = 0.5;
  const ruleW = px * 0.11;
  const ruleH = Math.max(1, Math.round(px * 0.001));
  ctx.fillRect(cx - ruleW / 2, px * 0.9165, ruleW, ruleH);

  const coordsLine = [coordsText, scaleText].filter(Boolean).join("  ·  ");
  if (coordsLine) {
    const size = fitFontSize(
      ctx,
      coordsLine,
      px / 40,
      maxTextWidth,
      (s) => `${s}px "JetBrains Mono", monospace`
    );
    ctx.font = `${size}px "JetBrains Mono", monospace`;
    ctx.globalAlpha = 0.85;
    ctx.fillText(coordsLine, cx, px * 0.945);
  }

  // Brand line, letterspaced small caps at the very bottom.
  const brandSize = px / 50;
  ctx.font = `${brandSize}px Archivo, sans-serif`;
  ctx.globalAlpha = 0.6;
  drawLetterSpaced(ctx, "TERRANE · EDITION 1 OF 1", cx, px * 0.9745, brandSize * 0.32);
  ctx.globalAlpha = 1;

  return canvas;
}

// ---------------------------------------------------------------------------
// PNG: pHYs chunk injection (declares physical DPI in the file)
// ---------------------------------------------------------------------------

let CRC_TABLE = null;

/**
 * Standard CRC-32 (polynomial 0xEDB88320, the one PNG mandates), computed over
 * chunk type + chunk data. Table is built once and cached.
 */
function crc32(bytes) {
  if (!CRC_TABLE) {
    CRC_TABLE = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
      CRC_TABLE[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function writeU32BE(arr, offset, value) {
  arr[offset] = (value >>> 24) & 255;
  arr[offset + 1] = (value >>> 16) & 255;
  arr[offset + 2] = (value >>> 8) & 255;
  arr[offset + 3] = value & 255;
}

function readU32BE(arr, offset) {
  return (
    ((arr[offset] << 24) | (arr[offset + 1] << 16) | (arr[offset + 2] << 8) | arr[offset + 3]) >>> 0
  );
}

/**
 * Splice a pHYs chunk into PNG bytes, directly after IHDR (the PNG spec
 * requires pHYs before the first IDAT; right after IHDR is always valid).
 *
 * pHYs data = 9 bytes: X pixels-per-unit (u32 BE), Y pixels-per-unit (u32 BE),
 * unit specifier (1 = meter). ppm = round(dpi / 0.0254) since 1in = 0.0254m.
 * Chunk layout = length(4) + type(4) + data(9) + crc(4) = 21 bytes; the CRC
 * covers type + data only (never the length field).
 */
function injectPngPhys(pngBytes, dpi) {
  const SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  for (let i = 0; i < 8; i++) {
    if (pngBytes[i] !== SIG[i]) {
      throw new Error("Encoded image is not a valid PNG (bad signature).");
    }
  }
  // First chunk must be IHDR: read its declared data length to find its end.
  const ihdrLen = readU32BE(pngBytes, 8);
  const typeStr = String.fromCharCode(
    pngBytes[12], pngBytes[13], pngBytes[14], pngBytes[15]
  );
  if (typeStr !== "IHDR") {
    throw new Error("Encoded PNG is malformed (first chunk is not IHDR).");
  }
  const ihdrEnd = 8 + 4 + 4 + ihdrLen + 4; // sig .. length+type+data+crc (33 in practice)

  const ppm = Math.round(dpi / 0.0254); // pixels per meter, e.g. 300dpi → 11811
  const chunk = new Uint8Array(21);
  writeU32BE(chunk, 0, 9); // data length
  chunk[4] = 0x70; // 'p'
  chunk[5] = 0x48; // 'H'
  chunk[6] = 0x59; // 'Y'
  chunk[7] = 0x73; // 's'
  writeU32BE(chunk, 8, ppm); // X pixels per unit
  writeU32BE(chunk, 12, ppm); // Y pixels per unit
  chunk[16] = 1; // unit: meter
  writeU32BE(chunk, 17, crc32(chunk.subarray(4, 17)));

  const out = new Uint8Array(pngBytes.length + chunk.length);
  out.set(pngBytes.subarray(0, ihdrEnd), 0);
  out.set(chunk, ihdrEnd);
  out.set(pngBytes.subarray(ihdrEnd), ihdrEnd + chunk.length);
  return out;
}

/**
 * Export the poster as a PNG download with embedded print DPI (pHYs chunk).
 */
export async function exportPosterPNG(opts) {
  try {
    const { dpi = 300, filename = "terrane-map" } = opts || {};
    const canvas = await composePosterCanvas(opts);
    const blob = await canvasToBlob(canvas, "image/png");
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const withDpi = injectPngPhys(bytes, dpi);
    downloadBlob(new Blob([withDpi], { type: "image/png" }), `${filename}.png`);
  } catch (err) {
    throw new Error(`PNG export failed: ${err && err.message ? err.message : err}`);
  }
}

// ---------------------------------------------------------------------------
// PDF: minimal hand-written single-page PDF-1.4 with a DCTDecode image
// ---------------------------------------------------------------------------

/** Encode a latin1-safe string (every charCode ≤ 0xFF) to bytes. */
function latin1Bytes(str) {
  const out = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) out[i] = str.charCodeAt(i) & 0xff;
  return out;
}

/** Format a point value for PDF syntax (trim trailing zeros). */
function pdfNum(n) {
  return String(+n.toFixed(2));
}

/**
 * Build a one-page PDF containing the JPEG scaled to a square page of exactly
 * sizeInches × sizeInches (1in = 72pt).
 *
 * Structure: header, objects 1-5 (catalog, pages, page, contents, image
 * XObject), xref table, trailer. The file is assembled as an array of binary
 * parts while a running byte offset records where each object starts — those
 * offsets become the xref entries, which is the part PDF readers are strict
 * about (each entry is exactly "NNNNNNNNNN GGGGG n \n", 20 bytes).
 */
function buildPosterPdf(jpegBytes, imgW, imgH, sizeInches) {
  const page = sizeInches * 72; // points
  const parts = [];
  let offset = 0;
  const objOffsets = [0]; // index 0 = the mandatory free object

  const push = (part) => {
    const bytes = typeof part === "string" ? latin1Bytes(part) : part;
    parts.push(bytes);
    offset += bytes.length;
  };
  const beginObj = () => objOffsets.push(offset);

  // Header. The binary comment line marks the file as containing 8-bit data.
  push("%PDF-1.4\n%âãÏÓ\n");

  beginObj();
  push("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");

  beginObj();
  push("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");

  beginObj();
  push(
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pdfNum(page)} ${pdfNum(page)}] ` +
      "/Resources << /ProcSet [/PDF /ImageC] /XObject << /Im0 5 0 R >> >> " +
      "/Contents 4 0 R >>\nendobj\n"
  );

  // Content stream: cm scales the 1×1 unit image space up to the full page.
  const content = `q\n${pdfNum(page)} 0 0 ${pdfNum(page)} 0 0 cm\n/Im0 Do\nQ\n`;
  beginObj();
  push(`4 0 obj\n<< /Length ${content.length} >>\nstream\n${content}endstream\nendobj\n`);

  beginObj();
  push(
    `5 0 obj\n<< /Type /XObject /Subtype /Image /Width ${imgW} /Height ${imgH} ` +
      `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode ` +
      `/Length ${jpegBytes.length} >>\nstream\n`
  );
  push(jpegBytes);
  push("\nendstream\nendobj\n");

  // xref: byte offsets of every object, 10-digit zero-padded, 20-byte rows.
  const xrefStart = offset;
  let xref = "xref\n0 6\n0000000000 65535 f \n";
  for (let i = 1; i <= 5; i++) {
    xref += `${String(objOffsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  push(xref);
  push(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`);

  return new Blob(parts, { type: "application/pdf" });
}

/**
 * Export the poster as a single-page PDF download sized to exact inches.
 */
export async function exportPosterPDF(opts) {
  try {
    const { sizeInches = 8, filename = "terrane-map" } = opts || {};
    const canvas = await composePosterCanvas(opts);

    // JPEG keeps the PDF small; DCTDecode lets us embed the bytes verbatim.
    const dataUrl = canvas.toDataURL("image/jpeg", 0.94);
    if (!dataUrl.startsWith("data:image/jpeg")) {
      throw new Error("Browser could not encode the poster as JPEG.");
    }
    const b64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
    const bin = atob(b64);
    const jpegBytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) jpegBytes[i] = bin.charCodeAt(i);

    const blob = buildPosterPdf(jpegBytes, canvas.width, canvas.height, sizeInches);
    downloadBlob(blob, `${filename}.pdf`);
  } catch (err) {
    throw new Error(`PDF export failed: ${err && err.message ? err.message : err}`);
  }
}

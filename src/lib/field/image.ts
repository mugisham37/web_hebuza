"use client";
// Camera pipeline (plan §2.11): decode with EXIF orientation → downscale → (timestamp band) → JPEG. Re-encoding drops
// EXIF (privacy spec); check-in GPS travels as fields, never in the file. One image at a time, bitmaps closed.
import { formatDate } from "@/shared/format";
import type { L3 } from "@/shared/field/types";

export const PROFILES = { normal: { max: 2000, q: 0.8 }, lite: { max: 1280, q: 0.6 } } as const;

/** Target size keeping aspect ratio, longest side ≤ max. */
export function fitWithin(w: number, h: number, max: number) {
  const s = Math.min(1, max / Math.max(w, h));
  return { w: Math.round(w * s), h: Math.round(h * s) };
}

export type Captured = { dataUrl: string; bytes: number; width: number; height: number; capturedAt: string; fileTime: number };

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  return c;
}
const toDataUrl = (c: HTMLCanvasElement, q: number) => c.toDataURL("image/jpeg", q);
const bytesOf = (dataUrl: string) => Math.round(((dataUrl.length - dataUrl.indexOf(",") - 1) * 3) / 4);

/**
 * Compress (and optionally burn a Kigali timestamp + coords band, board VI2). `capturedAt` must come from the event
 * handler (never render). Crop box is in source pixels (from autoCropBox / CropSheet).
 */
export async function processImage(file: Blob, o: {
  lite: boolean; capturedAt: number; fileTime: number; stamp?: { locale: L3; coords?: string | null };
  crop?: { x: number; y: number; w: number; h: number }; enhance?: boolean;
}): Promise<Captured> {
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    const src = o.crop ?? { x: 0, y: 0, w: bmp.width, h: bmp.height };
    const p = o.lite ? PROFILES.lite : PROFILES.normal;
    const { w, h } = fitWithin(src.w, src.h, p.max);
    const c = canvas(w, h);
    const ctx = c.getContext("2d")!;
    ctx.drawImage(bmp, src.x, src.y, src.w, src.h, 0, 0, w, h);
    if (o.enhance) enhanceInPlace(ctx, w, h);
    if (o.stamp) {
      const band = Math.max(28, Math.round(h * 0.07));
      ctx.fillStyle = "rgba(7,11,46,.72)";
      ctx.fillRect(0, h - band, w, band);
      ctx.fillStyle = "#F8B718";
      ctx.font = `600 ${Math.round(band * 0.5)}px system-ui, sans-serif`;
      ctx.textBaseline = "middle";
      const when = formatDate(o.capturedAt, o.stamp.locale, { weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
      ctx.fillText(`${when}${o.stamp.coords ? ` · ${o.stamp.coords}` : ""}`, Math.round(band * 0.4), h - band / 2);
    }
    const dataUrl = toDataUrl(c, p.q);
    return { dataUrl, bytes: bytesOf(dataUrl), width: w, height: h, capturedAt: new Date(o.capturedAt).toISOString(), fileTime: o.fileTime };
  } finally { bmp.close(); }
}

/** Greyscale + contrast stretch (one pass). Default on for scans. */
function enhanceInPlace(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  let lo = 255, hi = 0;
  for (let i = 0; i < d.length; i += 16) { const g = 0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2]; if (g < lo) lo = g; if (g > hi) hi = g; }
  const k = hi > lo ? 255 / (hi - lo) : 1;
  for (let i = 0; i < d.length; i += 4) { const g = (0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2] - lo) * k; d[i] = d[i + 1] = d[i + 2] = g; }
  ctx.putImageData(img, 0, 0);
}

/**
 * Auto-crop: 256 px greyscale, Sobel magnitude, tightest box holding 95% of strong edges, padded 2%. Source pixels.
 * shortcut: axis-aligned bbox crop, no perspective correction; upgrade to quad detection + homography if office QC rejects >10% of scans.
 */
export async function autoCropBox(file: Blob): Promise<{ x: number; y: number; w: number; h: number; srcW: number; srcH: number }> {
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    const { w, h } = fitWithin(bmp.width, bmp.height, 256);
    const c = canvas(w, h);
    const ctx = c.getContext("2d")!;
    ctx.drawImage(bmp, 0, 0, w, h);
    const d = ctx.getImageData(0, 0, w, h).data;
    const g = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) g[i] = 0.3 * d[i * 4] + 0.59 * d[i * 4 + 1] + 0.11 * d[i * 4 + 2];
    const box = edgeBox(g, w, h);
    const sx = bmp.width / w, sy = bmp.height / h;
    return { x: Math.round(box.x * sx), y: Math.round(box.y * sy), w: Math.round(box.w * sx), h: Math.round(box.h * sy), srcW: bmp.width, srcH: bmp.height };
  } finally { bmp.close(); }
}

/** Pure: bbox of strong Sobel edges (95% mass), padded 2%. Exported for the self-check. */
export function edgeBox(g: Float32Array, w: number, h: number) {
  const mags: number[] = [];
  const m = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x;
    const gx = -g[i - w - 1] - 2 * g[i - 1] - g[i + w - 1] + g[i - w + 1] + 2 * g[i + 1] + g[i + w + 1];
    const gy = -g[i - w - 1] - 2 * g[i - w] - g[i - w + 1] + g[i + w - 1] + 2 * g[i + w] + g[i + w + 1];
    m[i] = Math.hypot(gx, gy); mags.push(m[i]);
  }
  mags.sort((a, b) => a - b);
  const thr = Math.max(40, mags[Math.floor(mags.length * 0.9)] ?? 0);
  const xs: number[] = [], ys: number[] = [];
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) if (m[y * w + x] >= thr) { xs.push(x); ys.push(y); }
  if (xs.length < 20) return { x: 0, y: 0, w, h };
  xs.sort((a, b) => a - b); ys.sort((a, b) => a - b);
  const cut = Math.floor(xs.length * 0.025);
  const x0 = xs[cut], x1 = xs[xs.length - 1 - cut], y0 = ys[cut], y1 = ys[ys.length - 1 - cut];
  const px = Math.round(w * 0.02), py = Math.round(h * 0.02);
  const x = Math.max(0, x0 - px), y = Math.max(0, y0 - py);
  return { x, y, w: Math.min(w, x1 + px) - x, h: Math.min(h, y1 + py) - y };
}

if (process.env.NODE_ENV !== "production") {
  const r = fitWithin(4000, 3000, 2000);
  console.assert(r.w === 2000 && r.h === 1500 && fitWithin(4000, 3000, 1280).w === 1280, "field image: target dimensions");
  const W = 64, H = 64, g = new Float32Array(W * H);
  for (let y = 16; y < 48; y++) for (let x = 20; x < 44; x++) g[y * W + x] = 255; // white page on black
  const b = edgeBox(g, W, H);
  console.assert(b.x >= 16 && b.x <= 21 && b.x + b.w >= 43 && b.x + b.w <= 48, "field image: edge bbox");
}

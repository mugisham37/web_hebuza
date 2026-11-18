// Browser-only geolocation (getFix, mapsHref); the pure maths lives in @/shared/field/geo.
import type { Fix } from "@/shared/field/types";
export * from "@/shared/field/geo";

export type GeoError = "denied" | "unavailable" | "timeout" | "unsupported";
/** Test seam: e2e sets localStorage["field.geoTimeoutMs"] (mock builds only). */
function geoTimeout() {
  if (process.env.NEXT_PUBLIC_API_MOCKING === "on") {
    try { const v = Number(localStorage.getItem("field.geoTimeoutMs")); if (v > 0) return v; } catch {}
  }
  return 20_000;
}

/**
 * Up to three one-shot fixes within the timeout, keeping the best accuracy; `onProgress` streams ±m.
 * shortcut: three sequential fixes, use a 20 s watch-then-clear only if GPS converges slowly in the field.
 */
export async function getFix(o: { battery: boolean; onProgress?: (accuracyM: number) => void; signal?: AbortSignal }): Promise<{ fix: Fix; error?: GeoError }> {
  if (typeof navigator === "undefined" || !navigator.geolocation) return { fix: null, error: "unsupported" };
  const deadline = Date.now() + geoTimeout();
  let best: Fix = null;
  let lastErr: GeoError | undefined;
  for (let i = 0; i < 3 && Date.now() < deadline && !o.signal?.aborted; i++) {
    try {
      const p = await new Promise<GeolocationPosition>((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, {
          enableHighAccuracy: !o.battery, timeout: Math.max(1000, deadline - Date.now()), maximumAge: o.battery ? 60_000 : 0,
        }));
      const f = { lat: p.coords.latitude, lng: p.coords.longitude, accuracyM: Math.round(p.coords.accuracy), at: new Date(p.timestamp).toISOString() };
      if (!best || f.accuracyM < best.accuracyM) best = f;
      o.onProgress?.(best.accuracyM);
      if (best.accuracyM <= 30) break;
    } catch (e) {
      const code = (e as GeolocationPositionError).code;
      lastErr = code === 1 ? "denied" : code === 2 ? "unavailable" : "timeout";
      if (code === 1) break;
    }
  }
  return best ? { fix: best } : { fix: null, error: lastErr ?? "timeout" };
}

/** Map link: geo: URI on Android, Google Maps URL elsewhere. */
export function mapsHref(lat: number | null, lng: number | null, address: string) {
  const q = lat !== null && lng !== null ? `${lat},${lng}` : encodeURIComponent(address);
  const android = typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent);
  return android ? `geo:${q}?q=${q}` : `https://www.google.com/maps/search/?api=1&query=${q}`;
}

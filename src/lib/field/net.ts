"use client";
// One connectivity truth for banner, pill and engine (plan §3.2.3). navigator.onLine is a hint; the engine confirms with
// real requests. Not Next's experimental useOffline (navigation-scoped, opt-in flag).
// shortcut: navigator.onLine gate, add a HEAD /api/health probe if captive portals cause false "online".
import { useSyncExternalStore } from "react";

type Conn = { saveData?: boolean; effectiveType?: string; addEventListener?: (t: string, f: () => void) => void; removeEventListener?: (t: string, f: () => void) => void };
const conn = (): Conn | undefined => (typeof navigator !== "undefined" ? (navigator as Navigator & { connection?: Conn }).connection : undefined);

function subscribe(fn: () => void) {
  window.addEventListener("online", fn);
  window.addEventListener("offline", fn);
  conn()?.addEventListener?.("change", fn);
  return () => { window.removeEventListener("online", fn); window.removeEventListener("offline", fn); conn()?.removeEventListener?.("change", fn); };
}
export const isOnline = () => typeof navigator === "undefined" || navigator.onLine;
export const useOnline = () => useSyncExternalStore(subscribe, isOnline, () => true);

/** Slow network hint for auto-lite (F-PERF-04). */
export const slowNetwork = () => { const c = conn(); return !!c?.saveData || c?.effectiveType === "slow-2g" || c?.effectiveType === "2g"; };
export const useSlowNetwork = () => useSyncExternalStore(subscribe, slowNetwork, () => false);

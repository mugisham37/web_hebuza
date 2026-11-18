"use client";
import { useMemo, useSyncExternalStore } from "react";

// URL query as external state (same pattern as catalogue-browser; no useSearchParams, so no Suspense needed).
const listeners = new Set<() => void>();
let patched = false;
// <Link>/router.push to the same path with a new query changes the URL via history.pushState, which fires no event.
function patchHistory() {
  if (patched) return;
  patched = true;
  for (const m of ["pushState", "replaceState"] as const) {
    const orig = window.history[m].bind(window.history);
    window.history[m] = (...args: Parameters<History["pushState"]>) => {
      orig(...args);
      queueMicrotask(() => listeners.forEach((fn) => fn())); // not inside React's render/commit
    };
  }
}
const subscribe = (fn: () => void) => {
  patchHistory();
  listeners.add(fn);
  window.addEventListener("popstate", fn);
  window.addEventListener("hashchange", fn);
  return () => {
    listeners.delete(fn);
    window.removeEventListener("popstate", fn);
    window.removeEventListener("hashchange", fn);
  };
};

export function useUrlParams() {
  const search = useSyncExternalStore(
    subscribe,
    () => window.location.search,
    () => "",
  );
  return useMemo(() => new URLSearchParams(search), [search]);
}
export const useHash = () =>
  useSyncExternalStore(
    subscribe,
    () => decodeURIComponent(window.location.hash.slice(1)),
    () => "",
  );

export function setUrlParams(
  patch: Record<string, string | null>,
  hash?: string,
) {
  const p = new URLSearchParams(window.location.search);
  for (const [k, v] of Object.entries(patch)) {
    if (v) p.set(k, v);
    else p.delete(k);
  }
  const qs = p.toString();
  window.history.replaceState(
    null,
    "",
    `${window.location.pathname}${qs ? `?${qs}` : ""}${hash ?? window.location.hash}`,
  );
  listeners.forEach((fn) => fn());
}

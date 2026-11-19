"use client";
import { useEffect } from "react";

/** Registers the PWA service worker in production only (dev SW caching causes stale bundles). F-PERF-02 shell. */
export function ServiceWorker() {
  useEffect(() => {
    // Dummy-data mode: the MSW worker owns scope "/" (one service worker per scope).
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    // updateViaCache "none": the browser always revalidates sw.js (Next PWA guide). Install prompt kept for the field Prepare page.
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {});
    const bip = (e: Event) => { e.preventDefault(); (window as Window & { __bip?: Event }).__bip = e; };
    window.addEventListener("beforeinstallprompt", bip);
    return () => window.removeEventListener("beforeinstallprompt", bip);
  }, []);
  return null;
}

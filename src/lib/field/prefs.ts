"use client";
// Lite / battery prefs (plan §2.13). localStorage, non-PII. Lite auto-on for saveData/2G unless the user chose.
import { useSyncExternalStore } from "react";
import { useSlowNetwork } from "./net";

export type Prefs = { lite: boolean | null; battery: boolean; textAddresses: true };
const KEY = "field.prefs";
const DEFAULT: Prefs = { lite: null, battery: false, textAddresses: true };
const listeners = new Set<() => void>();
let cache: Prefs | null = null;
let raw: string | null = null;

function read(): Prefs {
  let r: string | null = null;
  try { r = localStorage.getItem(KEY); } catch {}
  if (cache && r === raw) return cache;
  raw = r;
  try { cache = { ...DEFAULT, ...(r ? JSON.parse(r) : {}) }; } catch { cache = DEFAULT; }
  return cache!;
}
export function setPrefs(p: Partial<Prefs>) {
  try { localStorage.setItem(KEY, JSON.stringify({ ...read(), ...p })); } catch {}
  listeners.forEach((f) => f());
}
const sub = (f: () => void) => { listeners.add(f); window.addEventListener("storage", f); return () => { listeners.delete(f); window.removeEventListener("storage", f); }; };
export const getPrefs = () => (typeof window === "undefined" ? DEFAULT : read());

export function usePrefs() {
  const p = useSyncExternalStore(sub, read, () => DEFAULT);
  const slow = useSlowNetwork();
  return { ...p, liteOn: p.lite ?? slow, liteAuto: p.lite === null && slow };
}

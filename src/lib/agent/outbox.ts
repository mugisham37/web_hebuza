"use client";
// Offline outbox (plan §9): every agent message is written here first, then sent. Survives reloads (IndexedDB, per
// device by design), replays on `online`. Falls back to memory when IndexedDB is unavailable (private mode).
import { useSyncExternalStore } from "react";

export type OutboxState = "queued" | "sending" | "failed" | "sent";
export type OutboxItem = {
  id: string; // = client_msg_id, so a replay is idempotent on the server
  ref: string;
  path: string;
  body: Record<string, unknown> & { lane: "client" | "internal"; kind: "text" | "file" | "card" | "voice"; body: string };
  state: OutboxState;
  at: string;
  error?: string;
};

const DB = "hebuza-agent",
  STORE = "outbox";
let items: OutboxItem[] = [];
let loaded = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((f) => f());

function db(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  return new Promise((res) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () =>
      r.result.createObjectStore(STORE, { keyPath: "id" });
    r.onsuccess = () => res(r.result);
    r.onerror = () => res(null);
  });
}
async function tx(fn: (s: IDBObjectStore) => void) {
  const d = await db();
  if (!d) return;
  await new Promise<void>((res) => {
    const t = d.transaction(STORE, "readwrite");
    fn(t.objectStore(STORE));
    t.oncomplete = t.onerror = () => res();
  });
}
async function load() {
  if (loaded) return;
  loaded = true;
  const d = await db();
  if (!d) return;
  const saved = await new Promise<OutboxItem[]>((res) => {
    const r = d.transaction(STORE).objectStore(STORE).getAll();
    r.onsuccess = () => res(r.result as OutboxItem[]);
    r.onerror = () => res([]);
  });
  // A "sending" item from a closed tab never finished: retry it.
  const fresh = saved.map((i) =>
    i.state === "sending" ? { ...i, state: "queued" as const } : i,
  );
  items = [...fresh.filter((s) => !items.some((i) => i.id === s.id)), ...items];
  emit();
}

function set(id: string, patch: Partial<OutboxItem>) {
  items = items.map((i) => (i.id === id ? { ...i, ...patch } : i));
  const it = items.find((i) => i.id === id);
  if (it) void tx((s) => s.put(it));
  emit();
}
function remove(id: string) {
  items = items.filter((i) => i.id !== id);
  void tx((s) => s.delete(id));
  emit();
}

type Sender = (i: OutboxItem) => Promise<unknown>;
let sender: Sender | null = null;
let onSent: ((i: OutboxItem) => void) | null = null;
/** The data layer registers how to POST and what to refresh after a send. */
export function configureOutbox(s: Sender, after: (i: OutboxItem) => void) {
  sender = s;
  onSent = after;
  if (navigator.onLine) void load().then(retryAll);
}

async function attempt(id: string) {
  const it = items.find((i) => i.id === id);
  if (!it || !sender || it.state === "sending") return;
  if (!navigator.onLine) return set(id, { state: "queued" });
  set(id, { state: "sending", error: undefined });
  try {
    await sender(it);
    set(id, { state: "sent" });
    onSent?.(it);
    setTimeout(() => remove(id), 1500); // "Sent" flashes, then the server copy takes over
  } catch (e) {
    // Network drop mid-send stays queued for the `online` replay; a server refusal is a visible failure.
    set(
      id,
      navigator.onLine
        ? { state: "failed", error: (e as Error).message }
        : { state: "queued" },
    );
  }
}

export async function enqueue(i: Omit<OutboxItem, "state" | "at">) {
  const it: OutboxItem = {
    ...i,
    state: "queued",
    at: new Date().toISOString(),
  };
  items = [...items, it];
  await tx((s) => s.put(it));
  emit();
  await attempt(it.id);
  return { id: it.id, state: items.find((x) => x.id === it.id)?.state ?? "sent" };
}
export const retry = (id: string) => attempt(id);
export const discard = (id: string) => remove(id);
let flushing = false;
export async function retryAll() {
  if (flushing) return;
  flushing = true;
  try {
    for (const i of items.filter(
      (x) => x.state === "queued" || x.state === "failed",
    ))
      await attempt(i.id);
  } finally {
    flushing = false;
  }
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  void load().then(() => (navigator.onLine ? retryAll() : undefined));
  const on = () => void retryAll();
  window.addEventListener("online", on);
  return () => {
    listeners.delete(fn);
    window.removeEventListener("online", on);
  };
}
const EMPTY: OutboxItem[] = [];
/** Live outbox items (optionally for one case). */
export function useOutbox(ref?: string) {
  const all = useSyncExternalStore(
    subscribe,
    () => items,
    () => EMPTY,
  );
  return ref ? all.filter((i) => i.ref === ref) : all;
}
export const pendingCount = (xs: OutboxItem[]) =>
  xs.filter((i) => i.state !== "sent").length;
